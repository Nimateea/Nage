-- ── Remaining migration for Project Nage ─────────────────────────────────────
-- Paste this into Supabase SQL Editor and click Run

-- ── 1. Project documents ─────────────────────────────────────────────────────
create table if not exists public.project_documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  document    jsonb not null default '{"version":1,"nodes":[],"camera":{"x":0,"y":0,"zoom":1}}'::jsonb,
  version     integer not null default 1,
  updated_at  timestamptz default now() not null,
  constraint document_size check (octet_length(document::text) < 5242880) -- 5 MB
);

alter table public.project_documents enable row level security;

drop policy if exists "project_documents: owner all" on public.project_documents;
create policy "project_documents: owner all"
  on public.project_documents
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create unique index if not exists project_documents_project_id_idx on public.project_documents (project_id);

-- ── 2. AI generation logs ────────────────────────────────────────────────────
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

drop policy if exists "ai_generation_logs: owner read" on public.ai_generation_logs;
create policy "ai_generation_logs: owner read"
  on public.ai_generation_logs
  for select using (user_id = auth.uid());

create index if not exists ai_generation_logs_user_id_idx on public.ai_generation_logs (user_id, created_at desc);

-- ── 3. updated_at triggers ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_project_documents_updated_at on public.project_documents;
create trigger set_project_documents_updated_at
  before update on public.project_documents
  for each row execute function public.set_updated_at();

-- ── 4. Storage buckets & policies ────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  false,
  8388608, -- 8 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "project-assets: owner select" on storage.objects;
create policy "project-assets: owner select"
  on storage.objects for select
  using (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "project-assets: owner insert" on storage.objects;
create policy "project-assets: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "project-assets: owner delete" on storage.objects;
create policy "project-assets: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'project-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exports',
  'exports',
  false,
  52428800, -- 50 MB
  array['image/png', 'image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists "exports: owner select" on storage.objects;
create policy "exports: owner select"
  on storage.objects for select
  using (
    bucket_id = 'exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "exports: owner insert" on storage.objects;
create policy "exports: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "exports: owner delete" on storage.objects;
create policy "exports: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 5. Rate limit counters & functions ────────────────────────────────────────
create table if not exists public.rate_limit_counters (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  action       text not null, -- 'ai_generate' | 'save' | 'upload'
  window_type  text not null, -- 'burst' | 'hourly' | 'daily'
  count        integer not null default 0,
  reset_at     timestamptz not null,
  primary key (user_id, action, window_type)
);

alter table public.rate_limit_counters enable row level security;

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
