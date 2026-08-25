// Claude Artifacts provide a built-in `window.storage` API. That doesn't exist
// once the app is deployed on its own, so this shim re-implements the same
// get/set/delete/list contract using a Supabase table, scoped to the current
// schedule's id (from the URL). The app code itself (App.jsx) needs no changes.
//
// As a side effect, every successful read/write also updates a small local
// registry (see registry.js) of "schedules this device knows about", which
// powers the top page's "見る" / "完了" lists.

import { supabase } from "./db.js";
import { getScheduleIdFromUrl } from "./scheduleId.js";
import { upsertKnownSchedule } from "./registry.js";
import { computeOverallStats } from "./progress.js";

export const scheduleId = getScheduleIdFromUrl();

function registerFromBlob(blob) {
  const cfg = blob && blob.config;
  if (!cfg || !cfg.title) return;
  const stats = computeOverallStats(cfg, blob.completions);
  upsertKnownSchedule({
    id: scheduleId,
    title: cfg.title,
    startDate: cfg.startDate,
    endDate: cfg.endDate,
    pct: stats.pct,
  });
}

window.storage = {
  async get(key, shared = false) {
    if (!scheduleId) return null;
    const { data, error } = await supabase
      .from("schedules")
      .select("blob")
      .eq("id", scheduleId)
      .maybeSingle();
    if (error || !data) return null;
    registerFromBlob(data.blob);
    return { key, value: JSON.stringify(data.blob), shared };
  },

  async set(key, value, shared = false) {
    if (!scheduleId) return null;
    const blob = JSON.parse(value);
    const { error } = await supabase.from("schedules").upsert({
      id: scheduleId,
      blob,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    registerFromBlob(blob);
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    if (!scheduleId) return null;
    await supabase.from("schedules").delete().eq("id", scheduleId);
    return { key, deleted: true, shared };
  },

  async list(prefix = "", shared = false) {
    return { keys: scheduleId ? [scheduleId] : [], prefix, shared };
  },
};
