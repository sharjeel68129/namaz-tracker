-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again.

-- One row per user, created by the one-time starting-Qaza step after first login.
-- `start_day` is the first day that is tracked; `start_qaza` is {fajr, zuhr, asr, maghrib, isha}.
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  start_day date not null,
  start_qaza jsonb not null,
  -- For the 6PM reminder email: the user's time zone (e.g. "Asia/Karachi"), whether they
  -- want reminders, and the last local day one was sent so nobody gets two in a day.
  timezone text not null default 'UTC',
  reminders boolean not null default true,
  last_reminded date,
  created_at timestamptz not null default now()
);

-- One row per prayer per day once it is logged. `auto` marks a prayer that was counted as
-- missed because its 48 hours ran out. Undo is a delete.
create table if not exists public.prayer_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  prayer text not null check (prayer in ('fajr', 'zuhr', 'asr', 'maghrib', 'isha')),
  status text not null check (status in ('prayed', 'missed')),
  auto boolean not null default false,
  logged_at timestamptz not null default now(),
  primary key (user_id, day, prayer)
);

create table if not exists public.qaza_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  prayer text not null check (prayer in ('fajr', 'zuhr', 'asr', 'maghrib', 'isha')),
  date_prayed date not null,
  count integer not null check (count > 0),
  created_at timestamptz not null default now()
);
create index if not exists qaza_logs_user on public.qaza_logs (user_id);

-- Row level security keeps users apart: the browser talks to the database directly with the
-- public key, and these policies only ever let a signed-in user touch their own rows.
alter table public.profiles enable row level security;
alter table public.prayer_logs enable row level security;
alter table public.qaza_logs enable row level security;

-- Let signed-in users reach the tables through the Data API at all (the policies below then
-- narrow that to their own rows). Stated here so it works even if the project does not
-- expose new tables automatically. service_role is what the reminder function runs as.
grant select, insert, update, delete on public.profiles, public.prayer_logs, public.qaza_logs
  to authenticated, service_role;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own prayer logs" on public.prayer_logs;
create policy "own prayer logs" on public.prayer_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own qaza logs" on public.qaza_logs;
create policy "own qaza logs" on public.qaza_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Lets a signed-in user delete their own account from the settings page without the app
-- ever holding the service_role key. The tables above cascade.
create or replace function public.delete_own_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
