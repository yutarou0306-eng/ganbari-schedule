import "./storageShim.js";
import React, { useEffect, useState } from "react";
import App from "./App.jsx";
import ShareBar from "./ShareBar.jsx";

export default function ScheduleRoot() {
  // Re-mounting <App> re-runs its initial load, which pulls the latest data
  // from Supabase. We only do this when the tab becomes visible/focused
  // again (e.g. switching back from another app) rather than on a timer,
  // to avoid the flicker/interrupted-connection issue from constant polling.
  const [syncKey, setSyncKey] = useState(0);

  useEffect(() => {
    const refresh = () => setSyncKey((k) => k + 1);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <>
      <ShareBar />
      <App key={syncKey} />
    </>
  );
}
