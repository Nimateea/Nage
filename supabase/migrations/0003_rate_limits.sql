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
