# Namaz Tracker

Log the five daily prayers as prayed or missed, keep a Qaza count for each, and see the last 30 days and past months as contribution charts.

## Run it

```
npm install
npm run dev
```

Then open http://localhost:3000. `npm run check` runs the date and statistics checks.

## Set up Supabase (accounts and data)

1. Create a free project at https://supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql`. Run it again after pulling changes to it; it is safe to repeat.
3. Project Settings -> API: create a file named `.env.local` in this folder with the project URL and the anon public key:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

4. Authentication -> URL Configuration: set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs.
5. Authentication -> Sign In / Providers -> Email: keep "Confirm email" switched on.

## Send email through Brevo

Supabase's built-in email sender only manages a few messages an hour, so sign-up and password emails go through a free [Brevo](https://www.brevo.com) account (300 emails a day) instead. Brevo also sends the 6PM reminder.

1. In Brevo, verify the address emails will come from (Senders, domains, IPs -> Senders).
2. Brevo SMTP & API -> SMTP: generate an SMTP key. In Supabase, Authentication -> Emails -> SMTP Settings: switch on custom SMTP with host `smtp-relay.brevo.com`, port `587`, your Brevo SMTP login as the username, the SMTP key as the password, and the verified address as the sender.
3. Supabase Authentication -> Rate Limits: raise the emails-per-hour limit (for example to 30).

## Set up the 6PM reminder email

At 6PM in each user's own time zone, anyone with prayers from yesterday still not logged gets one email. It runs inside Supabase, so it works whether or not the website is open. It needs a Brevo API key (Brevo SMTP & API -> API Keys) and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase secrets set BREVO_API_KEY=... REMINDER_FROM=your-verified-sender@example.com SITE_URL=https://your-site REMINDER_SECRET=a-long-random-string
npx supabase functions deploy send-reminders --no-verify-jwt
```

Then fill in the two placeholders in `supabase/reminders.sql` and run it in the SQL Editor. Users can switch the reminder off in Settings.

## Before going public

- `lib/site.js` holds the contact address and the name shown on the Privacy and Terms pages. Change them there.
- Page-view counts use Vercel Analytics: switch it on once in the Vercel project under Analytics. It collects nothing until then.
- `robots.txt`, `sitemap.xml` and the link-preview image are generated from the site's public address, which Vercel supplies.

## How the rules work

- A day runs 12AM to 12AM on your device. Each day's prayers can be logged for 48 hours from its 12AM, so today's and yesterday's are open.
- A prayer still not logged when its 48 hours end is counted as missed.
- Logged prayers show "Logged" until 12AM; one logged for yesterday disappears 30 minutes after logging. Undo works while it is still on screen.
- Qaza owed = starting balance + missed - Qaza logged. It is shown as a negative number and never goes above 0.
- The streak counts perfect days (all five prayed) in a row. Today and yesterday only break it once something in them is marked missed.
- The Hijri date is the Umm al-Qura date one day earlier, which has matched Hong Kong's moon-sighting dates (`lib/hijri.js`).
- Offline, changes are saved on the device and sent in order when the connection returns (`lib/offline.js`). The installed app's pages are kept by `public/sw.js`, which only runs in the built site, not `npm run dev`.
- Reset and account deletion need the password, which the database checks (`supabase/schema.sql`). Logs cannot be edited, and a prayer can only be deleted (Undo) within 3 days.
