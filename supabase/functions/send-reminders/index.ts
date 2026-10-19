// 6PM reminder email. A scheduled job (supabase/reminders.sql) calls this every 15 minutes;
// each run emails the users for whom it is currently 6PM-something in their own time zone and
// who still have prayers from yesterday not logged. Those prayers count as missed at 12AM.
//
// Secrets (supabase secrets set ...): BREVO_API_KEY, REMINDER_FROM (the sender address verified
// in Brevo), SITE_URL, REMINDER_SECRET.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const PRAYERS = [
  ["fajr", "Fajr"],
  ["zuhr", "Zuhr"],
  ["asr", "Asr"],
  ["maghrib", "Maghrib"],
  ["isha", "Isha"],
];
const REMINDER_HOUR = 18;

/** The date ("YYYY-MM-DD") and hour (0-23) right now in a time zone; null if the zone is not valid. */
function localNow(timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((part) => part.type === type)!.value;
    return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
  } catch {
    return null;
  }
}

function dayBefore(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

async function sendEmail(to: string, unlogged: string[], siteUrl: string) {
  const count = unlogged.length === 1 ? "1 prayer" : `${unlogged.length} prayers`;
  const text = [
    `You still have ${count} from yesterday to log: ${unlogged.join(", ")}.`,
    "",
    "Anything not logged by 12AM tonight is counted as missed and added to your Qaza.",
    "",
    `Log them now: ${siteUrl}/app`,
    "",
    "To stop these emails, turn off the reminder in Settings.",
  ].join("\n");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": Deno.env.get("BREVO_API_KEY")!, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "Namaz Tracker", email: Deno.env.get("REMINDER_FROM") },
      to: [{ email: to }],
      subject: `Namaz Tracker: ${count} from yesterday still to log`,
      textContent: text,
    }),
  });
  if (!response.ok) throw new Error(`Brevo answered ${response.status}: ${await response.text()}`);
}

Deno.serve(async (request) => {
  // Only the scheduled job knows this secret, so nobody else can trigger a round of emails.
  const secret = Deno.env.get("REMINDER_SECRET");
  if (!secret || request.headers.get("x-reminder-secret") !== secret) {
    return new Response("Not allowed", { status: 401 });
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const siteUrl = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
  const { data: profiles, error } = await db
    .from("profiles")
    .select("user_id, start_day, timezone, last_reminded")
    .eq("reminders", true);
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;
  let failed = 0;
  for (const profile of profiles) {
    const local = localNow(profile.timezone);
    if (!local || local.hour !== REMINDER_HOUR || profile.last_reminded === local.day) continue;
    const yesterday = dayBefore(local.day);
    if (yesterday < profile.start_day) continue;

    try {
      const { data: logs, error: logsError } = await db
        .from("prayer_logs")
        .select("prayer")
        .eq("user_id", profile.user_id)
        .eq("day", yesterday);
      if (logsError) throw new Error(logsError.message);
      const logged = new Set(logs.map((log) => log.prayer));
      const unlogged = PRAYERS.filter(([id]) => !logged.has(id)).map(([, name]) => name);

      if (unlogged.length) {
        const { data: found, error: userError } = await db.auth.admin.getUserById(profile.user_id);
        if (userError || !found.user?.email) throw new Error(userError?.message || "no email on the account");
        await sendEmail(found.user.email, unlogged, siteUrl);
        sent += 1;
      }
      // Marked even when nothing was owed, so this user is not checked again today.
      await db.from("profiles").update({ last_reminded: local.day }).eq("user_id", profile.user_id);
    } catch (problem) {
      failed += 1;
      console.error(`Reminder for ${profile.user_id} failed: ${(problem as Error).message}`);
    }
  }

  return Response.json({ sent, failed });
});
