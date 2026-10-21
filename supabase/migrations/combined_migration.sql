-- Migration 0001: Core schema
-- Run: supabase db push

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Profiles ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "profiles: owner read/update"
  on public.profiles
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-create profile on new user sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Projects ──────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  name          text not null default 'Untitled',
  thumbnail_url text,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

alter table public.projects enable row level security;

create policy "projects: owner all"
  on public.projects
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index on public.projects (owner_id, updated_at desc);

-- ── Project documents ─────────────────────────────────────────────────────────
create table if not exists public.project_documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  document    jsonb not null default '{"version":1,"nodes":[],"camera":{"x":0,"y":0,"zoom":1}}'::jsonb,
  version     integer not null default 1,
  updated_at  timestamptz default now() not null,
  -- Soft size guard — enforce in application too
  constraint document_size check (octet_length(document::text) < 5242880) -- 5 MB
);

alter table public.project_documents enable row level security;

create policy "project_documents: owner all"
  on public.project_documents
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create unique index on public.project_documents (project_id);

-- ── AI generation logs ────────────────────────────────────────────────────────
create table if not exists public.ai_generation_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  prompt      text not null,
  result_urls text[],
  model       text not null default 'gemini-2.0-flash-preview-image-generation',
  status      text not null default 'pending'
    check (status in ('pending', 'done', 'error')),
  created_at  timestamptz default now() not null
);

alter table public.ai_generation_logs enable row level security;

create policy "ai_generation_logs: owner read"
  on public.ai_generation_logs
  for select using (user_id = auth.uid());
-- Insert/update only via service-role (route handler)

create index on public.ai_generation_logs (user_id, created_at desc);

-- ── updated_at trigger helper ─────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger set_project_documents_updated_at
  before update on public.project_documents
  for each row execute function public.set_updated_at();
-- Migration 0002: Storage buckets and policies

-- ── project-assets: uploaded + AI-generated images ───────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  false,                          -- private
  8388608,                        -- 8 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Allow authenticated users to manage their own folder: {user_id}/{project_id}/...
create policy "project-assets: owner select"
  on storage.objects for select
  using (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "project-assets: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "project-assets: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── exports: PNG / SVG exports ────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exports',
  'exports',
  false,
  52428800,                       -- 50 MB
  array['image/png', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "exports: owner select"
  on storage.objects for select
  using (
    bucket_id = 'exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "exports: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "exports: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
-- Migration 0003: Per-user rate limiting

-- ── rate_limit_counters ───────────────────────────────────────────────────────
create table if not exists public.rate_limit_counters (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  action       text not null, -- 'ai_generate' | 'save' | 'upload'
  window_type  text not null, -- 'burst' | 'hourly' | 'daily'
  count        integer not null default 0,
  reset_at     timestamptz not null,
  primary key (user_id, action, window_type)
);

-- Only service-role can touch this table (no RLS policy = deny all anon/user)
alter table public.rate_limit_counters enable row level security;

-- ── check_rate_limit function ─────────────────────────────────────────────────
create or replace function public.check_rate_limit(
  p_user_id     uuid,
  p_action      text,
  p_window_type text,
  p_limit       integer,
  p_duration    interval
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count   integer;
  v_reset   timestamptz;
begin
  select count, reset_at
    into v_count, v_reset
    from public.rate_limit_counters
   where user_id     = p_user_id
     and action      = p_action
     and window_type = p_window_type;

  if not found or now() >= v_reset then
    insert into public.rate_limit_counters (user_id, action, window_type, count, reset_at)
    values (p_user_id, p_action, p_window_type, 1, now() + p_duration)
    on conflict (user_id, action, window_type)
    do update set count = 1, reset_at = now() + p_duration;
    return true;
  end if;

  if v_count >= p_limit then
    return false;
  end if;

  update public.rate_limit_counters
     set count = count + 1
   where user_id     = p_user_id
     and action      = p_action
     and window_type = p_window_type;

  return true;
end;
$$;

-- ── get_rate_limit_remaining function ─────────────────────────────────────────
create or replace function public.get_rate_limit_remaining(
  p_user_id     uuid,
  p_action      text,
  p_window_type text,
  p_limit       integer
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count  integer;
  v_reset  timestamptz;
begin
  select count, reset_at
    into v_count, v_reset
    from public.rate_limit_counters
   where user_id     = p_user_id
     and action      = p_action
     and window_type = p_window_type;

  if not found or now() >= v_reset then
    return p_limit;
  end if;

  return greatest(p_limit - v_count, 0);
end;
$$;
