import "./storageShim.js";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ShareBar from "./ShareBar.jsx";

function Root() {
  // Re-mounting <App> re-runs its initial load, which pulls the latest data
  // from Supabase. This keeps two devices reasonably in sync without needing
  // a full realtime setup: whenever this tab becomes active again, or every
  // 30 seconds, we refresh.
  const [syncKey, setSyncKey] = useState(0);

  useEffect(() => {
    const refresh = () => setSyncKey((k) => k + 1);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    const interval = setInterval(refresh, 30000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <ShareBar />
      <App key={syncKey} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
