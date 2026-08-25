// A small local (per-browser) index of schedules this device has created or
// opened, so the top page can list them without exposing every family's
// schedule to everyone. Purely a local cache for display — the real data
// always lives in Supabase, keyed by the schedule's id.

const KEY = "ganbari-schedule:known-schedules";

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {}
}

export function getKnownSchedules() {
  return readAll();
}

export function upsertKnownSchedule(entry) {
  if (!entry || !entry.id) return;
  const list = readAll();
  const idx = list.findIndex((x) => x.id === entry.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...entry, updatedAt: Date.now() };
  else list.push({ ...entry, updatedAt: Date.now() });
  writeAll(list);
}
