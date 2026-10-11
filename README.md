# Namaz Tracker

Log the five daily prayers as prayed or missed, keep a Qaza count for each, and see the last 30 days and past months as contribution charts.

## Run it

```
npm install
copy .env.example .env.local
npm run dev
```

Then open http://localhost:3000. `npm run check` runs the date and statistics checks.

## Set up Supabase (accounts and data)

1. Create a free project at https://supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql`.
3. Project Settings -> API: copy the project URL and the anon public key into `.env.local`.
4. Authentication -> URL Configuration: set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs.
5. Authentication -> Sign In / Providers -> Email: keep "Confirm email" switched on.

Supabase's built-in email sender is limited to a few messages an hour, which is fine for trying it out.

## Set up the 6PM reminder email (optional)

At 6PM in each user's own time zone, anyone with prayers from yesterday still not logged gets one email. It runs inside Supabase, so it works whether or not the website is open. It needs a free [Resend](https://resend.com) account to send the mail, and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set RESEND_API_KEY=... REMINDER_FROM="Namaz Tracker <reminders@your-domain>" SITE_URL=http://localhost:3000 REMINDER_SECRET=a-long-random-string
supabase functions deploy send-reminders --no-verify-jwt
```

Then fill in the two placeholders in `supabase/reminders.sql` and run it in the SQL Editor. Users can switch the reminder off in Settings.

Until you verify a domain in Resend, it only delivers to your own Resend account email, with `REMINDER_FROM` set to `onboarding@resend.dev`.

## How the rules work

- A day runs 12AM to 12AM on your device. Each day's prayers can be logged for 48 hours from its 12AM, so today's and yesterday's are open.
- A prayer still not logged when its 48 hours end is counted as missed.
- Logged prayers show "Logged" until 12AM; one logged for yesterday disappears 30 minutes after logging. Undo works while it is still on screen.
- Qaza owed = starting balance + missed - Qaza logged. It is shown as a negative number and never goes above 0.
