import React, { useState, useEffect, useRef, useCallback } from "react";
import { pickRandomVariant, getVariant, finalFormImage, stageImage } from "./mascots.js";
import { computeOverallStats } from "./progress.js";
import { Lock, Unlock, Settings, Plus, X, ArrowLeft } from "lucide-react";
import { supabase } from "./db.js";

const STORAGE_KEY = "pearl-sea-schedule-v2";
// Backup PIN — always accepted alongside whatever PIN the parent set, in case
// they forget their own. Intentionally not a secret kept from the parent.
const MASTER_PIN = "5963";
const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"]; // index 0=Mon ... 6=Sun

const PASTELS = [
  { name: "さくら", hex: "#FFD6E0" },
  { name: "もも", hex: "#FFC9DE" },
  { name: "ぴーち", hex: "#FFE3C2" },
  { name: "れもん", hex: "#FFF3B0" },
  { name: "みんと", hex: "#CFF3DE" },
  { name: "そら", hex: "#C6E9F9" },
  { name: "らべんだー", hex: "#DCCBF7" },
  { name: "らいらっく", hex: "#F3C9EA" },
];

const BOY_PALETTE = [
  { name: "ソード", hex: "#4B7A3C" },
  { name: "フレイム", hex: "#B4432F" },
  { name: "ジェム", hex: "#2E7D8C" },
  { name: "リーフ", hex: "#6B4C93" },
  { name: "ゴールド", hex: "#C89B3C" },
  { name: "スター", hex: "#3A6EA5" },
  { name: "フェザー", hex: "#8B2E2E" },
  { name: "アース", hex: "#6B4226" },
];

const SHAPES = [
  // seal
  (c) => (
    <>
      <circle cx="7.2" cy="6.2" r="2.1" fill={c} />
      <circle cx="16.8" cy="6.2" r="2.1" fill={c} />
      <circle cx="12" cy="13.3" r="9" fill={c} />
    </>
  ),
  // star
  (c) => <path d="M12 2.5l2.6 6.2 6.7.5-5.1 4.4 1.6 6.6L12 16.8 6.2 20.2l1.6-6.6-5.1-4.4 6.7-.5L12 2.5z" fill={c} />,
  // ghost / pearl
  (c) => (
    <path
      d="M12 3c5 0 8 3.7 8 8.6v8.4l-2.1-1.8-2 1.8-1.9-1.8-2 1.8-2-1.8-2 1.8V11.6C4 6.7 7 3 12 3z"
      fill={c}
    />
  ),
  // heart
  (c) => (
    <path
      d="M12 20.5S3 14.8 3 8.9C3 5.9 5.3 3.7 8 3.7c1.7 0 3.2.9 4 2.3.8-1.4 2.3-2.3 4-2.3 2.7 0 5 2.2 5 5.2 0 5.9-9 11.6-9 11.6z"
      fill={c}
    />
  ),
  // cloud
  (c) => (
    <path
      d="M6.5 17a3.8 3.8 0 01-.4-7.6A4.6 4.6 0 0114.6 8a4 4 0 015.4 3.8 3.6 3.6 0 01-.6 7.2H7c-.2 0-.3 0-.5 0z"
      fill={c}
    />
  ),
  // flower
  (c) => (
    <>
      <circle cx="12" cy="6.6" r="3.1" fill={c} />
      <circle cx="17.4" cy="12" r="3.1" fill={c} />
      <circle cx="12" cy="17.4" r="3.1" fill={c} />
      <circle cx="6.6" cy="12" r="3.1" fill={c} />
      <circle cx="12" cy="12" r="3.3" fill={c} />
    </>
  ),
];

const HUNTER_SHAPES = [
  // baby dragon (used as the mascot / signature icon) — friendly, not fierce
  (c) => (
    <>
      <path d="M8.3 4l-1.6-3.4 3.2 1.6zM15.7 4l1.6-3.4-3.2 1.6z" fill={c} />
      <path d="M9.6 2.3l-.8-1.8 1.6.7zM12 1.8V0l1.1 1.4zM14.4 2.3l.8-1.8-1.6.7z" fill={c} />
      <path d="M4 9l-2.4-1 2 2.1zM20 9l2.4-1-2 2.1z" fill={c} />
      <path
        d="M12 4.2c3.9 0 7 3 7 7 0 2-.7 3.7-2 5 .3.3.5.8.5 1.3 0 1-.8 1.8-1.8 1.8-.5 0-1-.2-1.3-.6-.6.8-1.5 1.3-2.4 1.3s-1.8-.5-2.4-1.3c-.3.4-.8.6-1.3.6-1 0-1.8-.8-1.8-1.8 0-.5.2-1 .5-1.3-1.3-1.3-2-3-2-5 0-4 3.1-7 7-7z"
        fill={c}
      />
      <circle cx="9" cy="10.5" r="1.2" fill="#1c1c1c" />
      <circle cx="15" cy="10.5" r="1.2" fill="#1c1c1c" />
      <circle cx="9.4" cy="10.1" r="0.38" fill="#fff" />
      <circle cx="15.4" cy="10.1" r="0.38" fill="#fff" />
      <path d="M10.3 15.6l.6-1 .6 1zM12.5 15.6l.6-1 .6 1z" fill="#1c1c1c" opacity="0.75" />
      <path d="M10 17.3c1 .8 3 .8 4 0" stroke="#1c1c1c" strokeWidth="1" fill="none" strokeLinecap="round" />
    </>
  ),
  // sword — sharp diagonal blade + crossguard + grip + pommel, angled the
  // same way as the other diagonal icons (hammer, feather) in this set
  (c) => (
    <>
      <path d="M17.3 1.8 L9.35 11.29 L7.55 9.42 Z" fill={c} />
      <rect x="5.15" y="9.55" width="6.6" height="1.6" rx="0.7" transform="rotate(46.1 8.45 10.35)" fill={c} />
      <rect x="3.87" y="10.21" width="1.9" height="4.6" rx="0.95" transform="rotate(136.1 6.22 12.51)" fill={c} />
      <circle cx="3.41" cy="15.22" r="1.4" fill={c} />
    </>
  ),
  // flame
  (c) => (
    <path
      d="M12 2c1 3-2.5 4-2.5 7.2A2.5 2.5 0 0012 11.7 2.5 2.5 0 0014.5 9.2c0-.9-.4-1.5-.9-2.1 2 1.2 4 3.7 4 7A5.6 5.6 0 0112 19.7 5.6 5.6 0 016.4 14.1c0-4.4 3.6-6.6 3.6-9.4 0-1 .6-2 2-2.7z"
      fill={c}
    />
  ),
  // gem
  (c) => <path d="M12 2l6 5-2.5 12.5h-7L6 7z" fill={c} />,
  // leaf
  (c) => (
    <path
      d="M20 4C10 4 4 10 4 18c0 1 .8 2 2 2 8 0 14-6 14-16 0-.3 0-.7 0 0z"
      fill={c}
    />
  ),
  // hammer
  (c) => (
    <>
      <rect x="3" y="3" width="10" height="7" rx="1.5" transform="rotate(-30 8 6.5)" fill={c} />
      <rect x="10.5" y="10" width="3" height="11" rx="1.3" transform="rotate(-30 12 15.5)" fill={c} />
    </>
  ),
  // star
  (c) => <path d="M12 2.5l2.6 6.2 6.7.5-5.1 4.4 1.6 6.6L12 16.8 6.2 20.2l1.6-6.6-5.1-4.4 6.7-.5L12 2.5z" fill={c} />,
  // feather
  (c) => (
    <path
      d="M18 3C10 5 5 11 4 20c6-1 10-4 12-9-2 .5-4 .5-5.5-.5 2-.3 3.8-1.3 5-3-1.8.4-3.3.1-4.2-1 2-.2 3.7-1.3 4.7-2.7-1.6.3-3 0-3.7-1C14 3.3 16 3 18 3z"
      fill={c}
    />
  ),
];

function Face() {
  return (
    <>
      <circle cx="9.2" cy="12.7" r="1.15" fill="#2b2b2b" />
      <circle cx="14.8" cy="12.7" r="1.15" fill="#2b2b2b" />
      <path d="M9.4 15.4 Q12 17.4 14.6 15.4" stroke="#2b2b2b" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <ellipse cx="7" cy="14.2" rx="1.3" ry="0.85" fill="#FF8FA3" opacity="0.6" />
      <ellipse cx="17" cy="14.2" rx="1.3" ry="0.85" fill="#FF8FA3" opacity="0.6" />
    </>
  );
}

function StampIcon({ index, color, size = 30, withFace = true, shapes }) {
  const set = shapes || SHAPES;
  const draw = set[index % set.length];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {draw(color)}
      {withFace && <Face />}
    </svg>
  );
}

const THEMES = {
  girl: {
    key: "girl",
    label: "女の子むけ",
    emoji: "🎀",
    bg: "linear-gradient(180deg, #0B3D62 0%, #14588C 42%, #2E9BC7 78%, #6FCFEB 100%)",
    accentGradient: "linear-gradient(90deg,#FFD6E0,#F4C95D)",
    palette: PASTELS,
    headingFont: "'Kaisei Decol', serif",
    headingColor: "#0B3D62",
    headingShadow: "none",
    mascotBg: "#FFD6E0",
    mascotIconIndex: 0,
    shapes: SHAPES,
    withFace: true,
    headerTextColor: "#EAF7FB",
    overlayBg: "rgba(255,255,255,0.15)",
    isMapTheme: false,
  },
  boy: {
    key: "boy",
    label: "男の子むけ",
    emoji: "🐉",
    bg: "linear-gradient(180deg, #3E2A16 0%, #6B4E2A 25%, #A9885A 58%, #D9C48C 100%)",
    accentGradient: "linear-gradient(90deg,#C89B3C,#8B5E34)",
    palette: BOY_PALETTE,
    headingFont: "'Dela Gothic One', sans-serif",
    headingColor: "#5C3A21",
    headingShadow: "2px 2px 0 #C89B3C, -1px -1px 0 #F4E9CE, 0 3px 6px rgba(0,0,0,0.35)",
    mascotBg: "#3F6B35",
    mascotIconIndex: 0,
    shapes: HUNTER_SHAPES,
    withFace: false,
    headerTextColor: "#3E2415",
    overlayBg: "rgba(255,251,240,0.55)",
    isMapTheme: true,
  },
};

function getTheme(key) {
  return THEMES[key] || THEMES.girl;
}

const CHEERS = ["やったね！", "すごいね！", "よくできました！", "ピカピカ★", "偉いね！", "ナイス！", "完璧！"];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d, n) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayIndexMon0(d) {
  return (d.getDay() + 6) % 7;
}

function isBetween(d, start, end) {
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function subjectAppliesOnDate(subject, date, startDate, endDate) {
  if (!isBetween(date, startDate, endDate)) return false;
  if (subject.freqType === "weekday") {
    return (subject.weekdays || []).includes(dayIndexMon0(date));
  }
  if (subject.freqType === "interval") {
    const diffDays = Math.round((date.getTime() - startDate.getTime()) / 86400000);
    const n = Math.max(1, subject.intervalDays || 2);
    return diffDays >= 0 && diffDays % n === 0;
  }
  return true; // daily
}

function todayStr() {
  return dateKey(new Date());
}

function clampDuration(v) {
  let n = Math.round(Number(v) / 10) * 10;
  if (!Number.isFinite(n) || n <= 0) n = 10;
  return Math.max(10, Math.min(100, n));
}

function describeFrequency(subject) {
  if (subject.freqType === "weekday") {
    const days = (subject.weekdays || []).slice().sort();
    if (days.length === 0) return "曜日未定";
    return days.map((i) => DAY_LABELS[i]).join("・") + "曜日";
  }
  if (subject.freqType === "interval") {
    return `${Math.max(1, subject.intervalDays || 2)}日に1回`;
  }
  return "毎日";
}

function describeTargets(subject) {
  const parts = [];
  if (subject.measureTime) parts.push(`⏱${subject.targetMinutes || 30}分`);
  if (subject.measurePages) parts.push(`📖${subject.targetPages || 5}ページ`);
  if (subject.measureProblems) parts.push(`✏️${subject.targetProblems || 10}問`);
  return parts;
}

function subjectIsMeasurable(subject) {
  return !!(subject.measureTime || subject.measurePages || subject.measureProblems);
}

function formatAchvShort(vals) {
  const parts = [];
  if (vals.minutes) parts.push(`⏱${vals.minutes}分`);
  if (vals.pages) parts.push(`📖${vals.pages}p`);
  if (vals.problems) parts.push(`✏️${vals.problems}問`);
  return parts.join(" ");
}

// Which vector icon represents a given subject/task. Used consistently
// everywhere a subject's icon is shown (the spotlight card, blank-stamp
// hints, practice stamps) so the same subject always shows the same icon.
// For the boy theme, index 0 is reserved for the dragon completion image,
// so regular task icons cycle through the other shapes instead — the
// dragon shape is never handed out as an ordinary task icon.
function taskIconIndex(idx, useDragonStamp, shapesLength) {
  if (useDragonStamp && shapesLength > 1) return (idx % (shapesLength - 1)) + 1;
  return idx % shapesLength;
}

const DURATION_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * 10);
const PAGE_OPTIONS = Array.from({ length: 50 }, (_, i) => i + 1);
const PROBLEM_OPTIONS = Array.from({ length: 100 }, (_, i) => i + 1);
const BIRTH_YEAR_OPTIONS = Array.from({ length: 57 }, (_, i) => 2026 - i); // 2026 down to 1970
const BIRTH_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const BIRTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

