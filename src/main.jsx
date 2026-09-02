import React from "react";
import ReactDOM from "react-dom/client";
import { getScheduleIdFromUrl } from "./scheduleId.js";
import { getProfileIdFromUrl } from "./profileId.js";

const root = ReactDOM.createRoot(document.getElementById("root"));
const id = getScheduleIdFromUrl();
const profileId = getProfileIdFromUrl();
const isGuide = new URLSearchParams(window.location.search).get("guide") === "1";

if (isGuide) {
  import("./GuidePage.jsx").then(({ default: GuidePage }) => {
    root.render(
      <React.StrictMode>
        <GuidePage />
      </React.StrictMode>
    );
  });
} else if (id) {
  import("./ScheduleRoot.jsx").then(({ default: ScheduleRoot }) => {
    root.render(
      <React.StrictMode>
        <ScheduleRoot />
      </React.StrictMode>
    );
  });
} else if (profileId) {
  import("./ProfileRoot.jsx").then(({ default: ProfileRoot }) => {
    root.render(
      <React.StrictMode>
        <ProfileRoot />
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
