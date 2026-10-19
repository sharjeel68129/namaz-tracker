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

-- Logs can be read and added, but not changed. A prayer can only be deleted (Undo) while its
-- rectangle can still be on screen; 3 days covers every time zone. Wiping everything goes
-- through reset_own_data below, which asks for the password.
drop policy if exists "own prayer logs" on public.prayer_logs;
drop policy if exists "own prayer logs read" on public.prayer_logs;
drop policy if exists "own prayer logs add" on public.prayer_logs;
drop policy if exists "own prayer logs undo" on public.prayer_logs;
create policy "own prayer logs read" on public.prayer_logs
  for select to authenticated using (user_id = auth.uid());
create policy "own prayer logs add" on public.prayer_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy "own prayer logs undo" on public.prayer_logs
  for delete to authenticated using (user_id = auth.uid() and day >= current_date - 3);

drop policy if exists "own qaza logs" on public.qaza_logs;
drop policy if exists "own qaza logs read" on public.qaza_logs;
drop policy if exists "own qaza logs add" on public.qaza_logs;
create policy "own qaza logs read" on public.qaza_logs
  for select to authenticated using (user_id = auth.uid());
create policy "own qaza logs add" on public.qaza_logs
  for insert to authenticated with check (user_id = auth.uid());

-- The browser may change only these profile fields; the first tracked day is moved only by
-- reset_own_data, and last_reminded only by the reminder function.
revoke update on public.profiles from authenticated;
grant update (timezone, reminders, start_qaza) on public.profiles to authenticated;

-- Reset and account deletion both need the account password, checked here in the database,
-- so a logged-in session on its own (an unlocked phone, a copied token) cannot do either.
create extension if not exists pgcrypto with schema extensions;

-- Not callable from the browser, so it cannot be used to guess passwords on its own.
create or replace function public.password_ok(password text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and encrypted_password = extensions.crypt(password, encrypted_password)
  );
$$;
revoke all on function public.password_ok(text) from public, anon, authenticated;

-- The old version without a password.
drop function if exists public.delete_own_account();

-- Deletes the signed-in user's account; the tables above cascade.
create or replace function public.delete_own_account(password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.password_ok(password) then
    perform pg_sleep(1); -- slows down guessing
    raise exception 'wrong password';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;

-- Wipes every log and sets every counter to 0; tracking restarts from `today`.
create or replace function public.reset_own_data(password text, today date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.password_ok(password) then
    perform pg_sleep(1);
    raise exception 'wrong password';
  end if;
  delete from public.prayer_logs where user_id = auth.uid();
  delete from public.qaza_logs where user_id = auth.uid();
  update public.profiles
  set start_day = today,
      start_qaza = '{"fajr": 0, "zuhr": 0, "asr": 0, "maghrib": 0, "isha": 0}'
  where user_id = auth.uid();
end;
$$;
revoke all on function public.reset_own_data(text, date) from public, anon;
grant execute on function public.reset_own_data(text, date) to authenticated;