// Year / month / day as three drum-roll <select> wheels instead of a native
// date input — some browsers only let year+month scroll and make day a
// separate calendar tap, so this keeps all three consistently quick.
function BirthdateSelects({ value, onChange, style }) {
  const [y, m, d] = (value || "").split("-");
  function update(ny, nm, nd) {
    if (ny && nm && nd) onChange(`${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`);
    else onChange("");
  }
  const selStyle = { ...styles.measureSelect, width: "auto", flex: 1, minWidth: 0, padding: "8px 4px", ...(style || {}) };
  const yearStyle = { ...selStyle, flex: 1.6, minWidth: 66, padding: "8px 2px" };
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <select value={y || ""} onChange={(e) => update(e.target.value, m, d)} style={yearStyle}>
        <option value="">年</option>
        {BIRTH_YEAR_OPTIONS.map((yy) => (
          <option key={yy} value={yy}>
            {yy}
          </option>
        ))}
      </select>
      <select value={m ? Number(m) : ""} onChange={(e) => update(y, e.target.value, d)} style={selStyle}>
        <option value="">月</option>
        {BIRTH_MONTH_OPTIONS.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
      <select value={d ? Number(d) : ""} onChange={(e) => update(y, m, e.target.value)} style={selStyle}>
        <option value="">日</option>
        {BIRTH_DAY_OPTIONS.map((dd) => (
          <option key={dd} value={dd}>
            {dd}
          </option>
        ))}
      </select>
    </div>
  );
}

function defaultEndDate() {
  const d = new Date();
  d.setDate(d.getDate() + 27);
  return dateKey(d);
}

const DEFAULT_SUBJECT = (palette) => ({
  id: uid(),
  name: "",
  color: (palette || PASTELS)[0].hex,
  freqType: "daily",
  intervalDays: 2,
  weekdays: [0, 1, 2, 3, 4],
  durationMinutes: 10,
  measureTime: true,
  targetMinutes: 30,
  measurePages: false,
  targetPages: 5,
  measureProblems: false,
  targetProblems: 10,
});

function freshConfig() {
  return {
    title: "",
    theme: "girl",
    startDate: todayStr(),
    endDate: defaultEndDate(),
    subjects: [DEFAULT_SUBJECT()],
    pin: "",
    reward: "",
  };
}

