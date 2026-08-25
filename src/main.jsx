import React from "react";
import ReactDOM from "react-dom/client";
import { getScheduleIdFromUrl } from "./scheduleId.js";

const root = ReactDOM.createRoot(document.getElementById("root"));
const id = getScheduleIdFromUrl();

if (id) {
  import("./ScheduleRoot.jsx").then(({ default: ScheduleRoot }) => {
    root.render(
      <React.StrictMode>
        <ScheduleRoot />
      </React.StrictMode>
    );
  });
} else {
  import("./TopPage.jsx").then(({ default: TopPage }) => {
    root.render(
      <React.StrictMode>
        <TopPage />
      </React.StrictMode>
    );
  });
}
