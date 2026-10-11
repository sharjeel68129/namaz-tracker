-- Schedules the 6PM reminder email. Run once in the SQL Editor AFTER deploying the
-- send-reminders function (see README), with the two placeholders below replaced:
--   YOUR-PROJECT-REF   the project ref from your Supabase URL
--   YOUR-REMINDER-SECRET   the same value you gave `supabase secrets set REMINDER_SECRET=...`
-- Safe to run again: scheduling under the same name replaces the old job.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Every 15 minutes, so half-hour and 45-minute time zones are also reminded at their 6PM.
-- The function itself only emails people for whom it is 6PM, once per day.
select cron.schedule(
  'namaz-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('x-reminder-secret', 'YOUR-REMINDER-SECRET')
  );
  $$
);
