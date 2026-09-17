-- =============================================================
-- LFT Gym Tracker — Supabase Schema
-- Run this entire script in: Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. PROFILES TABLE
-- Stores extra per-user settings synced to the cloud.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lbs')),
  weekly_goal integer not null default 4,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. SESSIONS TABLE
-- Stores completed (and optionally in-progress) workout sessions.
create table if not exists public.sessions (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  started_at    bigint not null,
  ended_at      bigint,
  exercises     jsonb not null default '[]',
  template_id   text,
  template_name text,
  updated_at    timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Users can view their own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);

create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_started_at_idx on public.sessions(user_id, started_at desc);


-- 3. TEMPLATES TABLE
-- Stores saved workout routines/templates.
create table if not exists public.templates (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  exercises  jsonb not null default '[]',
  created_at bigint not null,
  updated_at timestamptz not null default now()
);

alter table public.templates enable row level security;

create policy "Users can view their own templates"
  on public.templates for select
  using (auth.uid() = user_id);

create policy "Users can insert their own templates"
  on public.templates for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own templates"
  on public.templates for update
  using (auth.uid() = user_id);

create policy "Users can delete their own templates"
  on public.templates for delete
  using (auth.uid() = user_id);

create index if not exists templates_user_id_idx on public.templates(user_id);
