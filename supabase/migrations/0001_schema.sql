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