export default function KidsScheduleApp() {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("loading");
  const [focusSubjectId, setFocusSubjectId] = useState(null);
  const [config, setConfig] = useState(freshConfig());
  const [completions, setCompletions] = useState({});
  const [recoveries, setRecoveries] = useState({});
  const [funStamps, setFunStamps] = useState({});
  const [notes, setNotes] = useState({});
  const [achievements, setAchievements] = useState({});
  const [noteModalDate, setNoteModalDate] = useState(null);
  const [linkedProfile, setLinkedProfile] = useState(null); // { name, totalStamps } | null
  const [showRecordsList, setShowRecordsList] = useState(false);
  const [locked, setLocked] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [celebrateDay, setCelebrateDay] = useState(null);
  const [celebrateSchedule, setCelebrateSchedule] = useState(false);
  const [toast, setToast] = useState("");
  const skipSave = useRef(true);
  const unlockTimer = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const data = JSON.parse(res.value);
          if (data.config && data.config.subjects && data.config.subjects.length > 0) {
            setConfig(data.config);
            setCompletions(data.completions || {});
            setRecoveries(data.recoveries || {});
            setFunStamps(data.funStamps || {});
            setNotes(data.notes || {});
            setAchievements(data.achievements || {});
            // A "?edit=1" URL flag (used by the top-page's edit button) jumps
            // straight into the setup/edit screen instead of the main view.
            let wantsEdit = false;
            try {
              wantsEdit = new URLSearchParams(window.location.search).get("edit") === "1";
            } catch (e) {}
            setView(wantsEdit ? "setup" : "main");
          } else {
            applyThemeFromUrl();
            setView("setup");
          }
        } else {
          applyThemeFromUrl();
          setView("setup");
        }
      } catch (e) {
        applyThemeFromUrl();
        setView("setup");
      }
      setLoaded(true);
    })();

    function applyThemeFromUrl() {
      try {
        const params = new URLSearchParams(window.location.search);
        const t = params.get("theme");
        const p = params.get("profileId");
        setConfig((prev) => {
          const nextTheme = t === "girl" || t === "boy" ? t : prev.theme;
          return {
            ...prev,
            ...(t === "girl" || t === "boy" ? { theme: t } : {}),
            ...(p ? { profileId: p } : {}),
            // New schedule (this only runs when nothing was loaded from
            // storage yet) — roll which color egg this schedule will grow.
            ...(!prev.mascotVariant ? { mascotVariant: pickRandomVariant(nextTheme) } : {}),
          };
        });
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const t = setTimeout(async () => {
      try {
        await window.storage.set(
          STORAGE_KEY,
          JSON.stringify({ config, completions, recoveries, funStamps, notes, achievements }),
          false
        );
      } catch (e) {}
    }, 350);
    return () => clearTimeout(t);
  }, [config, completions, recoveries, funStamps, notes, achievements, loaded]);

  // iOS home-screen apps often get suspended instead of fully closed, and
  // reopening them can show whatever was last in memory instead of fetching
  // fresh data. Re-fetch whenever the app becomes visible again — but only
  // while on the main calendar and not mid-memo, so this can't wipe out
  // anything the person is in the middle of typing. Also throttled so it
  // can't fire more than once every 20 seconds even if focus/visibility
  // events fire in quick succession (e.g. the keyboard showing/hiding).
  const lastRefreshRef = useRef(0);
  useEffect(() => {
    if (!loaded) return;
    function refresh() {
      if (view !== "main") return;
      if (noteModalDate) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 20000) return;
      lastRefreshRef.current = now;
      (async () => {
        try {
          const res = await window.storage.get(STORAGE_KEY, false);
          if (res && res.value) {
            const data = JSON.parse(res.value);
            if (data.config && data.config.subjects && data.config.subjects.length > 0) {
              setConfig(data.config);
            }
            setCompletions(data.completions || {});
            setRecoveries(data.recoveries || {});
            setFunStamps(data.funStamps || {});
            setNotes(data.notes || {});
            setAchievements(data.achievements || {});
          }
        } catch (e) {}
      })();
    }
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [loaded, view, noteModalDate]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!config.profileId) {
      setLinkedProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [{ data: profData }, { data: schedData }] = await Promise.all([
          supabase.from("profiles").select("blob").eq("id", config.profileId).maybeSingle(),
          supabase.from("schedules").select("blob").eq("blob->config->>profileId", config.profileId),
        ]);
        let total = 0;
        (schedData || []).forEach((row) => {
          const completions = (row.blob && row.blob.completions) || {};
          Object.values(completions).forEach((day) => {
            Object.values(day || {}).forEach((v) => {
              if (v >= 1) total++;
            });
          });
        });
        if (!cancelled) {
          setLinkedProfile({ name: (profData && profData.blob && profData.blob.name) || "", totalStamps: total });
        }
      } catch (e) {}
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, config.profileId]);

  const startDate = parseDate(config.startDate) || new Date();
  const endDate = parseDate(config.endDate) || addDays(startDate, 27);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dateKey(today);

  function daySubjectsFor(date) {
    return config.subjects.filter((s) => subjectAppliesOnDate(s, date, startDate, endDate));
  }

  function countFor(dKey, subjId) {
    return (completions[dKey] && completions[dKey][subjId]) || 0;
  }

  function isStamped(dKey, subjId) {
    return countFor(dKey, subjId) >= 1;
  }

  function funStampFor(dKey, subjId) {
    return !!(funStamps[dKey] && funStamps[dKey][subjId]);
  }

  // how many past required occurrences of this subject were never done, minus what's already been recovered
  function missedBacklog(subject) {
    let missed = 0;
    for (let d = new Date(startDate); d.getTime() < today.getTime(); d = addDays(d, 1)) {
      if (subjectAppliesOnDate(subject, d, startDate, endDate) && countFor(dateKey(d), subject.id) === 0) {
        missed++;
      }
    }
    return Math.max(0, missed - (recoveries[subject.id] || 0));
  }

  function handleTapStamp(date, subjId) {
    if (dateKey(date) !== todayKey) {
      showToast("スタンプは今日の分だけ押せるよ");
      return;
    }
    if (locked) {
      if (config.pin && config.pin.length > 0) setShowPinModal(true);
      else setShowConfirmModal(true);
      return;
    }
    const subject = config.subjects.find((s) => s.id === subjId);
    if (!subject) return;
    const dKey = dateKey(date);
    const cur = countFor(dKey, subjId);

    let next;
    let recoveryDelta = 0;
    if (cur === 0) {
      next = 1;
    } else if (cur === 1) {
      const backlog = missedBacklog(subject);
      if (backlog <= 0) {
        showToast("すでに1回押してあるよ。取り消すときは×ボタンを押してね");
        return;
      }
      next = 2;
      recoveryDelta = 1;
    } else {
      next = 0;
      recoveryDelta = -1;
    }

    setCompletions((prev) => {
      const day = { ...(prev[dKey] || {}) };
      if (next === 0) delete day[subjId];
      else day[subjId] = next;
      const updated = { ...prev, [dKey]: day };

      const need = daySubjectsFor(date).map((s) => s.id);
      const allDone = need.length > 0 && need.every((id) => (day[id] || 0) >= 1);
      if (allDone) setTimeout(() => setCelebrateDay(dKey), 50);

      if (dateKey(today) === dateKey(endDate)) {
        const allDays = [];
        for (let d = new Date(startDate); d.getTime() <= endDate.getTime(); d = addDays(d, 1)) allDays.push(d);
        const scheduleAllDone = allDays.every((d) => {
          const req = daySubjectsFor(d).map((s) => s.id);
          if (req.length === 0) return true;
          const rec = updated[dateKey(d)] || {};
          return req.every((id) => (rec[id] || 0) >= 1);
        });
        if (scheduleAllDone) {
          setTimeout(() => setCelebrateSchedule(true), 700);
          awardCardIfNeeded(computeOverallStats(config, updated).need);
        }
      }
      return updated;
    });

    if (recoveryDelta !== 0) {
      setRecoveries((prev) => ({ ...prev, [subjId]: Math.max(0, (prev[subjId] || 0) + recoveryDelta) }));
    }

    if (next === 2) showToast("すごい！2日分取り戻したね！");
  }

  function handleClearStamp(date, subjId) {
    if (dateKey(date) !== todayKey) {
      showToast("スタンプは今日の分だけ操作できるよ");
      return;
    }
    if (locked) {
      if (config.pin && config.pin.length > 0) setShowPinModal(true);
      else setShowConfirmModal(true);
      return;
    }
    const dKey = dateKey(date);
    const cur = countFor(dKey, subjId);
    if (cur === 0) return;
    const recoveryDelta = cur === 2 ? -1 : 0;

    setCompletions((prev) => {
      const day = { ...(prev[dKey] || {}) };
      delete day[subjId];
      return { ...prev, [dKey]: day };
    });

    if (recoveryDelta !== 0) {
      setRecoveries((prev) => ({ ...prev, [subjId]: Math.max(0, (prev[subjId] || 0) + recoveryDelta) }));
    }

    showToast("スタンプを取り消したよ");
  }

  // Playful "practice" stamps for cells that aren't real yet (not today) — freely
  // toggled on/off, always allowed regardless of lock state, and never counted
  // toward backlog, streaks, or the completion percentage. Purely for fun so the
  // app doesn't feel inert on every cell that isn't tappable "for real".
  function handleToggleFunStamp(date, subjId) {
    const dKey = dateKey(date);
    if (dKey === todayKey) return; // today already has the real stamp
    setFunStamps((prev) => {
      const day = { ...(prev[dKey] || {}) };
      if (day[subjId]) delete day[subjId];
      else day[subjId] = true;
      return { ...prev, [dKey]: day };
    });
  }

  // Lets an unlocked (parent-confirmed) view mark or unmark a genuine
  // completion on a PAST day — for backfilling a forgotten stamp. Mirrors
  // today's tap cycle: 1st tap marks the day done, a 2nd tap on the same
  // day recovers one missed day from this subject's backlog (same pool
  // handleTapStamp draws from) and shows the "×2" badge, and tapping again
  // clears it back to empty. Only ever called while unlocked; never
  // touches today (that uses the normal flow) or future days.
  function handleTogglePastStamp(date, subjId) {
    if (locked) return;
    const dKey = dateKey(date);
    if (dKey >= todayKey) return;
    const subject = config.subjects.find((s) => s.id === subjId);
    if (!subject) return;
    const cur = countFor(dKey, subjId);

    let next;
    let recoveryDelta = 0;
    if (cur === 0) {
      next = 1;
    } else if (cur === 1) {
      const backlog = missedBacklog(subject);
      if (backlog <= 0) {
        next = 0;
      } else {
        next = 2;
        recoveryDelta = 1;
      }
    } else {
      next = 0;
      recoveryDelta = -1;
    }

    setCompletions((prev) => {
      const day = { ...(prev[dKey] || {}) };
      if (next === 0) delete day[subjId];
      else day[subjId] = next;
      const updated = { ...prev, [dKey]: day };

      const need = daySubjectsFor(date).map((s) => s.id);
      const allDone = need.length > 0 && need.every((id) => (day[id] || 0) >= 1);
      if (allDone) setTimeout(() => setCelebrateDay(dKey), 50);

      const allDays = [];
      for (let d = new Date(startDate); d.getTime() <= endDate.getTime(); d = addDays(d, 1)) allDays.push(d);
      const scheduleAllDone = allDays.every((d) => {
        const req = daySubjectsFor(d).map((s) => s.id);
        if (req.length === 0) return true;
        const rec = updated[dateKey(d)] || {};
        return req.every((id) => (rec[id] || 0) >= 1);
      });
      if (scheduleAllDone) {
        setTimeout(() => setCelebrateSchedule(true), 400);
        awardCardIfNeeded(computeOverallStats(config, updated).need);
      }

      return updated;
    });

    if (recoveryDelta !== 0) {
      setRecoveries((prev) => ({ ...prev, [subjId]: Math.max(0, (prev[subjId] || 0) + recoveryDelta) }));
    }
    if (next === 2) showToast("すごい！2日分取り戻したね！");
  }

  // The explicit "×" undo for a past-day mark, mirroring handleClearStamp.
  // Separate from the tap cycle above so a mis-tap can always be corrected
  // directly instead of having to cycle all the way back around to 0.
  function handleClearPastStamp(date, subjId) {
    if (locked) return;
    const dKey = dateKey(date);
    if (dKey >= todayKey) return;
    const cur = countFor(dKey, subjId);
    if (cur === 0) return;
    const recoveryDelta = cur === 2 ? -1 : 0;

    setCompletions((prev) => {
      const day = { ...(prev[dKey] || {}) };
      delete day[subjId];
      return { ...prev, [dKey]: day };
    });

    if (recoveryDelta !== 0) {
      setRecoveries((prev) => ({ ...prev, [subjId]: Math.max(0, (prev[subjId] || 0) + recoveryDelta) }));
    }
  }

  // Hands out the growth-mascot card the first time a schedule reaches
  // 100% — but only for schedules substantial enough to matter: at least
  // 30 days long AND at least 50 total stamps required. Short schedules
  // reaching 100% don't earn a card, so cards can't be farmed with tiny
  // schedules. Idempotent (checks config.awardedCard) so re-triggering the
  // "all done" check (e.g. toggling a past stamp back and forth) never
  // hands out a second card for the same schedule.
  function awardCardIfNeeded(totalStamps) {
    const scheduleDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    if (scheduleDays < 30 || totalStamps < 50) return;
    setConfig((prev) => {
      if (prev.awardedCard) return prev;
      return {
        ...prev,
        awardedCard: {
          theme: prev.theme,
          variant: prev.mascotVariant || pickRandomVariant(prev.theme),
          earnedAt: todayStr(),
        },
      };
    });
  }

  function buildRecordsList() {
    const entries = [];
    for (let d = new Date(startDate); d.getTime() <= endDate.getTime(); d = addDays(d, 1)) {
      const dKey = dateKey(d);
      const note = notes[dKey];
      const achv = achievements[dKey];
      const hasAchv = achv && Object.keys(achv).length > 0;
      if (note || hasAchv) {
        entries.push({ date: new Date(d), dKey, note, achv: hasAchv ? achv : null });
      }
    }
    entries.sort((a, b) => b.date.getTime() - a.date.getTime());
    return entries;
  }

  function handleOpenNote(date) {
    setNoteModalDate(date);
  }

  function handleCloseNote() {
    setNoteModalDate(null);
  }

  function handleSaveNote(text, achv) {
    if (!noteModalDate) return;
    const dKey = dateKey(noteModalDate);
    setNotes((prev) => {
      const next = { ...prev };
      if (text.trim()) next[dKey] = text;
      else delete next[dKey];
      return next;
    });
    if (achv && Object.keys(achv).length > 0) {
      setAchievements((prev) => {
        // drop subjects whose fields are all empty so we don't store clutter
        const cleaned = {};
        Object.entries(achv).forEach(([subjId, vals]) => {
          const hasAny = ["minutes", "pages", "problems"].some(
            (k) => vals[k] !== undefined && vals[k] !== "" && vals[k] !== null
          );
          if (hasAny) cleaned[subjId] = vals;
        });
        const next = { ...prev };
        if (Object.keys(cleaned).length > 0) next[dKey] = cleaned;
        else delete next[dKey];
        return next;
      });
    }
    setNoteModalDate(null);
  }

  async function handleDeleteSchedule() {
    setDeleting(true);
    try {
      await window.storage.delete(STORAGE_KEY, false);
    } catch (e) {
      // even if the network call fails, still leave via the top page —
      // there is nothing more this screen can usefully do about it
    }
    try {
      window.location.href = window.location.pathname;
    } catch (e) {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function doUnlock() {
    setLocked(false);
    setShowConfirmModal(false);
    setShowPinModal(false);
    showToast("スタンプが押せるようになったよ！3分後に自動でロックします");
    clearTimeout(unlockTimer.current);
    unlockTimer.current = setTimeout(() => {
      setLocked(true);
      showToast("自動的にロックしました");
    }, 3 * 60 * 1000);
  }

  function handleRelock() {
    clearTimeout(unlockTimer.current);
    setLocked(true);
  }

  function totalStats() {
    let done = 0,
      need = 0;
    for (let d = new Date(startDate); d.getTime() <= endDate.getTime(); d = addDays(d, 1)) {
      const req = daySubjectsFor(d).map((s) => s.id);
      need += req.length;
      const rec = completions[dateKey(d)] || {};
      done += req.filter((id) => (rec[id] || 0) >= 1).length;
    }
    return { done, need };
  }

  function todayStats() {
    if (!isBetween(today, startDate, endDate)) return { done: 0, need: 0 };
    const req = daySubjectsFor(today).map((s) => s.id);
    const rec = completions[todayKey] || {};
    const done = req.filter((id) => (rec[id] || 0) >= 1).length;
    return { done, need: req.length };
  }

  function streakDays() {
    const t = todayStats();
    const todayComplete = isBetween(today, startDate, endDate) && t.need > 0 && t.done === t.need;
    let streak = 0;
    let cursor = addDays(today, todayComplete ? 0 : -1);
    while (isBetween(cursor, startDate, endDate)) {
      const req = daySubjectsFor(cursor).map((s) => s.id);
      if (req.length === 0) {
        cursor = addDays(cursor, -1);
        continue;
      }
      const rec = completions[dateKey(cursor)] || {};
      const complete = req.every((id) => (rec[id] || 0) >= 1);
      if (!complete) break;
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  if (view === "loading") {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingBubble} />
      </div>
    );
  }

  return (
    <div style={styles.appRoot}>
      <GlobalStyle />
      {view === "setup" && (
        <SetupScreen
          initial={config}
          hasExisting={!!config.title}
          focusSubjectId={focusSubjectId}
          onCancel={config.title ? () => setView("main") : null}
          onRequestDelete={config.title ? () => setShowDeleteConfirm(true) : null}
          onSave={(cfg) => {
            setConfig(cfg);
            setView("main");
            setFocusSubjectId(null);
            // Clear the ?edit=1 flag so a later refresh lands on the main view.
            try {
              const url = new URL(window.location.href);
              if (url.searchParams.has("edit")) {
                url.searchParams.delete("edit");
                window.history.replaceState(null, "", url.toString());
              }
            } catch (e) {}
          }}
        />
      )}
      {view === "main" && (
        <MainScreen
          config={config}
          completions={completions}
          startDate={startDate}
          endDate={endDate}
          todayKey={todayKey}
          locked={locked}
          onLockToggle={() =>
            locked
              ? config.pin && config.pin.length > 0
                ? setShowPinModal(true)
                : setShowConfirmModal(true)
              : handleRelock()
          }
          onTapStamp={handleTapStamp}
          onClearStamp={handleClearStamp}
          onToggleFunStamp={handleToggleFunStamp}
          onTogglePastStamp={handleTogglePastStamp}
          onClearPastStamp={handleClearPastStamp}
          notes={notes}
          achievements={achievements}
          onOpenNote={handleOpenNote}
          onOpenRecords={() => setShowRecordsList(true)}
          linkedProfile={linkedProfile}
          daySubjectsFor={daySubjectsFor}
          isStamped={isStamped}
          countFor={countFor}
          funStampFor={funStampFor}
          missedBacklog={missedBacklog}
          onOpenSettings={() => setView("setup")}
          onEditSubject={(subjectId) => {
            setFocusSubjectId(subjectId);
            setView("setup");
          }}
          onRequestDelete={() => setShowDeleteConfirm(true)}
          stats={totalStats()}
          todayStats={todayStats()}
          streak={streakDays()}
        />
      )}

      {showConfirmModal && (
        <ConfirmModal
          title="保護者の方へ"
          message="ここから先はスタンプを押せるようになります。保護者の方が操作していますか？"
          confirmLabel="はい、開けます"
          cancelLabel="やめる"
          onConfirm={doUnlock}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {showPinModal && (
        <PinModal
          correctPin={config.pin}
          onSuccess={doUnlock}
          onFail={() => showToast("暗証番号が違います")}
          onCancel={() => setShowPinModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="このスケジュールを削除しますか？"
          message={`「${config.title}」を削除します。これまでの記録もすべて消え、元に戻せません。`}
          confirmLabel={deleting ? "削除中…" : "削除する"}
          cancelLabel="やめる"
          onConfirm={handleDeleteSchedule}
          onCancel={() => setShowDeleteConfirm(false)}
          danger
        />
      )}

      {noteModalDate && (
        <NoteModal
          date={noteModalDate}
          initialText={notes[dateKey(noteModalDate)] || ""}
          initialAchievements={achievements[dateKey(noteModalDate)] || {}}
          subjects={config.subjects}
          isMapTheme={getTheme(config.theme).isMapTheme}
          onSave={handleSaveNote}
          onClose={handleCloseNote}
        />
      )}

      {showRecordsList && (
        <RecordsListModal
          entries={buildRecordsList()}
          subjects={config.subjects}
          onClose={() => setShowRecordsList(false)}
        />
      )}

      {celebrateDay && <DayCelebration onClose={() => setCelebrateDay(null)} theme={config.theme} />}
      {celebrateSchedule && (
        <ScheduleCompleteCelebration
          onClose={() => setCelebrateSchedule(false)}
          title={config.title}
          reward={config.reward}
          theme={config.theme}
          variantKey={config.mascotVariant}
          awarded={!!config.awardedCard}
        />
      )}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

/* ---------------- Setup Screen ---------------- */

function SubjectCard({ subject, onChange, onRemove, canRemove, palette, isMapTheme, isFocused }) {
  function set(patch) {
    onChange({ ...subject, ...patch });
  }
  function toggleWeekday(i) {
    const cur = subject.weekdays || [];
    const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort();
    set({ weekdays: next });
  }
  return (
    <div
      id={`subject-card-${subject.id}`}
      style={{
        ...styles.subjCard,
        ...(isFocused ? { boxShadow: "0 0 0 3px #F4C95D, 0 0 20px rgba(244,201,93,0.6)", borderColor: "#F4C95D" } : {}),
      }}
    >
      <div style={styles.subjCardTop}>
        <input
          value={subject.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="何を頑張る？（例：ピアノ）"
          style={styles.subjNameInput}
        />
        {canRemove && (
          <button style={styles.chipX} onClick={onRemove} aria-label="削除">
            <X size={16} />
          </button>
        )}
      </div>

      <div style={styles.swatchRow}>
        {(palette || PASTELS).map((p) => (
          <button
            key={p.hex}
            title={p.name}
            onClick={() => set({ color: p.hex })}
            style={{
              ...styles.swatch,
              background: p.hex,
              boxShadow: subject.color === p.hex ? "0 0 0 3px #fff, 0 0 0 5px #14588C" : "none",
            }}
          />
        ))}
      </div>

      {isMapTheme ? (
        <div style={styles.measureSection}>
          <span style={styles.measureSectionLabel}>目標（複数選べます）</span>

          <div style={styles.measureRow}>
            <button
              onClick={() => set({ measureTime: !subject.measureTime })}
              style={{ ...styles.measureToggle, ...(subject.measureTime ? styles.measureToggleOn : {}) }}
            >
              ⏱ 時間
            </button>
            {subject.measureTime && (
              <>
                <select
                  value={subject.targetMinutes ?? 30}
                  onChange={(e) => set({ targetMinutes: Number(e.target.value) })}
                  style={styles.measureSelect}
                >
                  {DURATION_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <span style={styles.measureUnit}>分</span>
              </>
            )}
          </div>

          <div style={styles.measureRow}>
            <button
              onClick={() => set({ measurePages: !subject.measurePages })}
              style={{ ...styles.measureToggle, ...(subject.measurePages ? styles.measureToggleOn : {}) }}
            >
              📖 ページ数
            </button>
            {subject.measurePages && (
              <>
                <select
                  value={subject.targetPages ?? 5}
                  onChange={(e) => set({ targetPages: Number(e.target.value) })}
                  style={styles.measureSelect}
                >
                  {PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span style={styles.measureUnit}>ページ</span>
              </>
            )}
          </div>

          <div style={styles.measureRow}>
            <button
              onClick={() => set({ measureProblems: !subject.measureProblems })}
              style={{ ...styles.measureToggle, ...(subject.measureProblems ? styles.measureToggleOn : {}) }}
            >
              ✏️ 問題数
            </button>
            {subject.measureProblems && (
              <>
                <select
                  value={subject.targetProblems ?? 10}
                  onChange={(e) => set({ targetProblems: Number(e.target.value) })}
                  style={styles.measureSelect}
                >
                  {PROBLEM_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span style={styles.measureUnit}>問</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.durationRow}>
          <span style={{ fontSize: 13, color: "#4a6c85", fontWeight: 700 }}>取り組む時間</span>
          <select
            value={subject.durationMinutes ?? 10}
            onChange={(e) => set({ durationMinutes: Number(e.target.value) })}
            style={styles.durationSelect}
          >
            {DURATION_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}分
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={styles.freqRow}>
        {[
          { k: "daily", label: "毎日" },
          { k: "interval", label: "〇日に1回" },
          { k: "weekday", label: "曜日を選ぶ" },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => set({ freqType: f.k })}
            style={{
              ...styles.freqBtn,
              background: subject.freqType === f.k ? "#14588C" : "#fff",
              color: subject.freqType === f.k ? "#fff" : "#14588C",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {subject.freqType === "interval" && (
        <div style={styles.intervalRow}>
          <input
            type="number"
            min={1}
            max={14}
            value={subject.intervalDays || 2}
            onChange={(e) => set({ intervalDays: Math.max(1, Number(e.target.value) || 1) })}
            style={styles.intervalInput}
          />
          <span style={{ fontSize: 13, color: "#4a6c85", fontWeight: 700 }}>日に1回のペース</span>
        </div>
      )}

      {subject.freqType === "weekday" && (
        <div style={styles.weekdayPicker}>
          {DAY_LABELS.map((label, i) => {
            const on = (subject.weekdays || []).includes(i);
            return (
              <button
                key={i}
                onClick={() => toggleWeekday(i)}
                style={{
                  ...styles.weekdayToggle,
                  background: on ? subject.color : "#fff",
                  borderColor: subject.color,
                  fontWeight: on ? 900 : 600,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SetupScreen({ initial, onSave, onCancel, hasExisting, onRequestDelete, focusSubjectId }) {
  const [title, setTitle] = useState(initial.title || "");
  const [theme, setTheme] = useState(initial.theme || "girl");
  const [startDate, setStartDate] = useState(initial.startDate || todayStr());
  const [endDate, setEndDate] = useState(initial.endDate || defaultEndDate());
  const [pin, setPin] = useState(initial.pin || "");
  const [reward, setReward] = useState(initial.reward || "");
  const initialPalette = getTheme(initial.theme || "girl").palette;
  const [subjects, setSubjects] = useState(
    initial.subjects && initial.subjects.length ? initial.subjects : [DEFAULT_SUBJECT(initialPalette)]
  );

  const palette = getTheme(theme).palette;
  const themeObj = getTheme(theme);

  useEffect(() => {
    if (!focusSubjectId) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`subject-card-${focusSubjectId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(t);
  }, [focusSubjectId]);

  const [profileId, setProfileId] = useState(initial.profileId || "");
  const [profileName, setProfileName] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkBirthdate, setLinkBirthdate] = useState("2015-01-01");
  const [linkStatus, setLinkStatus] = useState("idle"); // idle | searching | notfound

  useEffect(() => {
    if (!profileId) {
      setProfileName("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from("profiles").select("blob").eq("id", profileId).maybeSingle();
        if (!cancelled && data && data.blob) setProfileName(data.blob.name || "");
      } catch (e) {}
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  async function handleLinkProfile() {
    const name = linkName.trim();
    if (!name) return;
    setLinkStatus("searching");
    try {
      let query = supabase.from("profiles").select("id, blob").eq("blob->>name", name);
      if (linkBirthdate) query = query.eq("blob->>birthdate", linkBirthdate);
      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        setLinkStatus("notfound");
        return;
      }
      setProfileId(data[0].id);
      setProfileName((data[0].blob && data[0].blob.name) || "");
      setLinkName("");
      setLinkBirthdate("");
      setLinkStatus("idle");
    } catch (e) {
      setLinkStatus("notfound");
    }
  }

  function handleUnlinkProfile() {
    setProfileId("");
    setProfileName("");
  }

  function addSubject() {
    setSubjects((prev) => [
      ...prev,
      { ...DEFAULT_SUBJECT(), color: palette[prev.length % palette.length].hex },
    ]);
  }

  function updateSubject(id, next) {
    setSubjects((prev) => prev.map((s) => (s.id === id ? next : s)));
  }

  function removeSubject(id) {
    setSubjects((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  }

  function handleSave() {
    const t = title.trim() || "がんばりスケジュール";
    const cleanSubjects = subjects.filter((s) => s.name.trim().length > 0).map((s) => ({ ...s, name: s.name.trim() }));
    if (cleanSubjects.length === 0) return;
    let sd = startDate,
      ed = endDate;
    if (parseDate(ed) < parseDate(sd)) ed = sd;
    onSave({
      ...(initial.mascotVariant ? { mascotVariant: initial.mascotVariant } : {}),
      ...(initial.awardedCard ? { awardedCard: initial.awardedCard } : {}),
      title: t,
      theme,
      startDate: sd,
      endDate: ed,
      subjects: cleanSubjects,
      pin: pin.trim(),
      reward: reward.trim(),
      ...(profileId ? { profileId } : {}),
    });
  }

  return (
    <div style={{ ...styles.setupWrap, background: themeObj.bg, position: "relative", overflow: "hidden" }}>
      {themeObj.isMapTheme && <MapDoodles />}
      <div style={{ ...styles.setupCard, position: "relative", zIndex: 1 }}>
        {onCancel && (
          <button onClick={onCancel} style={styles.backBtn}>
            <ArrowLeft size={20} /> もどる
          </button>
        )}
        <h1
          style={{
            ...styles.setupHeading,
            fontFamily: themeObj.headingFont,
            color: themeObj.headingColor,
            textShadow: themeObj.headingShadow,
          }}
        >
          {hasExisting ? "スケジュールを編集する" : "スケジュールを作ろう"}
        </h1>
        <p style={styles.setupSub}>誰の、何を頑張るスケジュールか、名前をつけてね</p>

        {profileId ? (
          <div style={styles.profileLinkedBanner}>
            <span>🌟 {profileName || "スタンプ帳"} のスタンプ帳と連携しています</span>
            <button onClick={handleUnlinkProfile} style={styles.profileUnlinkBtn}>
              連携を外す
            </button>
          </div>
        ) : (
          <div style={styles.profileLinkBox}>
            <div style={styles.profileLinkLabel}>🌟 スタンプ帳と連携する（任意）</div>
            <div style={styles.profileLinkRow}>
              <input
                value={linkName}
                onChange={(e) => {
                  setLinkName(e.target.value);
                  setLinkStatus("idle");
                }}
                placeholder="なまえ"
                style={styles.profileLinkInput}
              />
              <BirthdateSelects
                value={linkBirthdate}
                onChange={(v) => {
                  setLinkBirthdate(v);
                  setLinkStatus("idle");
                }}
              />
              <button
                onClick={handleLinkProfile}
                disabled={!linkName.trim() || linkStatus === "searching"}
                style={{ ...styles.profileLinkBtn, opacity: linkName.trim() ? 1 : 0.5 }}
              >
                {linkStatus === "searching" ? "…" : "連携する"}
              </button>
            </div>
            {linkStatus === "notfound" && <p style={styles.profileLinkError}>見つかりませんでした。</p>}
          </div>
        )}

        <label style={styles.label}>タイトル</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例）祐太郎9月のチャレンジ"
          style={styles.input}
        />

        <label style={{ ...styles.label, marginTop: 20 }}>期間（いつから、いつまで）</label>
        <div style={styles.dateRow}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.dateInput} />
          <span style={{ color: "#4a6c85", fontWeight: 700 }}>〜</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.dateInput} />
        </div>

        <label style={{ ...styles.label, marginTop: 20 }}>保護者用 暗証番号（任意・数字4〜6桁）</label>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder="設定しない場合は空欄でOK"
          inputMode="numeric"
          autoComplete="off"
          style={styles.input}
        />
        <p style={styles.tinyNote}>暗証番号を入れると、スタンプを押すときに保護者の確認が必要になります。</p>

        <label style={{ ...styles.label, marginTop: 20 }}>🎁 全部達成したときのご褒美（任意）</label>
        <input
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          placeholder="例）焼肉を食べに行く！／お小遣いをもらう！"
          style={styles.input}
        />
        <p style={styles.tinyNote}>期間の最後まで、すべてのやることを達成したときにお祝いのメッセージとして表示されます。</p>

        <label style={{ ...styles.label, marginTop: 20 }}>やること（教科・習い事）</label>
        <div style={styles.subjList}>
          {subjects.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              onChange={(next) => updateSubject(s.id, next)}
              onRemove={() => removeSubject(s.id)}
              canRemove={subjects.length > 1}
              palette={palette}
              isMapTheme={themeObj.isMapTheme}
              isFocused={s.id === focusSubjectId}
            />
          ))}
        </div>
        <button style={styles.addBtn} onClick={addSubject}>
          <Plus size={20} /> やることを追加
        </button>

        <button style={styles.saveBtn} onClick={handleSave}>
          このスケジュールで始める
        </button>

        {onRequestDelete && (
          <button style={styles.deleteScheduleBtn} onClick={onRequestDelete}>
            🗑 このスケジュールを削除する
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Main Screen ---------------- */

function MainScreen({
  config,
  completions,
  startDate,
  endDate,
  todayKey,
  locked,
  onLockToggle,
  onTapStamp,
  onClearStamp,
  onToggleFunStamp,
  onTogglePastStamp,
  onClearPastStamp,
  daySubjectsFor,
  isStamped,
  countFor,
  funStampFor,
  missedBacklog,
  onOpenSettings,
  onEditSubject,
  onRequestDelete,
  stats,
  todayStats,
  streak,
  notes,
  achievements,
  onOpenNote,
  onOpenRecords,
  linkedProfile,
}) {
  const pct = stats.need > 0 ? Math.round((stats.done / stats.need) * 100) : 0;
  const pearlCount = 10;
  const filledPearls = stats.need > 0 ? Math.round((stats.done / stats.need) * pearlCount) : 0;

  const todayPct = todayStats.need > 0 ? Math.round((todayStats.done / todayStats.need) * 100) : 0;
  const mascotMsg =
    todayStats.need === 0
      ? "今日はお休みの日だよ〜"
      : todayStats.done === 0
      ? "今日も一緒に頑張ろう！"
      : todayStats.done < todayStats.need
      ? "いい調子！あと少し！"
      : "今日もパーフェクト！すごいね！";

  // Build a Monday-to-Sunday grid covering the whole schedule period, like a
  // desk calendar: padded at both ends so every row is a full week.
  const gridStart = getMonday(startDate);
  const trailing = (6 - dayIndexMon0(endDate) + 7) % 7;
  const gridEnd = addDays(endDate, trailing);
  const allCells = [];
  for (let d = new Date(gridStart); d.getTime() <= gridEnd.getTime(); d = addDays(d, 1)) allCells.push(d);

  const subjects = config.subjects;
  const theme = getTheme(config.theme);

  const todayCellRef = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => {
      if (todayCellRef.current) {
        todayCellRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        ...styles.mainWrap,
        background: theme.bg,
        ...(theme.isMapTheme
          ? {
              border: "10px solid #3E2A16",
              boxShadow: "inset 0 0 0 4px #C89B3C, inset 0 0 0 6px #3E2A16",
              borderRadius: 18,
            }
          : {}),
      }}
    >
      {theme.isMapTheme && <MapDoodles />}
      <CornerArt theme={theme.key} pct={pct} variantKey={config.mascotVariant} />
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.titleBanner}>
            <span
              style={{
                ...styles.titleText,
                fontFamily: theme.headingFont,
                color: theme.headingColor,
                textShadow: theme.headingShadow,
              }}
            >
              {config.title}
            </span>
          </div>
          <div style={styles.headerBtns}>
            <button style={styles.iconBtn} onClick={onLockToggle} title={locked ? "保護者用に開ける" : "ロックする"}>
              {locked ? <Lock size={22} /> : <Unlock size={22} />}
            </button>
            <button style={styles.iconBtn} onClick={onOpenSettings} title="設定">
              <Settings size={22} />
            </button>
          </div>
        </div>
        <div style={styles.editDeleteRow}>
          <button
            style={{
              ...styles.editBtnSmall,
              background: theme.overlayBg,
              borderColor: theme.headerTextColor,
              color: theme.headerTextColor,
            }}
            onClick={onOpenRecords}
          >
            📋 記録を見る
          </button>
          <button
            style={{
              ...styles.editBtnSmall,
              background: theme.overlayBg,
              borderColor: theme.headerTextColor,
              color: theme.headerTextColor,
            }}
            onClick={onOpenSettings}
          >
            ✏️ 修正する
          </button>
          <button
            style={{
              ...styles.deleteBtnSmall,
              background: theme.overlayBg,
              borderColor: theme.isMapTheme ? "#B4432F" : "#FBAEBE",
              color: theme.isMapTheme ? "#B4432F" : theme.headerTextColor,
            }}
            onClick={onRequestDelete}
          >
            🗑 削除する
          </button>
          {linkedProfile && (
            <a
              href={`${window.location.pathname}?profile=${config.profileId}`}
              style={{
                ...styles.editBtnSmall,
                background: theme.overlayBg,
                borderColor: "#F4C95D",
                color: theme.headerTextColor,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              🌟 スタンプ帳へ
            </a>
          )}
        </div>
        <div style={{ ...styles.lockNote, color: theme.headerTextColor }}>
          {locked
            ? "🔒 本スタンプは保護者の方がロックを開けてから押せます"
            : "🔓 本スタンプが押せます。過去の押し忘れもタップで記録できます（3分後に自動ロック）"}
        </div>

        <div style={styles.mascotRow}>
          <div
            style={{
              ...styles.mascotFace,
              background: theme.isMapTheme ? "linear-gradient(160deg,#3E2A16,#1E1409)" : "#fff",
              boxShadow: theme.isMapTheme ? "0 0 0 3px #C89B3C, 0 6px 14px rgba(0,0,0,0.5)" : styles.mascotFace.boxShadow,
              overflow: "hidden",
            }}
          >
            {theme.isMapTheme ? (
              <img src="/dragon-icon.png" alt="ドラゴン" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <StampIcon index={theme.mascotIconIndex} color={theme.mascotBg} size={40} shapes={theme.shapes} withFace={theme.withFace} />
            )}
          </div>
          <div style={styles.mascotBubbleWrap}>
            <div style={styles.mascotBubble}>{mascotMsg}</div>
            <div style={styles.todayProgressLine}>
              <span style={{ ...styles.todayProgressNum, color: theme.headerTextColor, textShadow: theme.isMapTheme ? "none" : styles.todayProgressNum.textShadow }}>
                今日 {todayStats.done}／{todayStats.need}
              </span>
              {streak > 0 && <span style={styles.streakBadge}>🔥 連続{streak}日</span>}
            </div>
            {todayStats.need > 0 && (
              <div style={styles.todayBarTrack}>
                <div style={{ ...styles.todayBarFill, width: `${todayPct}%`, background: theme.accentGradient }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ ...styles.necklaceRow, background: theme.overlayBg }}>
          {Array.from({ length: pearlCount }).map((_, i) =>
            theme.isMapTheme ? (
              <TreasureChestMini key={i} filled={i < filledPearls} />
            ) : (
              <span
                key={i}
                style={{
                  ...styles.pearl,
                  background: i < filledPearls ? "radial-gradient(circle at 35% 30%, #fff, #F4C95D 70%)" : "#ffffff55",
                  boxShadow: i < filledPearls ? "0 0 8px #F4C95Daa" : "none",
                }}
              />
            )
          )}
          <span style={{ ...styles.pearlPct, color: theme.headerTextColor }}>{pct}%（期間全体）</span>
        </div>

        {config.reward && (
          <div
            style={{
              ...styles.rewardPreview,
              background: theme.overlayBg,
              color: theme.headerTextColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span>
              🎁 全部達成すると… <strong>{config.reward}</strong>
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap", opacity: 0.9 }}>
              {stats.done}／{stats.need}個
            </span>
          </div>
        )}
      </header>

      <div style={styles.subjectSummaryRow}>
        {subjects.map((s, idx) => {
          const backlog = missedBacklog(s);
          return (
            <button
              key={s.id}
              onClick={() => onEditSubject(s.id)}
              style={{
                ...styles.subjectSpotlight,
                background: `linear-gradient(135deg, ${s.color}, #ffffff)`,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <div style={{ ...styles.subjectSpotlightIcon, background: s.color }}>
                <StampIcon
                  index={taskIconIndex(idx, theme.isMapTheme, theme.shapes.length)}
                  color="#ffffff"
                  size="60%"
                  shapes={theme.shapes}
                  withFace={theme.withFace}
                />
              </div>
              <div style={styles.subjectSpotlightTextWrap}>
                <div style={styles.subjectSpotlightName}>{s.name}</div>
                <div style={styles.subjectSpotlightDuration}>
                  {theme.isMapTheme ? describeTargets(s).join(" ") || "目標未設定" : `⏱ ${s.durationMinutes || 10}分`}
                </div>
                <div style={styles.subjectSpotlightFreq}>📅 {describeFrequency(s)}</div>
              </div>
              {backlog > 0 && <span style={styles.backlogBadgeBig}>🔁 残り{backlog}</span>}
            </button>
          );
        })}
      </div>

      <div style={styles.calendarLegendRow}>
        <span style={styles.calendarLegendItem}>
          <span style={{ ...styles.legendDot, background: "#14588C" }} /> 本スタンプ（今日だけ）
        </span>
        <span style={styles.calendarLegendItem}>
          <span style={{ ...styles.legendDot, background: "#BFE3F0" }} /> 仮スタンプ（練習用）
        </span>
      </div>

      <div style={styles.calendarPanel}>
        <p style={styles.tableHint}>💡 今日のマスは「本スタンプ」。他の日は自由に「仮スタンプ」で練習できるよ！</p>
        <div style={styles.calendarGrid}>
          {DAY_LABELS.map((label, i) =>
            theme.isMapTheme ? (
              <WeekdayShield key={`dow-${i}`} label={label} color={BOY_PALETTE[i % BOY_PALETTE.length].hex} iconIndex={(i % 7) + 1} shapes={theme.shapes} />
            ) : (
              <div key={`dow-${i}`} style={styles.weekdayHeadCell}>
                {label}
              </div>
            )
          )}
          {allCells.map((d, i) => {
            const dKey = dateKey(d);
            const inRange = isBetween(d, startDate, endDate);
            const isToday = todayKey === dKey;
            const dayReq = inRange ? daySubjectsFor(d) : [];
            const doneCount = dayReq.filter((s) => isStamped(dKey, s.id)).length;
            const dayComplete = dayReq.length > 0 && doneCount === dayReq.length;

            return (
              <div
                key={i}
                ref={isToday ? todayCellRef : null}
                style={{
                  ...styles.dayCell,
                  ...(!inRange ? styles.dayCellDim : {}),
                  ...(isToday ? styles.dayCellToday : {}),
                  ...(dayComplete ? styles.dayCellComplete : {}),
                }}
              >
                <div style={styles.dayCellTopRow}>
                  <span style={styles.dayNum}>{`${d.getMonth() + 1}/${d.getDate()}`}</span>
                  {isToday && <span style={styles.dayHeadTodayTag}>今日</span>}
                  {dayComplete && <span style={styles.dayHeadTrophy}>🏆</span>}
                </div>
                {inRange && (
                  <button
                    onClick={() => onOpenNote(d)}
                    style={{
                      ...styles.memoBtn,
                      ...(theme.isMapTheme
                        ? {
                            background: notes[dKey] || achievements[dKey] ? "#F4C95D" : "rgba(139,94,52,0.12)",
                            border: notes[dKey] || achievements[dKey] ? "1px solid #8B5E34" : "1px dashed #C4A876",
                            color: notes[dKey] || achievements[dKey] ? "#5C3A21" : "#8B6B47",
                          }
                        : notes[dKey]
                        ? styles.memoBtnFilled
                        : {}),
                    }}
                    aria-label={`${d.getMonth() + 1}月${d.getDate()}日 の メモ`}
                  >
                    📝 メモ
                  </button>
                )}

                {!inRange ? (
                  <span style={styles.dashMark}>ー</span>
                ) : dayReq.length === 0 ? (
                  <span style={styles.dashMark}>ー</span>
                ) : (
                  <div style={styles.dayStampsRow}>
                    {(theme.isMapTheme ? [...dayReq].reverse() : dayReq).map((s) => {
                      const stableIdx = subjects.findIndex((x) => x.id === s.id);
                      const count = countFor(dKey, s.id);
                      const achv = achievements[dKey] && achievements[dKey][s.id];
                      const achvLabel = theme.isMapTheme && achv ? formatAchvShort(achv) : "";
                      if (isToday) {
                        return (
                          <div key={s.id} style={styles.stampSlot}>
                            <StampCell
                              count={count}
                              color={s.color}
                              iconIndex={stableIdx}
                              label={s.name}
                              shapes={theme.shapes}
                              withFace={theme.withFace}
                              useDragonStamp={theme.isMapTheme}
                              onTap={() => onTapStamp(d, s.id)}
                              onClear={() => onClearStamp(d, s.id)}
                            />
                            {achvLabel && <div style={styles.achvMiniLabel}>{achvLabel}</div>}
                          </div>
                        );
                      }
                      const isPastMiss = dKey < todayKey && count === 0;
                      const isFuture = dKey > todayKey;
                      return (
                        <div key={s.id} style={styles.stampSlot}>
                          <HistoryCell
                            count={count}
                            color={s.color}
                            iconIndex={stableIdx}
                            label={s.name}
                            missed={isPastMiss}
                            fun={funStampFor(dKey, s.id)}
                            shapes={theme.shapes}
                            withFace={theme.withFace}
                            useDragonStamp={theme.isMapTheme}
                            onToggleFun={() => onToggleFunStamp(d, s.id)}
                            locked={locked || isFuture}
                            onTogglePast={() => onTogglePastStamp(d, s.id)}
                            onClearPast={() => onClearPastStamp(d, s.id)}
                          />
                          {achvLabel && <div style={styles.achvMiniLabel}>{achvLabel}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HistoryCell({ count, color, iconIndex, label, missed, fun, onToggleFun, onTogglePast, onClearPast, locked, shapes, withFace, useDragonStamp }) {
  // Parent has unlocked this past day: reuse the exact same tap-cycle UI as
  // today's stamp (StampCell) — tap to mark done, tap again to recover a
  // missed earlier day of this subject (shows the "×2" badge), and an
  // explicit "×" to undo a mark. Covers both the "already recorded" and
  // "not recorded yet" cases, since StampCell already branches on count.
  if (!locked) {
    return (
      <StampCell
        count={count}
        color={color}
        iconIndex={iconIndex}
        label={label}
        shapes={shapes}
        withFace={withFace}
        useDragonStamp={useDragonStamp}
        onTap={onTogglePast}
        onClear={onClearPast}
      />
    );
  }

  const real = count >= 1;
  const icon = useDragonStamp ? (
    <img src="/dragon-stamp.png" alt="" style={styles.dragonStampImg} />
  ) : (
    <StampIcon index={iconIndex} color={color} size="76%" shapes={shapes} withFace={withFace} />
  );
  const hintIdx = taskIconIndex(iconIndex, useDragonStamp, shapes ? shapes.length : 1);
  const hintIcon = (
    <span style={styles.stampHintIcon}>
      <StampIcon index={hintIdx} color={color} size="72%" shapes={shapes} withFace={false} />
    </span>
  );

  if (real) {
    // Locked (everyday/kid view) — a genuine past completion, shown vivid, not editable.
    return (
      <div
        style={{
          ...styles.stampCircle,
          cursor: "default",
          borderColor: color,
          borderStyle: "solid",
          background: color + "22",
        }}
      >
        {icon}
        {count === 2 && <span style={styles.x2Badge}>×2</span>}
      </div>
    );
  }

  // No real record here, still locked — a free, playful "practice" stamp the
  // child can pop on and off. Always tappable, always pale, never affects
  // real progress. Shows a faint hint icon even before tapping, so it's
  // clear which task this blank stamp belongs to.
  return (
    <button
      onClick={onToggleFun}
      style={{
        ...styles.stampCircle,
        borderColor: fun ? color : missed ? "#F4C95D" : "#dbe8ee",
        background: fun ? color + "18" : "#fff",
      }}
      aria-label={`${label} れんしゅうスタンプ`}
    >
      {fun ? (
        useDragonStamp ? (
          <img src="/dragon-stamp.png" alt="" style={{ ...styles.dragonStampImg, opacity: 0.55 }} />
        ) : (
          <StampIcon index={iconIndex} color={color} size="72%" shapes={shapes} withFace={false} />
        )
      ) : (
        hintIcon
      )}
    </button>
  );
}

function TreasureChestMini({ filled }) {
  const wood = filled ? "#8B5A2B" : "rgba(62,42,22,0.25)";
  const woodDark = filled ? "#5C3A1A" : "rgba(62,42,22,0.22)";
  const metal = filled ? "#E5C878" : "rgba(62,42,22,0.3)";
  const metalDark = filled ? "#B8934A" : "rgba(62,42,22,0.28)";
  return (
    <svg width="22" height="20" viewBox="0 0 22 20" style={{ flexShrink: 0 }}>
      {/* domed lid */}
      <path d="M2 9c0-4.4 4-7.5 9-7.5s9 3.1 9 7.5z" fill={wood} />
      <path d="M6.8 3.3c-1.4 1.5-2.2 3.4-2.4 5.7M15.2 3.3c1.4 1.5 2.2 3.4 2.4 5.7" stroke={woodDark} strokeWidth="0.5" fill="none" opacity="0.6" />
      <path d="M11 2v7" stroke={woodDark} strokeWidth="0.5" opacity="0.4" />
      <rect x="2" y="7.3" width="18" height="1.8" fill={metal} />
      {/* body */}
      <rect x="1.3" y="9" width="19.4" height="9.7" rx="1.8" fill={wood} />
      <path d="M6.2 9.3v9.2M11 9.3v9.2M15.8 9.3v9.2" stroke={woodDark} strokeWidth="0.5" opacity="0.45" />
      <rect x="1.3" y="9" width="19.4" height="1.7" fill={metal} />
      <rect x="1.3" y="16.2" width="19.4" height="1.7" fill={metal} />
      {/* rivets */}
      <circle cx="2.8" cy="9.85" r="0.55" fill={metalDark} />
      <circle cx="19.2" cy="9.85" r="0.55" fill={metalDark} />
      <circle cx="2.8" cy="17.05" r="0.55" fill={metalDark} />
      <circle cx="19.2" cy="17.05" r="0.55" fill={metalDark} />
      {/* lock plate */}
      <rect x="9" y="7.8" width="4" height="5.2" rx="1" fill={metal} stroke={metalDark} strokeWidth="0.4" />
      <circle cx="11" cy="10.2" r="0.85" fill={metalDark} />
      {filled && (
        <>
          <circle cx="11" cy="3.5" r="1.1" fill="#FFF3C4" opacity="0.95" />
          <path d="M3.5 20l1-2.2M18.5 20l-1-2.2" stroke="#F4C95D" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
        </>
      )}
    </svg>
  );
}

function WeekdayShield({ label, color, iconIndex, shapes }) {
  return (
    <div style={styles.weekdayShieldWrap}>
      <div style={styles.weekdayShieldFrame}>
        <svg width="100%" height="100%" viewBox="0 0 40 46" preserveAspectRatio="xMidYMid meet">
          <path d="M20 2l17 6v9c0 12-7 19.5-17 24C10 37.5 3 30 3 17V8z" fill={color} stroke="#2A1A0D" strokeWidth="1.5" />
        </svg>
      </div>
      <div style={styles.weekdayShieldContent}>
        <span style={styles.weekdayShieldLabel}>{label}</span>
        <StampIcon index={iconIndex} color="#fff" size={22} shapes={shapes} withFace={false} />
      </div>
    </div>
  );
}

function StampCell({ count, color, iconIndex, label, onTap, onClear, shapes, withFace, useDragonStamp }) {
  const [popKey, setPopKey] = useState(0);
  const [comment, setComment] = useState(null);
  const prevCount = useRef(count);
  const timerRef = useRef(null);

  useEffect(() => {
    if (count > prevCount.current) {
      setPopKey((k) => k + 1);
      setComment(count === 2 ? "2日分 取り戻した！" : CHEERS[Math.floor(Math.random() * CHEERS.length)]);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setComment(null), 1300);
    }
    prevCount.current = count;
  }, [count]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div style={styles.stampCellWrap}>
      <button
        onClick={onTap}
        style={{
          ...styles.stampCircle,
          borderColor: color,
          background: count >= 1 ? color + "22" : "#ffffff",
        }}
        aria-label={`${label} スタンプ`}
      >
        {count >= 1 ? (
          <span key={popKey} style={styles.stampPopWrap}>
            {useDragonStamp ? (
              <img src="/dragon-stamp.png" alt="" style={styles.dragonStampImg} />
            ) : (
              <StampIcon index={iconIndex} color={color} size="78%" shapes={shapes} withFace={withFace} />
            )}
          </span>
        ) : (
          <span style={styles.stampHintIcon}>
            <StampIcon
              index={taskIconIndex(iconIndex, useDragonStamp, shapes ? shapes.length : 1)}
              color={color}
              size="72%"
              shapes={shapes}
              withFace={false}
            />
          </span>
        )}
        {count === 2 && <span style={styles.x2Badge}>×2</span>}
        {comment && <span style={styles.commentBubble}>{comment}</span>}
      </button>
      {count >= 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          style={styles.undoBadge}
          aria-label={`${label} スタンプを取り消す`}
          title="取り消す"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ---------------- Overlays ---------------- */

function ConfirmModal({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <h3 style={styles.modalTitle}>{title}</h3>
        <p style={styles.modalMsg}>{message}</p>
        <div style={styles.modalBtns}>
          <button style={styles.modalCancel} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button style={danger ? styles.modalDanger : styles.modalConfirm} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PinModal({ correctPin, onSuccess, onFail, onCancel }) {
  const [val, setVal] = useState("");
  const [failCount, setFailCount] = useState(0);
  const [showHint, setShowHint] = useState(false);

  function submit() {
    if (val === correctPin || val === MASTER_PIN) {
      onSuccess();
    } else {
      onFail();
      setVal("");
      setFailCount((n) => {
        const next = n + 1;
        if (next >= 3) setShowHint(true);
        return next;
      });
    }
  }
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <h3 style={styles.modalTitle}>保護者の方へ</h3>
        <p style={styles.modalMsg}>暗証番号を入力してください</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ ...styles.input, textAlign: "center", letterSpacing: 6, fontSize: 20, marginBottom: 16 }}
          placeholder="••••"
        />
        <div style={styles.modalBtns}>
          <button style={styles.modalCancel} onClick={onCancel}>
            やめる
          </button>
          <button style={styles.modalConfirm} onClick={submit}>
            開ける
          </button>
        </div>
      </div>
      {showHint && (
        <div style={styles.modalOverlay} onClick={() => setShowHint(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>💡 ヒント</h3>
            <p style={styles.modalMsg}>部長が部下が一仕事した時にかける言葉を思い出して……</p>
            <button style={styles.modalConfirm} onClick={() => setShowHint(false)}>
              とじる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteModal({ date, initialText, initialAchievements, subjects, isMapTheme, onSave, onClose }) {
  const [text, setText] = useState(initialText || "");
  const [achv, setAchv] = useState(initialAchievements || {});
  const dLabel = `${date.getMonth() + 1}月${date.getDate()}日`;

  function setField(subjId, field, value) {
    setAchv((prev) => ({ ...prev, [subjId]: { ...(prev[subjId] || {}), [field]: value } }));
  }

  const measurableSubjects = isMapTheme ? (subjects || []).filter(subjectIsMeasurable) : [];

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <h3 style={styles.modalTitle}>📝 {dLabel} の記録</h3>

        {measurableSubjects.length > 0 && (
          <div style={styles.achievementSection}>
            <p style={styles.achievementSectionLabel}>実際にどれだけできた？</p>
            {measurableSubjects.map((s) => (
              <div key={s.id} style={styles.achievementSubjectRow}>
                <div style={{ ...styles.achievementSubjectName, color: s.color }}>{s.name}</div>
                <div style={styles.achievementFieldsRow}>
                  {s.measureTime && (
                    <label style={styles.achievementField}>
                      ⏱
                      <input
                        type="number"
                        min={0}
                        placeholder={String(s.targetMinutes || 30)}
                        value={achv[s.id]?.minutes ?? ""}
                        onChange={(e) => setField(s.id, "minutes", e.target.value)}
                        style={styles.achievementInput}
                      />
                      分
                    </label>
                  )}
                  {s.measurePages && (
                    <label style={styles.achievementField}>
                      📖
                      <input
                        type="number"
                        min={0}
                        placeholder={String(s.targetPages || 5)}
                        value={achv[s.id]?.pages ?? ""}
                        onChange={(e) => setField(s.id, "pages", e.target.value)}
                        style={styles.achievementInput}
                      />
                      ページ
                    </label>
                  )}
                  {s.measureProblems && (
                    <label style={styles.achievementField}>
                      ✏️
                      <input
                        type="number"
                        min={0}
                        placeholder={String(s.targetProblems || 10)}
                        value={achv[s.id]?.problems ?? ""}
                        onChange={(e) => setField(s.id, "problems", e.target.value)}
                        style={styles.achievementInput}
                      />
                      問
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={styles.modalMsg}>やったこと・感想を書いておこう</p>
        <textarea
          autoFocus={measurableSubjects.length === 0}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例）今日はスラスラ弾けた！楽しかった。"
          style={styles.noteTextarea}
          rows={4}
        />
        <div style={styles.modalBtns}>
          <button style={styles.modalCancel} onClick={onClose}>
            とじる
          </button>
          <button style={styles.modalConfirm} onClick={() => onSave(text, achv)}>
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordsListModal({ entries, subjects, onClose }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.recordsListCard}>
        <h3 style={styles.modalTitle}>📋 きろく一覧</h3>
        {entries.length === 0 ? (
          <p style={styles.modalMsg}>まだ記録がありません。日付の「📝メモ」から書いてみよう！</p>
        ) : (
          <div style={styles.recordsListScroll}>
            {entries.map((e) => {
              const achvParts = [];
              if (e.achv) {
                Object.entries(e.achv).forEach(([subjId, vals]) => {
                  const s = subjects.find((x) => x.id === subjId);
                  if (!s) return;
                  const parts = [];
                  if (vals.minutes) parts.push(`⏱${vals.minutes}分`);
                  if (vals.pages) parts.push(`📖${vals.pages}ページ`);
                  if (vals.problems) parts.push(`✏️${vals.problems}問`);
                  if (parts.length > 0) achvParts.push({ name: s.name, color: s.color, text: parts.join(" ") });
                });
              }
              return (
                <div key={e.dKey} style={styles.recordEntryCard}>
                  <div style={styles.recordEntryDate}>
                    {e.date.getMonth() + 1}月{e.date.getDate()}日
                  </div>
                  {achvParts.map((a) => (
                    <div key={a.name} style={{ ...styles.recordEntryAchv, color: a.color }}>
                      {a.name}：{a.text}
                    </div>
                  ))}
                  {e.note && <div style={styles.recordEntryNote}>{e.note}</div>}
                </div>
              );
            })}
          </div>
        )}
        <button style={{ ...styles.modalConfirm, width: "100%" }} onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}

function DayCelebration({ onClose, theme }) {
  useEffect(() => {
    const t = setTimeout(onClose, 1800);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={styles.dayCelebrateOverlay} onClick={onClose}>
      <div style={styles.dayCelebrateBadge}>
        <span style={{ fontSize: 46 }}>{theme === "boy" ? "⚔️" : "🐚"}</span>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0B3D62", marginTop: 4 }}>今日は全部できたね！</div>
      </div>
    </div>
  );
}

function ScheduleCompleteCelebration({ onClose, title, reward, theme, variantKey, awarded }) {
  const variant = getVariant(theme, variantKey);
  return (
    <div style={styles.weekCelebrateOverlay}>
      <Confetti />
      <div style={styles.weekCelebrateCard}>
        {theme === "boy" ? (
          <img src="/dragon-face.png" alt="ドラゴン" style={styles.celebrateDragonImg} />
        ) : (
          <div style={styles.chestEmoji}>🎉🏆🎉</div>
        )}
        <h2 style={styles.weekCelebrateTitle}>全部達成！！</h2>
        <p style={styles.weekCelebrateSub}>{title} 最後まで、本当によく頑張ったね！</p>
        {awarded && (
          <div style={styles.cardGetBox}>
            <div style={styles.cardGetLabel}>🎴 カードげっと！</div>
            <div
              style={{
                ...styles.cardGetImgWrap,
                background: variant.cardBg,
              }}
            >
              <img
                src={finalFormImage(theme, variantKey)}
                alt={variant.name}
                style={{
                  ...styles.cardGetImg,
                  filter: variant.filter === "none" ? "none" : variant.filter,
                }}
              />
            </div>
            <div style={styles.cardGetName}>{variant.name}</div>
          </div>
        )}
          <div style={styles.rewardCard}>
            <div style={styles.rewardLabel}>🎁 ご褒美</div>
            <div style={styles.rewardText}>{reward}</div>
          </div>
        ) : (
          <div style={styles.bigStamp}>PERFECT!</div>
        )}
        <button style={styles.weekCelebrateBtn} onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 26 });
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const dur = 2.2 + Math.random() * 1.4;
        const color = PASTELS[i % PASTELS.length].hex;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              top: -20,
              left: `${left}%`,
              width: 9,
              height: 9,
              borderRadius: i % 2 === 0 ? "50%" : 2,
              background: color,
              animation: `confettiFall ${dur}s ease-in ${delay}s forwards`,
              opacity: 0.95,
            }}
          />
        );
      })}
    </div>
  );
}

function CornerArt({ theme, pct, variantKey }) {
  if (theme === "boy") return <DragonCornerArt pct={pct} variantKey={variantKey} />;
  const variant = getVariant("girl", variantKey);
  const colorFilter = variant.filter;
  return (
    <>
      {/* growth-stage mascot (pegasus / fairy / magical cat depending on
          the schedule's rolled variant) — grows through stages with
          progress, sits in the open space below the トップへ button */}
      <div
        style={{
          position: "absolute",
          top: 108,
          right: 14,
          width: 120,
          height: 120,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <img
          src={stageImage(variant.species, pct)}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center top",
            filter:
              colorFilter === "none"
                ? "drop-shadow(0 4px 8px rgba(11,61,98,0.3))"
                : `${colorFilter} drop-shadow(0 4px 8px rgba(11,61,98,0.3))`,
          }}
        />
      </div>
      <svg style={{ position: "absolute", top: 6, right: -10, opacity: 0.5 }} width="150" height="90" viewBox="0 0 150 90">
        <path d="M10 45c20-30 60-38 100-25 15 5 25 13 30 22-8 6-20 10-32 8 3 6 3 12 0 17-10-2-18-8-22-16-20 10-52 8-76-6z" fill="#EAF7FB" />
        <circle cx="45" cy="42" r="2.4" fill="#0B3D62" />
      </svg>
      <svg style={{ position: "absolute", bottom: 10, right: -6, opacity: 0.55 }} width="110" height="90" viewBox="0 0 110 90">
        <ellipse cx="55" cy="45" rx="40" ry="30" fill="#CFF3DE" />
        <path d="M20 45c-8 0-14 6-14 6s8 4 16 2M90 45c8 0 14 6 14 6s-8 4-16 2" stroke="#CFF3DE" strokeWidth="6" fill="none" strokeLinecap="round" />
      </svg>
      <svg style={{ position: "absolute", bottom: 4, left: -6, opacity: 0.55 }} width="90" height="80" viewBox="0 0 90 80">
        <path d="M15 65h60l-6-28c-3-14-16-24-30-24S12 23 9 37z" fill="#F4C95D" />
        <rect x="14" y="60" width="62" height="10" rx="4" fill="#E0A83E" />
      </svg>
      <svg style={{ position: "absolute", top: "38%", left: -14, opacity: 0.35 }} width="70" height="140" viewBox="0 0 70 140">
        <path d="M35 0c15 20 15 40 0 60s-15 40 0 60" stroke="#fff" strokeWidth="3" fill="none" />
      </svg>
    </>
  );
}

function MapDoodles() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.16, pointerEvents: "none" }}
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* dotted trail */}
      <path
        d="M20 320c40-20 60-60 100-70s70 20 110 0 90-70 150-60"
        stroke="#3E2415"
        strokeWidth="3"
        strokeDasharray="1 12"
        strokeLinecap="round"
        fill="none"
      />
      {/* mountains */}
      <path d="M60 260l30-40 22 26 26-34 30 48z" fill="#3E2415" />
      {/* big compass watermark */}
      <circle cx="300" cy="120" r="60" fill="none" stroke="#3E2415" strokeWidth="2" />
      <path d="M300 68l7 45-7 7-7-7zM300 172l7-45-7-7-7 7z" fill="#3E2415" />
      <path d="M248 120l45-7 7 7-7 7zM352 120l-45-7-7 7 7 7z" fill="#3E2415" opacity="0.7" />
      {/* X marks the spot */}
      <path d="M110 130l20 20M130 130l-20 20" stroke="#3E2415" strokeWidth="4" strokeLinecap="round" />
      {/* wavy sea lines */}
      <path d="M0 60c20 8 40-8 60 0s40 8 60 0 40-8 60 0" stroke="#3E2415" strokeWidth="2" fill="none" />
    </svg>
  );
}

function dragonStageImage(pct) {
  if (pct >= 90) return "/master.png";
  if (pct >= 70) return "/adult.png";
  if (pct >= 50) return "/kids.png";
  if (pct >= 30) return "/infant.png";
  if (pct >= 10) return "/baby.png";
  return "/egg.png";
}

function DragonCornerArt({ pct, variantKey }) {
  const colorFilter = getVariant("boy", variantKey).filter;
  const shadow = "drop-shadow(0 4px 8px rgba(0,0,0,0.35))";
  return (
    <>
      {/* dragon illustration — grows through stages with progress. Sits in
          the open space on the right, below the LINE/コピー buttons.
          Fixed-size box + object-fit keeps every stage (even the taller egg)
          the same footprint. */}
      <div
        style={{
          position: "absolute",
          top: 108,
          right: 14,
          width: 130,
          height: 130,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <img
          src={dragonStageImage(pct)}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center top",
            opacity: 0.9,
            filter: colorFilter === "none" ? shadow : `${colorFilter} ${shadow}`,
          }}
        />
      </div>
      {/* compass rose, top right */}
      <svg style={{ position: "absolute", top: 10, right: 8, opacity: 0.55 }} width="70" height="70" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r="26" fill="none" stroke="#C89B3C" strokeWidth="2" />
        <path d="M35 12l5 20-5 3-5-3zM35 58l5-20-5-3-5 3z" fill="#C89B3C" />
        <path d="M12 35l20-5 3 5-3 5zM58 35l-20-5-3 5 3 5z" fill="#C89B3C" opacity="0.8" />
      </svg>
      {/* rising embers, bottom right */}
      <svg style={{ position: "absolute", bottom: 6, right: -4, opacity: 0.7 }} width="110" height="110" viewBox="0 0 110 110">
        <path d="M55 30c5 10-8 12-8 22a8 8 0 0016 0c0-3-1-5-3-7 6 4 12 12 12 22a17 17 0 01-34 0c0-14 11-20 11-30 0-3 2-5 6-7z" fill="#B4432F" />
      </svg>
      {/* claw marks, left */}
      <svg style={{ position: "absolute", top: "58%", left: -10, opacity: 0.35 }} width="90" height="90" viewBox="0 0 90 90">
        <path d="M10 8c14 12 14 40 4 56M24 4c14 12 14 44 4 60M38 8c14 12 14 40 4 56" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      {/* scattered sparkles */}
      {[
        [18, 55], [50, 15], [78, 62], [10, 18], [60, 85], [88, 25],
      ].map(([x, y], i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: `${y}%`,
            left: i % 2 === 0 ? `${x}%` : "auto",
            right: i % 2 === 1 ? `${100 - x}%` : "auto",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#F4C95D",
            opacity: 0.6,
          }}
        />
      ))}
    </>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Yuji+Syuku&family=Kaisei+Decol:wght@400;700&family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap');
      @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(520px) rotate(340deg); opacity: 0; }
      }
      @keyframes popIn {
        0% { transform: scale(0.4); opacity: 0; }
        70% { transform: scale(1.08); opacity: 1; }
        100% { transform: scale(1); }
      }
      @keyframes bob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes stampPop {
        0% { transform: scale(0) rotate(-25deg); opacity: 0; }
        55% { transform: scale(1.35) rotate(8deg); opacity: 1; }
        75% { transform: scale(0.9) rotate(-4deg); }
        100% { transform: scale(1) rotate(0deg); }
      }
      @keyframes floatComment {
        0% { transform: translate(-50%, 4px) scale(0.6); opacity: 0; }
        15% { transform: translate(-50%, -6px) scale(1.05); opacity: 1; }
        30% { transform: translate(-50%, -10px) scale(1); opacity: 1; }
        80% { transform: translate(-50%, -22px) scale(1); opacity: 1; }
        100% { transform: translate(-50%, -34px) scale(0.9); opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; transition: none !important; }
      }
    `}</style>
  );
}

/* ---------------- styles ---------------- */

const oceanBg = "linear-gradient(180deg, #0B3D62 0%, #14588C 42%, #2E9BC7 78%, #6FCFEB 100%)";

const styles = {
  appRoot: {
    fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif",
    minHeight: 560,
    width: "100%",
    color: "#0B3D62",
    background: "#EAF7FB",
    fontSize: 19,
  },
  loadingWrap: { minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", background: oceanBg },
  loadingBubble: { width: 40, height: 40, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #fff, #6FCFEB 70%)", animation: "bob 1.2s ease-in-out infinite" },

  setupWrap: { background: oceanBg, minHeight: 560, padding: "28px 16px", display: "flex", justifyContent: "center" },
  setupCard: { background: "linear-gradient(180deg, #FFFBF3, #FFF7EC)", borderRadius: 24, padding: 24, maxWidth: 680, width: "100%", boxShadow: "0 20px 50px rgba(11,61,98,0.35)", position: "relative" },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#14588C", fontWeight: 700, cursor: "pointer", marginBottom: 8, fontFamily: "inherit", fontSize: 18 },
  setupHeading: { fontFamily: "'Kaisei Decol', serif", fontSize: 34, margin: "4px 0 2px", color: "#0B3D62" },
  setupSub: { fontSize: 17, color: "#4a6c85", marginBottom: 18 },
  profileLinkedBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "linear-gradient(135deg,#F4E2B8,#E5C878)", borderRadius: 14, padding: "10px 14px", marginBottom: 18, fontSize: 14, fontWeight: 800, color: "#5C3A21", flexWrap: "wrap" },
  profileUnlinkBtn: { border: "none", background: "rgba(255,255,255,0.5)", color: "#5C3A21", borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  profileLinkBox: { background: "#F4F9FB", border: "2px dashed #BFE3F0", borderRadius: 14, padding: 12, marginBottom: 18 },
  profileLinkLabel: { fontSize: 13.5, fontWeight: 800, color: "#14588C", marginBottom: 8 },
  profileLinkRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  profileLinkInput: { flex: "1 1 100px", padding: "8px 10px", borderRadius: 10, border: "2px solid #BFE3F0", fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box" },
  profileLinkBtn: { border: "none", borderRadius: 10, padding: "8px 14px", background: "#14588C", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  profileLinkError: { color: "#E0526B", fontSize: 12.5, marginTop: 6, marginBottom: 0 },
  label: { display: "block", fontWeight: 700, fontSize: 18, marginBottom: 8, color: "#14588C" },
  tinyNote: { fontSize: 15, color: "#7c98aa", marginTop: 6 },
  input: { width: "100%", padding: "14px 16px", borderRadius: 14, border: "2px solid #BFE3F0", fontSize: 19, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#fff" },
  dateRow: { display: "flex", alignItems: "center", gap: 10 },
  dateInput: { flex: 1, padding: "11px 12px", borderRadius: 14, border: "2px solid #BFE3F0", fontSize: 18, fontFamily: "inherit", background: "#fff" },

  subjList: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 },
  subjCard: { background: "#fff", border: "2px solid #EAF7FB", borderRadius: 16, padding: 14 },
  subjCardTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  subjNameInput: { flex: 1, border: "none", borderBottom: "2px solid #EAF7FB", padding: "5px 2px", fontSize: 19, fontWeight: 700, fontFamily: "inherit", outline: "none", color: "#0B3D62" },
  chipX: { border: "none", background: "rgba(11,61,98,0.12)", borderRadius: "50%", width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#0B3D62", flexShrink: 0 },
  swatchRow: { display: "flex", gap: 9, marginBottom: 10, flexWrap: "wrap" },
  swatch: { width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer" },
  freqRow: { display: "flex", gap: 7, marginBottom: 9, flexWrap: "wrap" },
  freqBtn: { border: "2px solid #14588C", borderRadius: 999, padding: "8px 16px", fontSize: 16.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  intervalRow: { display: "flex", alignItems: "center", gap: 8 },
  durationRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  durationSelect: { flex: 1, maxWidth: 180, padding: "12px 12px", borderRadius: 12, border: "2px solid #BFE3F0", fontSize: 19, fontFamily: "inherit", background: "#fff", color: "#0B3D62", fontWeight: 700 },
  measureSection: { marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 },
  measureSectionLabel: { fontSize: 13, color: "#4a6c85", fontWeight: 700 },
  measureRow: { display: "flex", alignItems: "center", gap: 8 },
  measureToggle: { border: "2px solid #C89B3C", borderRadius: 999, padding: "7px 14px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: "#fff", color: "#8B5E34", minWidth: 108 },
  measureToggleOn: { background: "#8B5E34", color: "#fff" },
  measureInput: { width: 72, padding: "8px 8px", borderRadius: 10, border: "2px solid #BFE3F0", fontSize: 17, fontFamily: "inherit", textAlign: "center" },
  measureSelect: { width: 80, padding: "8px 8px", borderRadius: 10, border: "2px solid #BFE3F0", fontSize: 16, fontFamily: "inherit", textAlign: "center", background: "#fff", color: "#0B3D62", fontWeight: 700 },
  measureUnit: { fontSize: 14, fontWeight: 700, color: "#4a6c85" },
  intervalInput: { width: 68, padding: "8px 8px", borderRadius: 10, border: "2px solid #BFE3F0", fontSize: 18, fontFamily: "inherit", textAlign: "center" },
  weekdayPicker: { display: "flex", gap: 6, flexWrap: "wrap" },
  weekdayToggle: { width: 42, height: 42, borderRadius: 10, border: "2px solid", cursor: "pointer", fontSize: 16, color: "#0B3D62", fontFamily: "inherit" },

  addBtn: { display: "inline-flex", alignItems: "center", gap: 4, background: "#14588C", color: "#fff", border: "none", borderRadius: 14, padding: "12px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 18, marginBottom: 20 },
  saveBtn: { width: "100%", padding: "16px 0", borderRadius: 16, border: "none", background: "linear-gradient(135deg, #FFB6C9, #F4C95D)", color: "#fff", fontWeight: 900, fontSize: 20, cursor: "pointer", boxShadow: "0 10px 20px rgba(255,143,163,0.4)", fontFamily: "inherit" },
  deleteScheduleBtn: { width: "100%", padding: "14px 0", borderRadius: 16, border: "2px solid #FBD4DB", background: "#fff", color: "#E0526B", fontWeight: 700, fontSize: 17, cursor: "pointer", fontFamily: "inherit", marginTop: 14 },

  mainWrap: { position: "relative", background: oceanBg, minHeight: 560, overflow: "hidden", paddingBottom: 30 },
  header: { position: "relative", padding: "24px 18px 16px", zIndex: 2 },
  headerTop: { display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 10, position: "relative" },
  titleBanner: { background: "#fff", borderRadius: 999, padding: "10px 22px", boxShadow: "0 8px 18px rgba(11,61,98,0.3)", maxWidth: "72%", position: "relative", zIndex: 1 },
  titleText: { fontFamily: "'Kaisei Decol', serif", color: "#0B3D62", fontSize: 24, fontWeight: 700 },
  headerBtns: { display: "flex", gap: 8, flexShrink: 0, position: "absolute", top: 0, right: 0 },
  iconBtn: { width: 46, height: 46, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.3)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" },
  editDeleteRow: { display: "flex", gap: 8, marginTop: 10, justifyContent: "center", flexWrap: "wrap" },
  editBtnSmall: { border: "2px solid rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  deleteBtnSmall: { border: "2px solid #FBAEBE", background: "rgba(224,82,107,0.25)", color: "#fff", borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  lockNote: { color: "#EAF7FB", fontSize: 16, marginTop: 10, fontWeight: 700, textAlign: "center" },

  mascotRow: { display: "flex", alignItems: "flex-start", gap: 10, marginTop: 14 },
  mascotFace: { width: 68, height: 68, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 6px 14px rgba(11,61,98,0.3)", animation: "bob 2.4s ease-in-out infinite" },
  mascotBubbleWrap: { flex: 1, minWidth: 0 },
  mascotBubble: { background: "#fff", borderRadius: 14, padding: "10px 15px", fontSize: 17, fontWeight: 800, color: "#0B3D62", display: "inline-block", boxShadow: "0 6px 14px rgba(11,61,98,0.25)" },
  todayProgressLine: { display: "flex", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" },
  todayProgressNum: { color: "#fff", fontWeight: 900, fontSize: 18, textShadow: "0 2px 6px rgba(11,61,98,0.5)" },
  streakBadge: { background: "linear-gradient(135deg,#FFB347,#FF8FA3)", color: "#fff", fontWeight: 900, fontSize: 14.5, padding: "4px 11px", borderRadius: 999, boxShadow: "0 3px 8px rgba(0,0,0,0.25)" },
  todayBarTrack: { marginTop: 6, height: 13, borderRadius: 999, background: "rgba(255,255,255,0.3)", overflow: "hidden", maxWidth: 300 },
  todayBarFill: { height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#FFD6E0,#F4C95D)", transition: "width 0.5s ease" },

  necklaceRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 14, background: "rgba(255,255,255,0.15)", padding: "12px 14px", borderRadius: 20, backdropFilter: "blur(4px)", flexWrap: "wrap", rowGap: 4 },
  pearl: { width: 20, height: 20, borderRadius: "50%", flexShrink: 0, transition: "all 0.4s" },
  pearlPct: { marginLeft: "auto", color: "#fff", fontWeight: 900, fontSize: 17 },
  pearlCount: { color: "#fff", fontWeight: 700, fontSize: 12.5, opacity: 0.9, marginTop: 1 },
  rewardPreview: { marginTop: 8, background: "rgba(255,255,255,0.18)", borderRadius: 12, padding: "8px 14px", color: "#fff", fontSize: 16, fontWeight: 700, backdropFilter: "blur(4px)", textAlign: "center" },

  subjectSummaryRow: { position: "relative", zIndex: 2, display: "flex", flexWrap: "wrap", gap: 10, padding: "0 18px", marginTop: 8, justifyContent: "center" },
  subjectSpotlight: { display: "flex", alignItems: "center", gap: 14, borderRadius: 20, padding: "14px 22px", boxShadow: "0 10px 22px rgba(11,61,98,0.3)", justifyContent: "center", flexWrap: "wrap" },
  subjectSpotlightIcon: { width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 10px rgba(0,0,0,0.2)" },
  subjectSpotlightTextWrap: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" },
  subjectSpotlightName: { fontFamily: "'Kaisei Decol', serif", fontSize: 26, fontWeight: 700, color: "#0B3D62", lineHeight: 1.2 },
  subjectSpotlightDuration: { fontSize: 16, fontWeight: 900, color: "#0B3D62", marginTop: 2 },
  subjectSpotlightFreq: { fontSize: 13.5, fontWeight: 700, color: "#3d6a86", marginTop: 2 },
  backlogBadgeBig: { fontSize: 13.5, color: "#B5651D", background: "#FFE9B3", borderRadius: 999, padding: "5px 12px", fontWeight: 800, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" },

  calendarLegendRow: { position: "relative", zIndex: 2, display: "flex", gap: 14, padding: "10px 18px 0", flexWrap: "wrap", justifyContent: "center" },
  calendarLegendItem: { display: "inline-flex", alignItems: "center", gap: 6, color: "#EAF7FB", fontSize: 13, fontWeight: 700 },
  legendDot: { width: 12, height: 12, borderRadius: "50%", display: "inline-block" },

  calendarPanel: { position: "relative", zIndex: 2, margin: "12px 18px 0", background: "linear-gradient(180deg,#FFFDF8,#FFF3E4)", borderRadius: 22, padding: 12, boxShadow: "0 16px 34px rgba(11,61,98,0.3)" },
  tableHint: { fontSize: 15, color: "#5a7d94", fontWeight: 700, margin: "0 4px 10px", textAlign: "center" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 },
  weekdayHeadCell: { textAlign: "center", fontSize: 15, fontWeight: 900, color: "#0B3D62", background: "#fff", borderRadius: 10, padding: "6px 0", boxShadow: "inset 0 0 0 2px #EAF7FB" },
  weekdayShieldWrap: { position: "relative", width: "100%", minHeight: 78, display: "flex", alignItems: "center", justifyContent: "center" },
  weekdayShieldFrame: { position: "absolute", top: "2%", left: "10%", width: "80%", height: "96%" },
  weekdayShieldContent: { position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, paddingBottom: "10%" },
  weekdayShieldLabel: { color: "#fff", fontWeight: 900, fontSize: 19, textShadow: "0 1px 3px rgba(0,0,0,0.6)" },

  dayCell: { background: "#fff", borderRadius: 12, padding: "5px 4px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, boxShadow: "inset 0 0 0 2px #EAF7FB", minWidth: 0 },
  dayCellDim: { opacity: 0.35 },
  dayCellToday: { boxShadow: "inset 0 0 0 2px #14588C" },
  dayCellComplete: { boxShadow: "inset 0 0 0 2px #F4C95D", background: "#FFF7DA" },
  dayCellTopRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 3, width: "100%", flexWrap: "wrap" },
  dayNum: { fontSize: 13, fontWeight: 800, color: "#7c98aa" },
  memoBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3, background: "#EAF7FB", border: "1px dashed #BFE3F0", color: "#7c98aa", borderRadius: 999, padding: "2px 8px", fontSize: 10.5, fontWeight: 700, cursor: "pointer", marginTop: 2 },
  memoBtnFilled: { background: "#FFF3B0", border: "1px solid #E0C24A", color: "#8a6d00" },
  dayHeadTodayTag: { fontSize: 9, color: "#fff", background: "#14588C", borderRadius: 999, padding: "1px 5px", fontWeight: 900 },
  dayHeadTrophy: { fontSize: 12 },

  headBubble: { width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 3px 6px rgba(0,0,0,0.15)" },
  headLabel: { fontSize: 17, fontWeight: 800, color: "#0B3D62", lineHeight: 1.3 },
  backlogBadge: { fontSize: 13, color: "#B5651D", background: "#FFE9B3", borderRadius: 999, padding: "2px 8px", display: "inline-block", fontWeight: 800 },
  durationBadge: { fontSize: 13, color: "#14588C", background: "#DCEEF7", borderRadius: 999, padding: "2px 8px", display: "inline-block", fontWeight: 800 },

  dayStampsRow: { display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center", width: "100%" },
  stampSlot: { flex: "1 1 0", minWidth: 26, maxWidth: 90 },
  achvMiniLabel: { fontSize: 8.5, fontWeight: 800, color: "#5C3A21", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", textAlign: "center" },
  stampCellWrap: { position: "relative", width: "100%" },
  stampCircle: { width: "100%", aspectRatio: "1", borderRadius: "50%", border: "3px dashed", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", overflow: "visible", boxSizing: "border-box" },
  stampPopWrap: { display: "flex", alignItems: "center", justifyContent: "center", animation: "stampPop 0.45s cubic-bezier(.34,1.56,.64,1)" },
  x2Badge: { position: "absolute", top: -8, right: -8, background: "#FF6B8A", color: "#fff", fontSize: 11, fontWeight: 900, borderRadius: 999, padding: "2px 6px", boxShadow: "0 2px 5px rgba(0,0,0,0.3)" },
  undoBadge: { position: "absolute", top: -8, left: -8, width: 22, height: 22, borderRadius: "50%", background: "#8aa4b4", color: "#fff", fontSize: 14, fontWeight: 900, border: "2px solid #fff", boxShadow: "0 2px 5px rgba(0,0,0,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 },
  commentBubble: { position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", background: "#fff", color: "#FF6B8A", fontSize: 12, fontWeight: 900, padding: "3px 8px", borderRadius: 999, boxShadow: "0 4px 10px rgba(0,0,0,0.2)", animation: "floatComment 1.3s ease-out forwards", pointerEvents: "none", zIndex: 5 },
  dashMark: { color: "#c9d8e0", fontSize: 15, fontWeight: 700 },

  toast: { position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)", background: "#0B3D62", color: "#fff", padding: "12px 22px", borderRadius: 999, fontSize: 17, fontWeight: 700, boxShadow: "0 10px 24px rgba(0,0,0,0.3)", zIndex: 50, maxWidth: "90%", textAlign: "center" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(11,61,98,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 20 },
  modalCard: { background: "#fff", borderRadius: 20, padding: 26, maxWidth: 360, width: "100%", textAlign: "center", animation: "popIn 0.25s ease-out" },
  modalTitle: { margin: "0 0 8px", fontSize: 22, color: "#0B3D62" },
  modalMsg: { fontSize: 17, color: "#4a6c85", lineHeight: 1.6, marginBottom: 18 },
  noteTextarea: { width: "100%", padding: "12px 14px", borderRadius: 14, border: "2px solid #BFE3F0", fontSize: 16, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#fff", resize: "vertical", marginBottom: 18, color: "#0B3D62" },
  achievementSection: { textAlign: "left", background: "#FFF7EC", border: "2px solid #F0DBA6", borderRadius: 14, padding: 12, marginBottom: 16 },
  achievementSectionLabel: { fontSize: 13, fontWeight: 800, color: "#8B5E34", margin: "0 0 8px" },
  achievementSubjectRow: { marginBottom: 8 },
  achievementSubjectName: { fontWeight: 900, fontSize: 14.5, marginBottom: 4 },
  achievementFieldsRow: { display: "flex", flexWrap: "wrap", gap: 10 },
  achievementField: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 700, color: "#5C3A21" },
  achievementInput: { width: 56, padding: "5px 6px", borderRadius: 8, border: "2px solid #E0C68A", fontSize: 14, fontFamily: "inherit", textAlign: "center" },
  recordsListCard: { background: "#fff", borderRadius: 20, padding: 24, maxWidth: 420, width: "100%", textAlign: "left", animation: "popIn 0.25s ease-out", maxHeight: "82vh", display: "flex", flexDirection: "column" },
  recordsListScroll: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, paddingRight: 2 },
  recordEntryCard: { background: "#FFF7EC", border: "2px solid #F0DBA6", borderRadius: 14, padding: "10px 14px" },
  recordEntryDate: { fontSize: 14, fontWeight: 900, color: "#8B5E34", marginBottom: 4 },
  recordEntryAchv: { fontSize: 13.5, fontWeight: 800, marginBottom: 2 },
  recordEntryNote: { fontSize: 14, color: "#4a6c85", lineHeight: 1.6, marginTop: 4, whiteSpace: "pre-wrap" },
  modalBtns: { display: "flex", gap: 10 },
  modalCancel: { flex: 1, padding: "12px 0", borderRadius: 12, border: "2px solid #d7ecf3", background: "#fff", color: "#5a7d94", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 17 },
  modalConfirm: { flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: "#14588C", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 17 },
  modalDanger: { flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: "#E0526B", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 17 },

  dayCelebrateOverlay: { position: "fixed", inset: 0, background: "rgba(11,61,98,0.25)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1210 },
  dayCelebrateBadge: { background: "#fff", borderRadius: 20, padding: "24px 34px", textAlign: "center", animation: "popIn 0.3s ease-out", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" },

  weekCelebrateOverlay: { position: "fixed", inset: 0, background: "rgba(11,61,98,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1220 },
  weekCelebrateCard: { position: "relative", background: "linear-gradient(180deg, #FFFBF3, #FFF3D6)", borderRadius: 24, padding: "34px 30px", textAlign: "center", maxWidth: 360, animation: "popIn 0.35s ease-out", boxShadow: "0 30px 60px rgba(0,0,0,0.4)" },
  chestEmoji: { fontSize: 56, marginBottom: 6 },
  celebrateDragonImg: { width: 120, height: 120, borderRadius: "50%", marginBottom: 10, boxShadow: "0 8px 20px rgba(0,0,0,0.35)" },
  dragonStampImg: { width: "82%", height: "82%", borderRadius: "50%", objectFit: "cover" },
  backfillHint: { fontSize: 20, fontWeight: 900, color: "#c9d8e0" },
  stampHintIcon: { display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.55 },
  weekCelebrateTitle: { fontFamily: "'Kaisei Decol', serif", color: "#0B3D62", fontSize: 27, margin: "4px 0" },
  weekCelebrateSub: { fontSize: 17, color: "#5a7d94", marginBottom: 16, lineHeight: 1.6 },
  bigStamp: { display: "inline-block", border: "4px solid #FF8FA3", color: "#FF8FA3", fontWeight: 900, fontSize: 26, padding: "10px 26px", borderRadius: 14, transform: "rotate(-8deg)", marginBottom: 18, fontFamily: "'Kaisei Decol', serif" },
  cardGetBox: { display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 },
  cardGetLabel: { fontSize: 14, fontWeight: 900, color: "#B5651D", marginBottom: 8 },
  cardGetImgWrap: {
    width: 112,
    height: 112,
    borderRadius: 18,
    padding: 10,
    boxShadow: "0 8px 18px rgba(0,0,0,0.25), inset 0 0 0 3px rgba(255,255,255,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardGetImg: { width: "100%", height: "100%", objectFit: "contain" },
  cardGetName: { marginTop: 8, fontSize: 16, fontWeight: 900, color: "#0B3D62", fontFamily: "'Kaisei Decol', serif" },
  rewardCard: { background: "linear-gradient(135deg,#FFF3B0,#FFD6E0)", borderRadius: 16, padding: "16px 22px", marginBottom: 18, boxShadow: "0 6px 16px rgba(0,0,0,0.15)" },
  rewardLabel: { fontSize: 15, fontWeight: 900, color: "#B5651D", marginBottom: 4 },
  rewardText: { fontSize: 21, fontWeight: 900, color: "#0B3D62", fontFamily: "'Kaisei Decol', serif", lineHeight: 1.4 },
  weekCelebrateBtn: { display: "block", margin: "0 auto", padding: "12px 32px", borderRadius: 999, border: "none", background: "#14588C", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 18 },
};
