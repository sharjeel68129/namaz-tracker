// Accounts and saved data (browser side). Supabase handles login; rows live in the tables
// from supabase/schema.sql, and its row level security means every query only sees the
// signed-in user's own rows.
import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False until the Supabase values are in .env.local; until then only the landing page works. */
export const configured = Boolean(url && key);

let client;
export function supabase() {
  return (client ||= createBrowserClient(url, key));
}

const PAGE = 1000; // Supabase returns at most 1000 rows per request.

async function fetchAll(table, orderBy) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase().from(table).select("*").order(orderBy).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

/** Everything the tracker needs. `profile` is null until the starting-Qaza step is done. */
export async function loadAccountData() {
  const { data: profile, error } = await supabase().from("profiles").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) return { profile: null, logs: [], qaza: [] };
  const [logs, qaza] = await Promise.all([fetchAll("prayer_logs", "day"), fetchAll("qaza_logs", "id")]);
  return { profile, logs, qaza };
}

/** The device's time zone, e.g. "Asia/Karachi"; the 6PM reminder email is timed by it. */
export const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export async function createProfile(startDay, startQaza) {
  const { error } = await supabase()
    .from("profiles")
    .insert({ start_day: startDay, start_qaza: startQaza, timezone: deviceTimezone() });
  if (error) throw new Error(error.message);
}

/** Change profile fields such as `timezone` or `reminders`. */
export async function updateProfile(userId, changes) {
  const { error } = await supabase().from("profiles").update(changes).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Save one prayer as "prayed" or "missed". `loggedAt` is when it was tapped, which may be
 * earlier than now when it was saved offline and is only being sent now.
 */
export async function logPrayer(day, prayer, status, loggedAt) {
  const { error } = await supabase().from("prayer_logs").insert({ day, prayer, status, logged_at: loggedAt });
  // Already saved (the same tap sent twice after a dropped connection) counts as done.
  if (error && error.code !== "23505") throw new Error(error.message);
}

export async function undoPrayer(day, prayer) {
  const { error } = await supabase().from("prayer_logs").delete().eq("day", day).eq("prayer", prayer);
  if (error) throw new Error(error.message);
}

/** Save expired prayers as missed. Rows that already exist are left alone, so repeating is safe. */
export async function addAutoMissed(rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase()
      .from("prayer_logs")
      .upsert(rows.slice(i, i + 500), { onConflict: "user_id,day,prayer", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
}

export async function logQaza(prayer, datePrayed, count) {
  const { error } = await supabase().from("qaza_logs").insert({ prayer, date_prayed: datePrayed, count });
  if (error) throw new Error(error.message);
}

/** The database checks the password itself; a wrong one comes back as "wrong password". */
function passwordError(error) {
  return new Error(/wrong password/i.test(error.message) ? "That password is not correct." : error.message);
}

/** Wipe every log and set all counters to zero; tracking restarts from `today`. */
export async function resetData(password, today) {
  const { error } = await supabase().rpc("reset_own_data", { password, today });
  if (error) throw passwordError(error);
}

export async function deleteAccount(password) {
  const { error } = await supabase().rpc("delete_own_account", { password });
  if (error) throw passwordError(error);
  // The account is gone, so only this browser's copy of the session needs clearing.
  await supabase().auth.signOut({ scope: "local" });
}
