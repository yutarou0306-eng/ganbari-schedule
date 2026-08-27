import "./storageShim.js";
import React from "react";
import App from "./App.jsx";
import ShareBar from "./ShareBar.jsx";

// Note: this used to remount <App> whenever the tab regained focus/visibility,
// to pull fresh data after another device made changes. That turned out to
// fire too eagerly on some devices (e.g. when the on-screen keyboard shows or
// hides), which reset the whole app back to its last-saved state and wiped
// out whatever the person was in the middle of typing on the setup screen.
// Removed for reliability — reopening the schedule (e.g. from the top page,
// or by revisiting the link) is still enough to pick up the latest data.
export default function ScheduleRoot() {
  return (
    <>
      <ShareBar />
      <App />
    </>
  );
}
