// Offline support. Every change is saved on this device first (a queue in localStorage) and
// shown straight away, then sent to Supabase in order; with no signal the queue waits and is
// sent when the connection returns. The last loaded data is kept too, so pages open offline.
import { loadAccountData, logPrayer, logQaza, undoPrayer } from "./supabase.js";

const cacheKey = (userId) => `namaz-data:${userId}`;
const queueKey = (userId) => `namaz-queue:${userId}`;

function read(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the change still goes out while online, it just is not kept.
  }
}

export const writeCache = (userId, data) => write(cacheKey(userId), data);
export const pendingChanges = (userId) => read(queueKey(userId), []);

/** Removes this device's copy of the account's data, on log out, reset and account deletion. */
export function forgetDevice(userId) {
  try {
    localStorage.removeItem(cacheKey(userId));
    localStorage.removeItem(queueKey(userId));
  } catch {
    // Nothing stored.
  }
}

/** True when a request failed because there was no connection, rather than being refused. */
export function isNetworkError(problem) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return /fetch|network|load failed/i.test(problem?.message || "");
}

/**
 * A change as the pages pass it in: { type: "log", day, prayer, status }, { type: "undo",
 * day, prayer } or { type: "qaza", prayer, date, count }. This adds an id and the time.
 */
export const stamp = (change) => ({
  ...change,
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  at: new Date().toISOString(),
});

/** The data with one change applied: what the page shows before the change is sent. */
export function applyChange(data, change) {
  const other = (log) => !(log.day === change.day && log.prayer === change.prayer);
  if (change.type === "log") {
    const row = { day: change.day, prayer: change.prayer, status: change.status, auto: false, logged_at: change.at };
    return { ...data, logs: [...data.logs.filter(other), row] };
  }
  if (change.type === "undo") return { ...data, logs: data.logs.filter(other) };
  const entry = { id: change.id, prayer: change.prayer, date_prayed: change.date, count: change.count, created_at: change.at };
  return { ...data, qaza: [...data.qaza, entry] };
}

let sending = null; // id of the change on its way to Supabase right now
let running = null; // the send in progress, shared by everyone who asks for one

/** Adds a change to the queue. Undoing a prayer whose log has not been sent yet just drops that log. */
export function queueChange(userId, change) {
  const queue = pendingChanges(userId);
  if (change.type === "undo") {
    const waiting = queue.findIndex(
      (c) => c.type === "log" && c.day === change.day && c.prayer === change.prayer && c.id !== sending,
    );
    if (waiting >= 0) {
      queue.splice(waiting, 1);
      return write(queueKey(userId), queue);
    }
  }
  write(queueKey(userId), [...queue, change]);
}

function send(change) {
  if (change.type === "log") return logPrayer(change.day, change.prayer, change.status, change.at);
  if (change.type === "undo") return undoPrayer(change.day, change.prayer);
  return logQaza(change.prayer, change.date, change.count);
}

/**
 * Sends the queue, oldest first. Stops at the first connection failure and keeps the rest for
 * later; a change Supabase refuses is dropped and its reason returned in `failed`.
 */
export function sendPending(userId) {
  running ||= sendAll(userId).finally(() => {
    running = null;
  });
  return running;
}

async function sendAll(userId) {
  const result = { sent: 0, failed: [], offline: false };
  for (let change; (change = pendingChanges(userId)[0]); ) {
    sending = change.id;
    try {
      await send(change);
      result.sent += 1;
    } catch (problem) {
      if (isNetworkError(problem)) {
        result.offline = true;
        break;
      }
      result.failed.push(problem.message);
    } finally {
      sending = null;
    }
    write(queueKey(userId), pendingChanges(userId).filter((c) => c.id !== change.id));
  }
  return result;
}

/**
 * The account's data for this device: fresh from Supabase with any unsent changes on top,
 * or, with no connection, the copy saved on the last visit. `offline` says which.
 */
export async function loadForDevice(userId) {
  try {
    const loaded = await loadAccountData();
    const data = loaded.profile ? pendingChanges(userId).reduce(applyChange, loaded) : loaded;
    if (data.profile) writeCache(userId, data);
    return { data, offline: false };
  } catch (problem) {
    const saved = read(cacheKey(userId), null);
    if (saved && isNetworkError(problem)) return { data: saved, offline: true };
    throw problem;
  }
}
