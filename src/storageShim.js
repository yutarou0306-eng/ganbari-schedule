// Claude Artifacts provide a built-in `window.storage` API. That doesn't exist
// once the app is deployed on its own, so this shim re-implements the same
// get/set/delete/list contract using a Supabase table, scoped to the current
// schedule's id (from the URL). The app code itself (App.jsx) needs no changes.

import { supabase } from "./db.js";
import { resolveScheduleId } from "./scheduleId.js";

export const scheduleId = resolveScheduleId();

window.storage = {
  async get(key, shared = false) {
    const { data, error } = await supabase
      .from("schedules")
      .select("blob")
      .eq("id", scheduleId)
      .maybeSingle();
    if (error || !data) return null;
    return { key, value: JSON.stringify(data.blob), shared };
  },

  async set(key, value, shared = false) {
    const blob = JSON.parse(value);
    const { error } = await supabase.from("schedules").upsert({
      id: scheduleId,
      blob,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    await supabase.from("schedules").delete().eq("id", scheduleId);
    return { key, deleted: true, shared };
  },

  async list(prefix = "", shared = false) {
    return { keys: [scheduleId], prefix, shared };
  },
};
