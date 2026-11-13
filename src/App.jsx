import React, { useState, useEffect, useRef, useCallback } from "react";
import { pickRandomVariant, getVariant, finalFormImage, stageImage, stageIndex, stageImageAt, stageCount, stageLabel, computeCardStats, STAT_LABELS, STAT_KEYS, MASTER_LEVEL } from "./mascots.js";
import { computeOverallStats } from "./progress.js";
import { Lock, Unlock, Settings, Plus, X, ArrowLeft } from "lucide-react";
import { supabase } from "./db.js";
import ShareBar from "./ShareBar.jsx";
import { getScheduleIdFromUrl } from "./scheduleId.js";

const STORAGE_KEY = "pearl-sea-schedule-v2";
// Backup PIN — always accepted alongside whatever PIN the parent set, in case
// they forget their own. Intentionally not a secret kept from the parent.
const MASTER_PIN = "5963";
const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"]; // index 0=Mon ... 6=Sun

// 色の選択肢。となり同士（さくら／もも、らべんだー／らいらっく）が似すぎて
// 見分けにくかったので、色相がバラけるよう「もも」を珊瑚色に、「らいらっく」を
// ライム色に差し替えた。すでに保存済みのスケジュールの色（hex）はそのまま表示される。
const PASTELS = [
  { name: "さくら", hex: "#FFD6E0" },
  { name: "こーらる", hex: "#FFB5A8" },
  { name: "ぴーち", hex: "#FFE3C2" },
  { name: "れもん", hex: "#FFF3B0" },
  { name: "らいむ", hex: "#DDF1A6" },
  { name: "みんと", hex: "#CFF3DE" },
  { name: "そら", hex: "#C6E9F9" },
  { name: "らべんだー", hex: "#DCCBF7" },
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

// ダイエット（大人向け）テーマ用：落ち着いたグリーン〜コーラル系
const DIET_PALETTE = [
  { name: "ミント", hex: "#A8DCC4" },
  { name: "セージ", hex: "#C9DDB3" },
  { name: "アクア", hex: "#A9DCE3" },
  { name: "スカイ", hex: "#B9D3F0" },
  { name: "コーラル", hex: "#F6B9A6" },
  { name: "サンド", hex: "#EED9B4" },
  { name: "ライラック", hex: "#D4C6EC" },
  { name: "ストーン", hex: "#CBD3D1" },
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
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ maxWidth: "100%", maxHeight: "100%", flexShrink: 0 }}>
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
  diet: {
    key: "diet",
    label: "ダイエット",
    emoji: "🌿",
    bg: "linear-gradient(180deg, #1E4A3B 0%, #2C6E55 38%, #4FA283 74%, #A9DEC4 100%)",
    accentGradient: "linear-gradient(90deg,#BFE6C9,#7FCFAE)",
    palette: DIET_PALETTE,
    headingFont: "'Zen Maru Gothic', sans-serif",
    headingColor: "#1E4A3B",
    headingShadow: "none",
    mascotBg: "#DFF3E6",
    mascotIconIndex: 0,
    shapes: SHAPES,
    withFace: false,
    headerTextColor: "#F0FAF4",
    overlayBg: "rgba(255,255,255,0.15)",
    isMapTheme: false,
  },
};

// スケジュールのテーマ（スタンプ帳の種類）として有効なキー
const THEME_KEYS = ["girl", "boy", "diet"];

const THEME_NAMES = { girl: "女の子", boy: "男の子", diet: "ダイエット" };

// スケジュールをスタンプ帳につなげられるか。大人用（ダイエット）スケジュールは
// どの種類のスタンプ帳にもつなげられる（ためたスター・ファミリアをそのまま使えるように）。
// 大人用スタンプ帳には女の子／男の子デザインのスケジュールもつなげられる。
// 子ども用スタンプ帳には同じ種類（と大人用）だけ。

function canLinkTheme(bookGender, scheduleTheme) {
  if (!bookGender) return true;
  if (scheduleTheme === "diet") return true;
  if (bookGender === "diet") return true; // 大人用スタンプ帳には子ども用デザインのスケジュールもつなげられる
  return bookGender === scheduleTheme;
}

function getTheme(key) {
  return THEMES[key] || THEMES.girl;
}

const CHEERS = ["やったね！", "すごいね！", "よくできました！", "ピカピカ★", "偉いね！", "ナイス！", "完璧！"];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// parentComments used to store one plain string per date (a single parent
// comment). It's now a list per date, since a grandparent or tutor might
// also want to leave one — this upgrades any old-format string found in
// storage into a one-item list instead of breaking on it.
function normalizeParentComments(raw) {
  const out = {};
  Object.entries(raw || {}).forEach(([k, v]) => {
    if (Array.isArray(v)) out[k] = v;
    else if (typeof v === "string" && v.trim()) out[k] = [{ id: uid(), name: "保護者", text: v }];
  });
  return out;
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

// ファミリア（卵・キャラクター）が登場し、カードがもらえる条件：
// スケジュールが30日以上 かつ「やること」が2つ以上。満たさないスケジュールではキャラは表示されない。
const MIN_CARD_DAYS = 30;
const MIN_CARD_SUBJECTS = 2;
function isCardEligibleConfig(config) {
  const sd = parseDate(config.startDate);
  const ed = parseDate(config.endDate);
  if (!sd || !ed) return false;
  const days = Math.round((ed.getTime() - sd.getTime()) / 86400000) + 1;
  return days >= MIN_CARD_DAYS && (config.subjects || []).length >= MIN_CARD_SUBJECTS;
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
  // measureTime defaults on — older schedules (from before pages/problems
  // existed) never set this explicitly, so treat "not explicitly off" as on
  // rather than requiring a truthy value.
  if (subject.measureTime !== false) parts.push(`⏱${fmtMinSec(subject.targetMinutes || subject.durationMinutes || 30)}`);
  if (subject.measurePages) parts.push(`📖${subject.targetPages || 5}ページ`);
  if (subject.measureProblems) parts.push(`✏️${subject.targetProblems || 10}問`);
  if (subject.measureDistance) parts.push(`🏃${subject.targetKm ?? 3}km`);
  if (subject.exType === "strength" && strengthItems(subject).length) {
    strengthItems(subject)
      .filter((x) => (x.part || "").trim())
      .forEach((x) => parts.push(`💪${x.part}${x.reps ? " " + x.reps + "回" : ""}`));
  } else if (subject.measureCustom) parts.push(`${subject.exType === "strength" ? "💪" : "🎯"}${customGoalText(subject, subject.targetCustom)}`);
  if (Number(subject.perSteps) > 0 && subject.exType === "other") parts.push(`👟${Number(subject.perSteps).toLocaleString()}歩`);
  if (Number(subject.perKcal) > 0) parts.push(`🔥${Number(subject.perKcal).toLocaleString()}kcal`);
  return parts;
}

// 自由目標（項目名・数・単位を自由に決められる目標）の表示用テキスト。例：「なわとび 50回」
function customGoalText(subject, amount) {
  const label = (subject.customLabel || "").trim();
  const unit = (subject.customUnit || "").trim();
  const n = amount === "" || amount === null || amount === undefined ? "" : amount;
  return `${label ? label + " " : ""}${n}${unit}`;
}

function subjectIsMeasurable(subject) {
  return !!(subject.measureTime !== false || subject.measurePages || subject.measureProblems || subject.measureDistance || subject.measureCustom);
}

// 大人用：やることの種類（選ぶと目標の入力欄が切り替わる）
const EX_TYPES = [
  { k: "", label: "自由" },
  { k: "strength", label: "💪 筋トレ", name: "筋トレ" },
  { k: "walk", label: "🚶 ウォーキング", name: "ウォーキング" },
  { k: "run", label: "🏃 ランニング", name: "ランニング" },
  { k: "other", label: "🏋️ その他トレーニング", name: "トレーニング" },
];
// 筋トレの部位（グループごと）。リストにない部位は「自由入力」で入れる
const BODY_PART_GROUPS = [
  { g: "胸", parts: ["大胸筋（上部）", "大胸筋（中部）", "大胸筋（下部）"] },
  { g: "背中", parts: ["広背筋", "僧帽筋", "大円筋", "脊柱起立筋"] },
  { g: "肩", parts: ["三角筋（前部）", "三角筋（中部）", "三角筋（後部）"] },
  { g: "腕", parts: ["上腕二頭筋", "上腕三頭筋", "前腕"] },
  { g: "体幹", parts: ["腹直筋", "腹斜筋", "腹横筋"] },
  { g: "お尻", parts: ["大臀筋", "中臀筋"] },
  { g: "脚", parts: ["大腿四頭筋", "ハムストリングス", "内転筋", "ふくらはぎ"] },
  { g: "その他", parts: ["全身", "有酸素（HIIT など）"] },
];
const CUSTOM_GROUP = "自由入力";

// 筋トレ：部位ごとの行（{ id, group, part, reps }）。古い形（exParts だけ）からも作る
function strengthItems(subject) {
  if (Array.isArray(subject.exItems) && subject.exItems.length) return subject.exItems;
  const parts = subject.exParts || [];
  return parts.map((p, i) => {
    const grp = BODY_PART_GROUPS.find((g) => g.parts.includes(p));
    return { id: "p" + i, group: grp ? grp.g : CUSTOM_GROUP, part: p, reps: Number(subject.targetCustom) || "" };
  });
}

// 部位の行から、表示用のラベル・回数の合計をまとめて返す
function strengthDerived(items) {
  const named = items.filter((x) => (x.part || "").trim());
  return {
    exItems: items,
    exParts: named.map((x) => x.part),
    customLabel: named.map((x) => x.part).join("・") || "筋トレ",
    targetCustom: named.reduce((a, x) => a + (Number(x.reps) || 0), 0),
  };
}

// 分（小数で秒を含む）を「35分30秒」の形に
function fmtMinSec(min) {
  const total = Math.round((Number(min) || 0) * 60);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return sec ? `${m}分${sec}秒` : `${m}分`;
}

function formatAchvShort(vals, subject) {
  const parts = [];
  if (vals.minutes) parts.push(`⏱${fmtMinSec(vals.minutes)}`);
  if (vals.pages) parts.push(`📖${vals.pages}p`);
  if (vals.problems) parts.push(`✏️${vals.problems}問`);
  if (vals.km) parts.push(`🏃${vals.km}km`);
  if (vals.steps) parts.push(`👟${Number(vals.steps).toLocaleString()}歩`);
  if (vals.kcal) parts.push(`🔥${Number(vals.kcal).toLocaleString()}kcal`);
  if (vals.custom) parts.push(`🎯${vals.custom}${(subject && subject.customUnit) || ""}`);
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
const BIRTH_YEAR_OPTIONS = Array.from({ length: 97 }, (_, i) => 2026 - i); // 2026 down to 1930（保護者のダイエット用スタンプ帳にも対応）
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

// Default schedule length: one month from the start date, inclusive — e.g.
// starting 9/1 defaults to ending 9/30, starting 9/10 defaults to 10/9.
function defaultEndDateFor(startStr) {
  const d = parseDate(startStr) || new Date();
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + 1);
  nd.setDate(nd.getDate() - 1);
  return dateKey(nd);
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
  measureDistance: false,
  targetKm: 3,
  measureCustom: false,
  customLabel: "",
  customUnit: "",
  targetCustom: "",
});

function freshConfig() {
  return {
    title: "",
    theme: "girl",
    startDate: todayStr(),
    endDate: defaultEndDateFor(todayStr()),
    subjects: [DEFAULT_SUBJECT()],
    pin: "",
    reward: "",
  };
}

// A parent unlocking one schedule (by PIN, or by confirm when no PIN is set)
// also unlocks any other schedule on this device that uses the exact same
// PIN, for the same few minutes — so stamping several schedules back-to-back
// (e.g. every night) doesn't mean re-entering the same PIN each time. A
// schedule with a different PIN still prompts normally; this never widens
// what a correct entry unlocks, only how many open schedules it reaches.
const SHARED_UNLOCK_KEY = "ganbari_shared_unlock";

function readSharedUnlock() {
  try {
    const raw = localStorage.getItem(SHARED_UNLOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.expiresAt !== "number") return null;
    if (Date.now() >= parsed.expiresAt) return null;
    return parsed; // { pin, expiresAt }
  } catch (e) {
    return null;
  }
}

function writeSharedUnlock(pin, expiresAt) {
  try {
    localStorage.setItem(SHARED_UNLOCK_KEY, JSON.stringify({ pin: pin || "", expiresAt }));
  } catch (e) {}
}

// エクセルのシートのような、画面下のスケジュール切り替えタブ
// 同じスタンプ帳の進行中スケジュールを並べ、タップでそのスケジュールに移動する
function ScheduleTabs({ tabs, currentId, profileId, profileName }) {
  const activeRef = useRef(null);
  const rowRef = useRef(null);
  useEffect(() => {
    // 今のタブが見えるように横スクロール（ページ自体は動かさない）
    const row = rowRef.current, el = activeRef.current;
    if (row && el) row.scrollLeft = Math.max(0, el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2);
  }, [currentId, tabs.length]);
  const base = window.location.pathname;
  const tabStyle = (active) => ({
    flexShrink: 0,
    maxWidth: 180,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    padding: "9px 14px",
    borderRadius: "0 0 12px 12px",
    fontSize: 13,
    fontWeight: 800,
    textDecoration: "none",
    background: active ? "#fff" : "rgba(255,255,255,0.18)",
    color: active ? "#0B3D62" : "#fff",
    borderTop: active ? "3px solid #F4C95D" : "3px solid transparent",
    boxShadow: active ? "0 4px 10px rgba(0,0,0,0.25)" : "none",
  });
  const icon = (t) => (t === "boy" ? "🐉" : t === "diet" ? "🌿" : "🎀");
  return (
    <div style={styles.tabBar}>
      <div ref={rowRef} className="noScrollbar" style={{ position: "relative", display: "flex", gap: 4, overflowX: "auto", padding: "0 8px", alignItems: "flex-start", WebkitOverflowScrolling: "touch" }}>
        {profileId && (
          <a href={`${base}?profile=${profileId}`} style={{ ...tabStyle(false), background: "rgba(197,144,29,0.9)" }}>
            🌟 {profileName || "スタンプ帳"}
          </a>
        )}
        {tabs.map((t) => {
          const active = t.id === currentId;
          return (
            <a key={t.id} ref={active ? activeRef : null} href={active ? undefined : `${base}?id=${t.id}`} style={tabStyle(active)} aria-current={active ? "page" : undefined}>
              {icon(t.theme)} {t.title}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default function KidsScheduleApp() {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("loading");
  const [focusSubjectId, setFocusSubjectId] = useState(null);
  const [config, setConfig] = useState(freshConfig());
  const [completions, setCompletions] = useState({});
  const [recoveries, setRecoveries] = useState({});
  const [funStamps, setFunStamps] = useState({});
  // お休みスタンプ：風邪・家族旅行など、親の合意（暗証番号）のもとで押す特殊スタンプ。
  // { [dateKey]: { [subjectId]: true } }。押した日は completions にも 1 が入るので、
  // 達成率・連続日数・卵の成長にはそのまま数えられる（★だけは増やさない）。
  const [excused, setExcused] = useState({});
  // お休みスタンプを押す／取り消す操作は、ロック解除中であっても毎回
  // 暗証番号（未設定なら確認）を求める。確認待ちの操作をここに持つ。
  const [pendingExcuse, setPendingExcuse] = useState(null); // { date, subjId } | null
  const [notes, setNotes] = useState({});
  const [parentComments, setParentComments] = useState({});
  const [achievements, setAchievements] = useState({});
  const [weights, setWeights] = useState({}); // ダイエット用：{ "YYYY-MM-DD": 体重kg }
  const [calories, setCalories] = useState({}); // ダイエット用：{ "YYYY-MM-DD": 消費カロリーkcal }
  const [steps, setSteps] = useState({}); // ダイエット用：{ "YYYY-MM-DD": 歩数 }
  const [noteModalDate, setNoteModalDate] = useState(null);
  const [linkedProfile, setLinkedProfile] = useState(null); // { name, totalStamps } | null
  // 同じスタンプ帳につながっている進行中のスケジュール（下のタブで切り替える用）
  const [siblingSchedules, setSiblingSchedules] = useState([]); // [{ id, title, theme }]
  // スタンプ帳（プロフィール）に設定された保護者用暗証番号。スケジュール自身の
  // 暗証番号欄は廃止されたので、新しいスケジュールは config.pin が空になる。
  // 空のときはこちらを使う（空のままだと「はい」だけで解除できてしまうため）。
  const [profilePin, setProfilePin] = useState("");
  const effectivePin = config.pin && config.pin.length > 0 ? config.pin : profilePin;
  const [showRecordsList, setShowRecordsList] = useState(false);
  const [locked, setLocked] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  // When set, doUnlock() runs this once the PIN/confirm succeeds, then
  // clears it — lets "修正する" / settings ask for the PIN and then jump
  // straight into the edit screen, instead of only unlocking stamps.
  const pendingAfterUnlockRef = useRef(null);
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
            setExcused(data.excused || {});
            setNotes(data.notes || {});
            setParentComments(normalizeParentComments(data.parentComments));
            setAchievements(data.achievements || {});
            setWeights(data.weights || {});
            setCalories(data.calories || {});
            setSteps(data.steps || {});
            // Another schedule on this device may have just been unlocked
            // with the same PIN — if so, start unlocked here too instead of
            // prompting again, and relock at that same shared expiry time.
            const shared = readSharedUnlock();
            if (shared && shared.pin && shared.pin === (data.config.pin || "")) {
              setLocked(false);
              scheduleRelock(shared.expiresAt);
            }
            // A "?edit=1" URL flag (used by the top-page's edit button) jumps
            // straight into the setup/edit screen instead of the main view.
            // "?records=1" (used by the stamp book's "つながっているスケジュール"
            // list) opens the 記録を見る modal on top of the main view instead.
            let wantsEdit = false;
            let wantsRecords = false;
            try {
              const params = new URLSearchParams(window.location.search);
              wantsEdit = params.get("edit") === "1";
              wantsRecords = params.get("records") === "1";
            } catch (e) {}
            setView("main");
            // Route the "?edit=1" jump through the same PIN/confirm gate as
            // the in-app 修正する button and gear icon, so a direct link
            // can't skip the parent check. Checked against data.config.pin
            // directly (not the config state) since setConfig above hasn't
            // committed yet at this point in the same synchronous block.
            if (wantsEdit) {
              pendingAfterUnlockRef.current = () => setView("setup");
              if (data.config.pin && data.config.pin.length > 0) setShowPinModal(true);
              else setShowConfirmModal(true);
            } else if (wantsRecords) setShowRecordsList(true);
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
          const nextTheme = THEME_KEYS.includes(t) ? t : prev.theme;
          return {
            ...prev,
            ...(THEME_KEYS.includes(t) ? { theme: t } : {}),
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
          JSON.stringify({ config, completions, recoveries, funStamps, excused, notes, parentComments, achievements, weights, calories, steps }),
          false
        );
      } catch (e) {}
    }, 350);
    return () => clearTimeout(t);
  }, [config, completions, recoveries, funStamps, excused, notes, parentComments, achievements, weights, calories, steps, loaded]);

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
            setExcused(data.excused || {});
            setNotes(data.notes || {});
            setParentComments(normalizeParentComments(data.parentComments));
            setAchievements(data.achievements || {});
            setWeights(data.weights || {});
            setCalories(data.calories || {});
            setSteps(data.steps || {});
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

  // Names the egg once it hatches (growth stage moves past "still an egg").
  // Fires once per schedule — guarded by config.mascotHatchPrompted so it
  // never re-shows after the parent/kid has already named (or skipped
  // naming) this schedule's mascot.
  const [showHatchNaming, setShowHatchNaming] = useState(false);
  const [hatchDefaultName, setHatchDefaultName] = useState("");
  const [hatchStageIdx, setHatchStageIdx] = useState(0);
  const [hatchNamingSnoozed, setHatchNamingSnoozed] = useState(false); // "あとで" was pressed this session
  useEffect(() => {
    if (!loaded || view !== "main") return;
    if (!config.subjects || config.subjects.length === 0) return;
    if (!isCardEligibleConfig(config)) return; // 条件を満たさないスケジュールにはキャラは出ない
    if (config.mascotHatchPrompted) return;
    if (hatchNamingSnoozed) return; // wait for next app open, not this session
    const variant = getVariant(config.theme, config.mascotVariant);
    const overall = computeOverallStats(config, completions);
    const overallPct = overall.need > 0 ? Math.round((overall.done / overall.need) * 100) : 0;
    const idx = stageIndex(variant.species, overallPct);
    if (idx < 1) return;
    setHatchDefaultName(variant.name);
    setHatchStageIdx(idx);
    setShowHatchNaming(true);
  }, [loaded, view, config, completions, hatchNamingSnoozed]);

  // Plays a Pokémon-style evolution animation whenever the mascot's growth
  // stage advances past the one last shown — silhouette shake, white
  // flash, then the new stage bursts in with light rays. Guarded by
  // config.mascotStageSeen so it only fires once per stage jump, and
  // deliberately skips the very first stage (hatching), since
  // HatchNamingModal above already gives that moment its own reveal.
  const [evolution, setEvolution] = useState(null); // { fromSrc, toSrc, filter, cardBg, isFinal } | null
  const [pendingEvolution, setPendingEvolution] = useState(null); // same shape + idx, awaiting 声をかける/放っておく
  const [evolutionSnoozed, setEvolutionSnoozed] = useState(false); // "放っておく" was pressed this session
  useEffect(() => {
    if (!loaded || view !== "main") return;
    if (!config.subjects || config.subjects.length === 0) return;
    if (!isCardEligibleConfig(config)) return;
    if (!config.mascotHatchPrompted) return; // hatching not handled yet — let that effect go first
    if (pendingEvolution || evolution) return; // already showing something about this
    if (evolutionSnoozed) return; // parent chose 放っておく — wait for next app open, not this session
    const variant = getVariant(config.theme, config.mascotVariant);
    const overall = computeOverallStats(config, completions);
    const overallPct = overall.need > 0 ? Math.round((overall.done / overall.need) * 100) : 0;
    const idx = stageIndex(variant.species, overallPct);

    if (config.mascotStageSeen === undefined) {
      // Backfill for schedules that hatched before this feature existed —
      // just record the current stage as the baseline, no animation.
      setConfig((prev) => (prev.mascotStageSeen === undefined ? { ...prev, mascotStageSeen: idx } : prev));
      return;
    }
    if (idx > config.mascotStageSeen) {
      // Don't jump straight to the animation — a parent unlocking the app
      // to do something unrelated could stumble onto it before the kid
      // ever sees it. Ask first; only commit mascotStageSeen (and actually
      // play it) once someone chooses to watch now.
      setPendingEvolution({
        idx,
        fromSrc: stageImageAt(variant.species, config.mascotStageSeen),
        toSrc: stageImageAt(variant.species, idx),
        filter: variant.filter,
        cardBg: variant.cardBg,
        isFinal: idx >= stageCount(variant.species) - 1,
      });
    }
  }, [loaded, view, config, completions, pendingEvolution, evolution, evolutionSnoozed]);

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
          supabase.from("schedules").select("id, blob").eq("blob->config->>profileId", config.profileId),
        ]);
        // タブ用：進行中（達成済み・終了日を過ぎたものを除く）のスケジュール。今開いているものは必ず入れる
        const myId = getScheduleIdFromUrl();
        const today = todayStr();
        const tabs = (schedData || [])
          .filter((row) => row.blob && row.blob.config)
          .filter((row) => {
            if (row.id === myId) return true;
            const c = row.blob.config;
            const st = computeOverallStats(c, row.blob.completions);
            const done = (st.need > 0 && st.done >= st.need) || (!!c.endDate && c.endDate < today);
            return !done;
          })
          .map((row) => ({ id: row.id, title: row.blob.config.title || "無題", theme: row.blob.config.theme || "girl", start: row.blob.config.startDate || "" }))
          .sort((a, b) => (a.start === b.start ? a.title.localeCompare(b.title, "ja") : a.start < b.start ? -1 : 1));
        let total = 0;
        (schedData || []).forEach((row) => {
          const completions = (row.blob && row.blob.completions) || {};
          const rowExcused = (row.blob && row.blob.excused) || {};
          Object.entries(completions).forEach(([dKey, day]) => {
            Object.entries(day || {}).forEach(([subjId, v]) => {
              total += Math.min(2, Math.max(0, v || 0));
              // お休みスタンプは★に数えない
              if (rowExcused[dKey] && rowExcused[dKey][subjId] && (v || 0) >= 1) total -= 1;
            });
          });
        });
        total = Math.max(0, total);
        if (!cancelled) {
          setLinkedProfile({ name: (profData && profData.blob && profData.blob.name) || "", totalStamps: total });
          setSiblingSchedules(tabs);
          const pPin = (profData && profData.blob && profData.blob.pin) || "";
          setProfilePin(pPin);
          const ownPin = config.pin && config.pin.length > 0 ? config.pin : "";
          if (!ownPin && pPin) {
            // 暗証番号が分かる前に「はい」だけの確認画面を開いていたら、暗証番号入力に切り替える
            setShowConfirmModal((open) => {
              if (open) setShowPinModal(true);
              return false;
            });
            // 同じ暗証番号の別スケジュールが3分以内に解除されていたら、そのまま引き継ぐ
            const shared = readSharedUnlock();
            if (shared && shared.pin && shared.pin === pPin) {
              setLocked(false);
              scheduleRelock(shared.expiresAt);
            }
          }
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

  function isExcused(dKey, subjId) {
    return !!(excused[dKey] && excused[dKey][subjId]);
  }

  // 全体で何個のお休みスタンプが押されているか（カードの★の予算から引く用）。
  function excusedTotal() {
    let n = 0;
    Object.entries(excused).forEach(([dKey, day]) => {
      Object.keys(day || {}).forEach((subjId) => {
        if (countFor(dKey, subjId) >= 1) n += 1;
      });
    });
    return n;
  }

  // お休みスタンプのオン／オフ。親の合意が必要な特殊スタンプなので、ロック解除中
  // かどうかに関係なく、押す・取り消すたびに暗証番号（未設定なら確認）を求める。
  // 今日と過去の日のまだ押していないマスにだけ押せる。未来の日には押せない。
  function handleToggleExcused(date, subjId) {
    const dKey = dateKey(date);
    if (dKey > todayKey) return;
    if (!config.subjects.find((s) => s.id === subjId)) return;
    if (!isExcused(dKey, subjId) && countFor(dKey, subjId) !== 0) {
      showToast("すでにスタンプが押してあるよ");
      return;
    }
    setPendingExcuse({ date, subjId });
  }

  function performToggleExcused(date, subjId) {
    const dKey = dateKey(date);
    if (dKey > todayKey) return;
    const subject = config.subjects.find((s) => s.id === subjId);
    if (!subject) return;

    if (isExcused(dKey, subjId)) {
      // 取り消し：お休みの印と、それで入れた「1」を一緒に消す
      setExcused((prev) => {
        const day = { ...(prev[dKey] || {}) };
        delete day[subjId];
        return { ...prev, [dKey]: day };
      });
      setCompletions((prev) => {
        const day = { ...(prev[dKey] || {}) };
        delete day[subjId];
        return { ...prev, [dKey]: day };
      });
      showToast("お休みスタンプを取り消したよ");
      return;
    }

    if (countFor(dKey, subjId) !== 0) {
      showToast("すでにスタンプが押してあるよ");
      return;
    }

    setExcused((prev) => ({ ...prev, [dKey]: { ...(prev[dKey] || {}), [subjId]: true } }));
    setCompletions((prev) => {
      const day = { ...(prev[dKey] || {}), [subjId]: 1 };
      const updated = { ...prev, [dKey]: day };

      const need = daySubjectsFor(date).map((s) => s.id);
      const allDone = need.length > 0 && need.every((id) => (day[id] || 0) >= 1);
      if (allDone) setTimeout(() => setCelebrateDay(dKey), 50);

      const overall = computeOverallStats(config, updated);
      if (overall.need > 0 && overall.done >= overall.need) {
        setTimeout(() => setCelebrateSchedule(true), 400);
        awardCardIfNeeded(overall.need, 1);
      }
      return updated;
    });
    showToast("お休みスタンプを押したよ 🌙");
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

  // スタンプを押したら、やることの目標の値を「実際にどれだけできた？」に自動で入れる（全テーマ共通）。
  // 本人はメモで調整するだけ。メモで直すと auto が外れ、スタンプを取り消しても記録は消えない。
  function autoFillOnStamp(dKey, subject) {
    if (!subject) return;
    const v = { auto: true };
    if (subject.measureTime !== false) v.minutes = Number(subject.targetMinutes || subject.durationMinutes || 30);
    if (subject.measurePages) v.pages = Number(subject.targetPages || 5);
    if (subject.measureProblems) v.problems = Number(subject.targetProblems || 10);
    if (subject.measureCustom && subject.exType !== "strength" && Number(subject.targetCustom) > 0) v.custom = Number(subject.targetCustom);
    // ここから下は大人用（ダイエット）の項目
    if (subject.measureDistance && Number(subject.targetKm) > 0) v.km = Number(subject.targetKm);
    if (subject.exType === "other" && Number(subject.perSteps) > 0) v.steps = Number(subject.perSteps);
    if (subject.exType === "strength") {
      const items = strengthItems(subject).filter((x) => Number(x.reps) > 0);
      if (items.length) {
        v.parts = Object.fromEntries(items.map((x) => [x.id, Number(x.reps)]));
        v.custom = items.reduce((a, x) => a + Number(x.reps), 0);
      }
    }
    if (Number(subject.perKcal) > 0) v.kcal = Number(subject.perKcal);
    if (Object.keys(v).length === 1) return;
    setAchievements((prev) => {
      if (prev[dKey] && prev[dKey][subject.id]) return prev; // 手で入れた記録があれば上書きしない
      return { ...prev, [dKey]: { ...(prev[dKey] || {}), [subject.id]: v } };
    });
  }

  function autoClearOnUnstamp(dKey, subjId) {
    setAchievements((prev) => {
      if (!(prev[dKey] && prev[dKey][subjId] && prev[dKey][subjId].auto)) return prev;
      const day = { ...prev[dKey] };
      delete day[subjId];
      const next = { ...prev };
      if (Object.keys(day).length) next[dKey] = day;
      else delete next[dKey];
      return next;
    });
  }

  function handleTapStamp(date, subjId) {
    if (dateKey(date) !== todayKey) {
      showToast("スタンプは今日の分だけ押せるよ");
      return;
    }
    if (locked) {
      if (effectivePin) setShowPinModal(true);
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

    if (cur === 0 && next === 1) autoFillOnStamp(dKey, subject);
    if (next === 0) autoClearOnUnstamp(dKey, subjId);

    setCompletions((prev) => {
      const day = { ...(prev[dKey] || {}) };
      if (next === 0) delete day[subjId];
      else day[subjId] = next;
      const updated = { ...prev, [dKey]: day };

      const need = daySubjectsFor(date).map((s) => s.id);
      const allDone = need.length > 0 && need.every((id) => (day[id] || 0) >= 1);
      if (allDone) setTimeout(() => setCelebrateDay(dKey), 50);

      if (dateKey(today) === dateKey(endDate)) {
        // Whether the whole schedule counts as done — by total stamp value
        // vs. total required (see computeOverallStats), not "is every day
        // individually marked". A caught-up day (double-tap on a different
        // day, worth 2) can cover a day that's still literally blank, so
        // checking every day would miss schedules that were actually
        // finished this way.
        const overall = computeOverallStats(config, updated);
        const scheduleAllDone = overall.need > 0 && overall.done >= overall.need;
        if (scheduleAllDone) {
          setTimeout(() => setCelebrateSchedule(true), 700);
          awardCardIfNeeded(overall.need);
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
      if (effectivePin) setShowPinModal(true);
      else setShowConfirmModal(true);
      return;
    }
    const dKey = dateKey(date);
    const cur = countFor(dKey, subjId);
    if (cur === 0) return;
    const recoveryDelta = cur === 2 ? -1 : 0;
    autoClearOnUnstamp(dKey, subjId);

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

    if (cur === 0 && next === 1) autoFillOnStamp(dKey, subject);
    if (next === 0) autoClearOnUnstamp(dKey, subjId);

    setCompletions((prev) => {
      const day = { ...(prev[dKey] || {}) };
      if (next === 0) delete day[subjId];
      else day[subjId] = next;
      const updated = { ...prev, [dKey]: day };

      const need = daySubjectsFor(date).map((s) => s.id);
      const allDone = need.length > 0 && need.every((id) => (day[id] || 0) >= 1);
      if (allDone) setTimeout(() => setCelebrateDay(dKey), 50);

      // Whether the whole schedule counts as done — by total stamp value
      // vs. total required (see computeOverallStats), not "is every day
      // individually marked". A caught-up day can cover a day that's
      // still literally blank in the data.
      const overall = computeOverallStats(config, updated);
      const scheduleAllDone = overall.need > 0 && overall.done >= overall.need;
      if (scheduleAllDone) {
        setTimeout(() => setCelebrateSchedule(true), 400);
        awardCardIfNeeded(overall.need);
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
    autoClearOnUnstamp(dKey, subjId);

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
  // 30 days long AND at least 2 "やること" (subjects). Short/single-subject
  // schedules reaching 100% don't earn a card, so cards can't be farmed with
  // tiny schedules. Idempotent (checks config.awardedCard) so re-triggering
  // the "all done" check (e.g. toggling a past stamp back and forth) never
  // hands out a second card for the same schedule.
  function awardCardIfNeeded(totalStamps, pendingExcused = 0) {
    if (!isCardEligibleConfig(config)) return;
    setConfig((prev) => {
      if (prev.awardedCard) return prev;
      return {
        ...prev,
        awardedCard: {
          theme: prev.theme,
          variant: prev.mascotVariant || pickRandomVariant(prev.theme),
          earnedAt: todayStr(),
          // Stars this card was earned with — the stamp book lets the kid
          // spend these as points on whichever stats they like, so this
          // needs to be locked in at award time as their point budget.
          stars: Math.max(0, totalStamps - excusedTotal() - pendingExcused),
        },
      };
    });
  }

  function buildRecordsList() {
    const entries = [];
    // 今日まで（期間が終わっていればその最終日まで）の全日を並べる。
    // 子どものメモが無い日でも、保護者・祖父母がコメントを書けるようにするため。
    const todayKey = todayStr();
    for (let d = new Date(startDate); d.getTime() <= endDate.getTime(); d = addDays(d, 1)) {
      const dKey = dateKey(d);
      if (dKey > todayKey) break;
      const note = notes[dKey];
      const comments = parentComments[dKey] || [];
      const achv = achievements[dKey];
      const hasAchv = achv && Object.keys(achv).length > 0;
      entries.push({ date: new Date(d), dKey, note, comments, achv: hasAchv ? achv : null, weight: weights[dKey] || null, kcal: calories[dKey] || null, steps: steps[dKey] || null });
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

  // Adds one comment to a day's record — from "記録を見る", not gated by
  // the parent PIN, since grandparents/tutors reading via the share link
  // won't have it. Each reply carries its own name, so multiple people can
  // comment on the same day without overwriting each other.
  function handleAddParentComment(dKey, name, text) {
    const cleanText = (text || "").trim();
    if (!cleanText) return;
    const cleanName = (name || "").trim() || "コメント";
    setParentComments((prev) => {
      const list = prev[dKey] ? [...prev[dKey]] : [];
      list.push({ id: uid(), name: cleanName, text: cleanText, createdAt: todayStr() });
      return { ...prev, [dKey]: list };
    });
  }

  // Edits or deletes a previously-posted comment. Not gated by the parent
  // PIN — same as posting, since grandparents/tutors reading via the share
  // link don't have it either.
  function handleEditParentComment(dKey, commentId, newText) {
    const cleanText = (newText || "").trim();
    if (!cleanText) return;
    setParentComments((prev) => {
      const list = (prev[dKey] || []).map((c) => (c.id === commentId ? { ...c, text: cleanText } : c));
      return { ...prev, [dKey]: list };
    });
  }

  function handleDeleteParentComment(dKey, commentId) {
    setParentComments((prev) => {
      const list = (prev[dKey] || []).filter((c) => c.id !== commentId);
      const next = { ...prev };
      if (list.length > 0) next[dKey] = list;
      else delete next[dKey];
      return next;
    });
  }

  // ダイエット用：体重はグラフのカードから直接記録する
  function handleSaveWeight(dKey, value) {
    const w = parseFloat(value);
    setWeights((prev) => {
      const next = { ...prev };
      if (w > 0) next[dKey] = Math.round(w * 10) / 10;
      else delete next[dKey];
      return next;
    });
  }

  function handleSaveTargetWeight(value) {
    const w = parseFloat(value);
    setConfig((prev) => {
      const next = { ...prev };
      if (w > 0) next.targetWeight = Math.round(w * 10) / 10;
      else delete next.targetWeight;
      return next;
    });
  }

  // メモの保存：感想・やることごとの記録と、大人用は健康アプリの1日の合計（カロリー・歩数）
  function handleSaveNote(text, achv, kcal, stepCount) {
    if (noteModalDate && stepCount !== undefined) {
      const sKey = dateKey(noteModalDate);
      const n = Math.round(parseFloat(stepCount));
      setSteps((prev) => {
        const next = { ...prev };
        if (n > 0) next[sKey] = n;
        else delete next[sKey];
        return next;
      });
    }
    if (!noteModalDate) return;
    const dKey = dateKey(noteModalDate);
    if (kcal !== undefined) {
      const c = Math.round(parseFloat(kcal));
      setCalories((prev) => {
        const next = { ...prev };
        if (c > 0) next[dKey] = c;
        else delete next[dKey];
        return next;
      });
    }
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
          const hasAny = ["minutes", "pages", "problems", "km", "steps", "kcal", "custom"].some(
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

  function scheduleRelock(expiresAt) {
    clearTimeout(unlockTimer.current);
    const ms = Math.max(0, expiresAt - Date.now());
    unlockTimer.current = setTimeout(() => {
      setLocked(true);
      showToast("自動的にロックしました");
    }, ms);
  }

  function doUnlock() {
    setLocked(false);
    setShowConfirmModal(false);
    setShowPinModal(false);
    const pending = pendingAfterUnlockRef.current;
    pendingAfterUnlockRef.current = null;
    if (pending) {
      pending();
    } else {
      showToast("スタンプが押せるようになったよ！3分後に自動でロックします");
    }
    const expiresAt = Date.now() + 3 * 60 * 1000;
    writeSharedUnlock(effectivePin, expiresAt);
    scheduleRelock(expiresAt);
  }

  // Gate any parent-only action behind the same PIN/confirm prompt used for
  // stamps: if already unlocked, run it immediately; otherwise remember it
  // and run it once the PIN/confirm succeeds. Used for opening the edit
  // ("修正する") screen so kids can't get in from either the pencil button
  // or the header gear icon.
  function requestUnlockThen(action) {
    if (!locked) {
      action();
      return;
    }
    pendingAfterUnlockRef.current = action;
    if (effectivePin) setShowPinModal(true);
    else setShowConfirmModal(true);
  }

  function handleRelock() {
    clearTimeout(unlockTimer.current);
    setLocked(true);
    try {
      localStorage.removeItem(SHARED_UNLOCK_KEY);
    } catch (e) {}
  }

  // Delegates to progress.js so the schedule's own progress bar counts the
  // same way as everywhere else (top page, stamp book): total stamp value
  // vs. total required, not "is every day marked" — see the comment on
  // computeOverallStats for why (the catch-up double-tap needs this).
  function totalStats() {
    return computeOverallStats(config, completions);
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
    // タブを出すときは、いちばん下の内容がタブに隠れないように余白をとる
    <div style={{ ...styles.appRoot, paddingBottom: view === "main" && siblingSchedules.length >= 2 ? "calc(56px + env(safe-area-inset-bottom))" : 0 }}>
      <GlobalStyle />
      <ShareBar profileId={config.profileId} profileName={linkedProfile ? linkedProfile.name : ""} />
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
      {view === "main" && siblingSchedules.length >= 2 && (
        <ScheduleTabs tabs={siblingSchedules} currentId={getScheduleIdFromUrl()} profileId={config.profileId} profileName={linkedProfile ? linkedProfile.name : ""} />
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
              ? effectivePin
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
          weights={weights}
          calories={calories}
          steps={steps}
          onSaveWeight={handleSaveWeight}
          onSaveTargetWeight={handleSaveTargetWeight}
          onOpenNote={handleOpenNote}
          onOpenRecords={() => setShowRecordsList(true)}
          linkedProfile={linkedProfile}
          daySubjectsFor={daySubjectsFor}
          isStamped={isStamped}
          countFor={countFor}
          funStampFor={funStampFor}
          isExcused={isExcused}
          onToggleExcused={handleToggleExcused}
          missedBacklog={missedBacklog}
          onOpenSettings={() => requestUnlockThen(() => setView("setup"))}
          onEditSubject={(subjectId) =>
            requestUnlockThen(() => {
              setFocusSubjectId(subjectId);
              setView("setup");
            })
          }
          onRequestDelete={() => requestUnlockThen(() => setShowDeleteConfirm(true))}
          stats={totalStats()}
          todayStats={todayStats()}
          streak={streakDays()}
        />
      )}

      {pendingExcuse &&
        (effectivePin ? (
          <PinModal
            correctPin={effectivePin}
            onSuccess={() => {
              const p = pendingExcuse;
              setPendingExcuse(null);
              performToggleExcused(p.date, p.subjId);
            }}
            onFail={() => showToast("暗証番号が違います")}
            onCancel={() => setPendingExcuse(null)}
          />
        ) : (
          <ConfirmModal
            title="保護者の方へ"
            message="お休みスタンプは、風邪や家族旅行などで保護者の方が認めたときに使う特別なスタンプです。保護者の方が操作していますか？"
            confirmLabel="はい"
            cancelLabel="やめる"
            onConfirm={() => {
              const p = pendingExcuse;
              setPendingExcuse(null);
              performToggleExcused(p.date, p.subjId);
            }}
            onCancel={() => setPendingExcuse(null)}
          />
        ))}

      {showConfirmModal && (
        <ConfirmModal
          title="保護者の方へ"
          message="ここから先はスタンプを押せるようになります。保護者の方が操作していますか？"
          confirmLabel="はい、開けます"
          cancelLabel="やめる"
          onConfirm={doUnlock}
          onCancel={() => {
            pendingAfterUnlockRef.current = null;
            setShowConfirmModal(false);
          }}
        />
      )}

      {showPinModal && (
        <PinModal
          correctPin={effectivePin}
          onSuccess={doUnlock}
          onFail={() => showToast("暗証番号が違います")}
          onCancel={() => {
            pendingAfterUnlockRef.current = null;
            setShowPinModal(false);
          }}
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
          comments={parentComments[dateKey(noteModalDate)] || []}
          subjects={config.subjects}
          isMapTheme={getTheme(config.theme).isMapTheme}
          isDiet={config.theme === "diet"}
          trackSteps={!!config.trackSteps}
          initialCalories={calories[dateKey(noteModalDate)]}
          initialSteps={steps[dateKey(noteModalDate)]}
          onSave={handleSaveNote}
          onClose={handleCloseNote}
        />
      )}

      {showRecordsList && (
        <RecordsListModal
          entries={buildRecordsList()}
          subjects={config.subjects}
          profileId={config.profileId}
          profileName={linkedProfile ? linkedProfile.name : ""}
          onAddComment={handleAddParentComment}
          onEditComment={handleEditParentComment}
          onDeleteComment={handleDeleteParentComment}
          onClose={() => {
            setShowRecordsList(false);
            // Clear the ?records=1 flag so a later refresh doesn't reopen it.
            try {
              const url = new URL(window.location.href);
              if (url.searchParams.has("records")) {
                url.searchParams.delete("records");
                window.history.replaceState(null, "", url.toString());
              }
            } catch (e) {}
          }}
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
          stars={config.awardedCard ? config.awardedCard.stars : 0}
        />
      )}
      {showHatchNaming && (
        <HatchNamingModal
          theme={config.theme}
          variantKey={config.mascotVariant}
          defaultName={hatchDefaultName}
          onSave={(name) => {
            setConfig((prev) => ({
              ...prev,
              mascotName: (name || "").trim() || hatchDefaultName,
              mascotHatchPrompted: true,
              mascotStageSeen: hatchStageIdx,
            }));
            setShowHatchNaming(false);
          }}
          onSkip={() => {
            setShowHatchNaming(false);
            setHatchNamingSnoozed(true);
          }}
        />
      )}
      {pendingEvolution && (
        <EvolutionNoticeModal
          mascotName={config.mascotName}
          onTalk={() => {
            setEvolution(pendingEvolution);
            setConfig((prev) => ({ ...prev, mascotStageSeen: pendingEvolution.idx }));
            setPendingEvolution(null);
          }}
          onLeave={() => {
            setPendingEvolution(null);
            setEvolutionSnoozed(true);
          }}
        />
      )}
      {evolution && (
        <EvolutionCelebration
          fromSrc={evolution.fromSrc}
          toSrc={evolution.toSrc}
          filter={evolution.filter}
          cardBg={evolution.cardBg}
          isFinal={evolution.isFinal}
          stageIdx={evolution.idx}
          mascotName={config.mascotName}
          onClose={() => setEvolution(null)}
        />
      )}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

/* ---------------- Setup Screen ---------------- */

function SubjectCard({ subject, onChange, onRemove, canRemove, palette, isMapTheme, isFocused, isDiet }) {
  function set(patch) {
    onChange({ ...subject, ...patch });
  }
  // 種類を選んだら、その種類に合う目標の項目に切り替える（名前が空なら種類名を入れる）
  function chooseType(t) {
    const name = (subject.name || "").trim() ? subject.name : t.name || subject.name;
    if (t.k === "strength") {
      set({
        exType: "strength",
        name,
        measureTime: false,
        measurePages: false,
        measureProblems: false,
        measureDistance: false,
        measureCustom: true,
        customUnit: "回",
        ...strengthDerived(
          subject.exType === "strength" && strengthItems(subject).length
            ? strengthItems(subject)
            : [{ id: "p" + Date.now(), group: "胸", part: "大胸筋（中部）", reps: 20 }]
        ),
      });
    } else if (t.k === "walk" || t.k === "run") {
      set({
        exType: t.k,
        name,
        measureTime: true,
        targetMinutes: subject.targetMinutes || 30,
        measurePages: false,
        measureProblems: false,
        measureDistance: true,
        targetKm: subject.targetKm || (t.k === "run" ? 5 : 3),
        measureCustom: false,
      });
    } else if (t.k === "other") {
      set({
        exType: "other",
        name,
        measureTime: false,
        measurePages: false,
        measureProblems: false,
        measureDistance: false,
        measureCustom: true,
        customLabel: subject.exType === "other" ? subject.customLabel : "",
        customUnit: subject.exType === "other" ? subject.customUnit : "",
        targetCustom: subject.exType === "other" ? subject.targetCustom : "",
      });
    } else {
      // 自由：ほかの種類で入れた目標は消して、時間だけの状態から始める
      set({
        exType: "",
        measureTime: true,
        measureDistance: false,
        measureCustom: false,
        customLabel: "",
        customUnit: "",
        targetCustom: "",
        exItems: undefined,
        exParts: undefined,
        perKcal: "",
        perSteps: "",
      });
    }
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
      {isDiet && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", margin: "0 0 8px" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#4a6c85" }}>① 種類を選ぶ</span>
          {EX_TYPES.map((t) => {
            const on = (subject.exType || "") === t.k;
            return (
              <button
                key={t.k || "free"}
                onClick={() => chooseType(t)}
                style={{
                  border: "2px solid #4FA283",
                  borderRadius: 999,
                  padding: "5px 11px",
                  fontSize: 13,
                  fontWeight: 800,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  background: on ? "#2C8A5F" : "#fff",
                  color: on ? "#fff" : "#2C6E55",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      <div style={styles.subjCardTop}>
        <input
          value={subject.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder={isDiet ? "② 名前をつける（例：胸の日）" : "何を頑張る？（例：ピアノ）"}
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

      {isDiet && subject.exType ? (
        <ExerciseGoalPanel subject={subject} set={set} />
      ) : (
      <div style={styles.measureSection}>
        <span style={styles.measureSectionLabel}>目標（複数選べます）</span>

        <div style={styles.measureRow}>
          <button
            onClick={() => set({ measureTime: subject.measureTime === false ? true : false })}
            style={{ ...styles.measureToggle, ...(subject.measureTime !== false ? styles.measureToggleOn : {}) }}
          >
            ⏱ 時間
          </button>
          {subject.measureTime !== false && (
            <>
              <select
                value={subject.targetMinutes ?? subject.durationMinutes ?? 30}
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

        <div style={{ ...styles.measureRow, flexWrap: "wrap" }}>
          <button
            onClick={() => set({ measureCustom: !subject.measureCustom })}
            style={{ ...styles.measureToggle, ...(subject.measureCustom ? styles.measureToggleOn : {}) }}
          >
            🎯 自由に決める
          </button>
          {subject.measureCustom && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={styles.customGoalCaption}>何を数える？（任意）</span>
                <input
                  value={subject.customLabel || ""}
                  onChange={(e) => set({ customLabel: e.target.value })}
                  placeholder="例：英単語"
                  maxLength={12}
                  style={{ ...styles.measureSelect, width: "100%", boxSizing: "border-box", textAlign: "left" }}
                />
              </label>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                <label style={{ width: 80, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={styles.customGoalCaption}>目標の数</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={subject.targetCustom ?? ""}
                    onChange={(e) => set({ targetCustom: e.target.value === "" ? "" : Number(e.target.value) })}
                    placeholder="30"
                    style={{ ...styles.measureSelect, width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                <input
                  value={subject.customUnit || ""}
                  onChange={(e) => set({ customUnit: e.target.value })}
                  placeholder="語"
                  maxLength={6}
                  aria-label="単位"
                  style={{ ...styles.measureSelect, flex: 1, minWidth: 0, maxWidth: 170, width: "auto", boxSizing: "border-box" }}
                />
              </div>
            </div>
          )}
        </div>
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

// 大人用：種類（筋トレ／ウォーキング／ランニング）ごとの目標入力。
// ここで入れた値はスタンプを押すとその日の記録に自動で入り、メモで直せる。
function ExerciseGoalPanel({ subject, set }) {
  const box = { background: "#F4FAF6", borderRadius: 12, padding: "10px 12px", margin: "8px 0", border: "1.5px solid #CFE6D8" };
  const labelSt = { minWidth: 92, fontSize: 13.5, fontWeight: 700, color: "#1E4A3B", whiteSpace: "nowrap" };
  const inputSt = { ...styles.measureSelect, width: 110, minWidth: 0, boxSizing: "border-box" };
  const num = (key, unit, ph, step = 1, label) => (
    <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      {label && <span style={labelSt}>{label}</span>}
      <input
        type="number"
        inputMode={step < 1 ? "decimal" : "numeric"}
        min={0}
        step={step}
        value={subject[key] ?? ""}
        onChange={(e) => set({ [key]: e.target.value === "" ? "" : Number(e.target.value) })}
        placeholder={`例：${ph}`}
        style={inputSt}
      />
      <span style={styles.measureUnit}>{unit}</span>
    </div>
  );
  const totalSec = Math.round((Number(subject.targetMinutes) || 0) * 60);
  const mm = subject.targetMinutes === "" || subject.targetMinutes === undefined ? "" : String(Math.floor(totalSec / 60));
  const ss = subject.targetMinutes === "" || subject.targetMinutes === undefined ? "" : String(totalSec % 60);
  function setTime(m, sec) {
    if (m === "" && sec === "") return set({ targetMinutes: "" });
    const v = (parseFloat(m) || 0) + Math.min(59, parseFloat(sec) || 0) / 60;
    set({ targetMinutes: Math.round(v * 10000) / 10000 });
  }
  // ウォーキング・ランニングの時間（分＋秒）
  const timeRow = (label) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      <span style={labelSt}>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={mm}
        onChange={(e) => {
          setTime(e.target.value, ss);
          // 分を2桁入れたら秒の欄へ移る
          if (e.target.value.length >= 2) {
            const sec = e.target.parentElement && e.target.parentElement.querySelector("input[data-sec]");
            if (sec) sec.focus();
          }
        }}
        placeholder="30"
        style={{ ...inputSt, width: 70 }}
      />
      <span style={styles.measureUnit}>分</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        data-sec="1"
        value={ss}
        onChange={(e) => setTime(mm, e.target.value)}
        placeholder="0"
        style={{ ...inputSt, width: 60 }}
      />
      <span style={styles.measureUnit}>秒</span>
    </div>
  );
  const note = <div style={{ fontSize: 11.5, color: "#5d7d70", marginTop: 8 }}>スタンプを押すと、この値がその日の記録に自動で入ります（「📝 メモ」で直せます）。</div>;

  if (subject.exType === "other") {
    return (
      <div style={box}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "#2C6E55" }}>🏋️ その他トレーニング（自由に決める）</div>
        <label style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
          <span style={styles.customGoalCaption}>何を鍛える？</span>
          <input
            value={subject.customLabel || ""}
            onChange={(e) => set({ customLabel: e.target.value })}
            placeholder="例：ハッピー"
            maxLength={12}
            style={{ ...styles.measureSelect, width: "100%", boxSizing: "border-box", textAlign: "left" }}
          />
        </label>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginTop: 6 }}>
          <label style={{ width: 90, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={styles.customGoalCaption}>目標の数</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={subject.targetCustom ?? ""}
              onChange={(e) => set({ targetCustom: e.target.value === "" ? "" : Number(e.target.value) })}
              placeholder="30"
              style={{ ...styles.measureSelect, width: "100%", boxSizing: "border-box" }}
            />
          </label>
          <label style={{ width: 90, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={styles.customGoalCaption}>単位</span>
            <input
              value={subject.customUnit || ""}
              onChange={(e) => set({ customUnit: e.target.value })}
              placeholder="分"
              maxLength={6}
              style={{ ...styles.measureSelect, width: "100%", boxSizing: "border-box" }}
            />
          </label>
        </div>
        {num("perSteps", "歩", "3000", 1, "👟 歩数")}
        {num("perKcal", "kcal", "150", 1, "🔥 カロリー")}
        {note}
      </div>
    );
  }
  if (subject.exType === "strength") {
    const items = strengthItems(subject);
    const update = (next) => set(strengthDerived(next));
    const setItem = (id, patch) => update(items.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const selSt = { padding: "7px 6px", borderRadius: 10, border: "2px solid #A9DEC4", fontSize: 14, fontFamily: "inherit", background: "#fff", color: "#1E4A3B", boxSizing: "border-box" };
    return (
      <div style={box}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "#2C6E55" }}>💪 鍛える部位と回数（1回あたり）</div>
        {items.map((it) => {
          const grp = BODY_PART_GROUPS.find((g) => g.g === it.group);
          return (
            <div key={it.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 8, paddingBottom: 8, borderBottom: "1px dashed #CFE6D8" }}>
              <select
                value={it.group || ""}
                onChange={(e) => {
                  const g = BODY_PART_GROUPS.find((x) => x.g === e.target.value);
                  setItem(it.id, { group: e.target.value, part: g ? g.parts[0] : "" });
                }}
                style={{ ...selSt, width: 96 }}
                aria-label="部位"
              >
                {BODY_PART_GROUPS.map((g) => (
                  <option key={g.g} value={g.g}>
                    {g.g}
                  </option>
                ))}
                <option value={CUSTOM_GROUP}>{CUSTOM_GROUP}</option>
              </select>
              {grp ? (
                <select value={it.part} onChange={(e) => setItem(it.id, { part: e.target.value })} style={{ ...selSt, flex: "1 1 140px", minWidth: 0 }} aria-label="詳しい部位">
                  {grp.parts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={it.part || ""}
                  onChange={(e) => setItem(it.id, { part: e.target.value.slice(0, 12) })}
                  placeholder="例：腸腰筋"
                  style={{ ...selSt, flex: "1 1 140px", minWidth: 0 }}
                />
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#2C6E55" }}>回数</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={it.reps ?? ""}
                  onChange={(e) => setItem(it.id, { reps: e.target.value === "" ? "" : Number(e.target.value) })}
                  placeholder="20"
                  style={{ ...selSt, width: 64, textAlign: "center" }}
                />
                <span style={styles.measureUnit}>回</span>
              </span>
              {items.length > 1 && (
                <button
                  onClick={() => update(items.filter((x) => x.id !== it.id))}
                  aria-label="この部位を削除"
                  style={{ border: "none", background: "#E3EEF3", color: "#4a6c85", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", fontWeight: 900 }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={() => update([...items, { id: "p" + Date.now(), group: "背中", part: "広背筋", reps: "" }])}
          style={{ marginTop: 8, border: "2px dashed #4FA283", background: "#fff", color: "#2C6E55", borderRadius: 999, padding: "6px 14px", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}
        >
          ＋ 部位を追加
        </button>
        <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 700, color: "#1E4A3B" }}>🔥 筋トレ全体のカロリー</div>
        {num("perKcal", "kcal", "120", 1, "")}
        {note}
      </div>
    );
  }
  return (
    <div style={box}>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: "#2C6E55" }}>{subject.exType === "run" ? "🏃 ランニング" : "🚶 ウォーキング"}の目標（1回あたり）</div>
      {timeRow("⏱ 時間")}
      {num("targetKm", "km", subject.exType === "run" ? "5" : "3", 0.1, "🏃 距離")}
      {num("perKcal", "kcal", subject.exType === "run" ? "300" : "150", 1, "🔥 カロリー")}
      {note}
    </div>
  );
}

function SetupScreen({ initial, onSave, onCancel, hasExisting, onRequestDelete, focusSubjectId }) {
  const [title, setTitle] = useState(initial.title || "");
  const [theme, setTheme] = useState(initial.theme || "girl");
  // 女の子用／男の子用 → 大人用 への変更（保存するまでは確定しない）
  const [confirmToDiet, setConfirmToDiet] = useState(false);
  const canConvertToDiet = hasExisting && (initial.theme || "girl") !== "diet";
  const convertingToDiet = canConvertToDiet && theme === "diet";
  const [startDate, setStartDate] = useState(initial.startDate || todayStr());
  const [endDate, setEndDate] = useState(initial.endDate || defaultEndDateFor(initial.startDate || todayStr()));
  const [pin, setPin] = useState(initial.pin || "");
  const [reward, setReward] = useState(initial.reward || "");
  const [targetWeight, setTargetWeight] = useState(initial.targetWeight ? String(initial.targetWeight) : "");
  const [trackSteps, setTrackSteps] = useState(!!initial.trackSteps);
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
        if (!cancelled && data && data.blob) {
          // 性別が違うスタンプ帳にはつなげない（URLで直接指定された場合も解除）
          if (!canLinkTheme(data.blob.gender, theme)) {
            setProfileId("");
            setProfileName("");
            setLinkStatus("gendermismatch");
          } else {
            setProfileName(data.blob.name || "");
          }
        }
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
      const g = data[0].blob && data[0].blob.gender;
      if (!canLinkTheme(g, theme)) {
        setLinkStatus("gendermismatch");
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

  const [pendingLowCardSave, setPendingLowCardSave] = useState(null); // payload awaiting confirmation, or null

  function handleSave() {
    const t = title.trim() || "がんばりスケジュール";
    const cleanSubjects = subjects.filter((s) => s.name.trim().length > 0).map((s) => ({ ...s, name: s.name.trim() }));
    if (cleanSubjects.length === 0) return;
    let sd = startDate,
      ed = endDate;
    if (parseDate(ed) < parseDate(sd)) ed = sd;
    const payload = {
      ...(initial.mascotVariant ? { mascotVariant: initial.mascotVariant } : {}),
      ...(initial.awardedCard ? { awardedCard: initial.awardedCard } : {}),
      title: t,
      theme,
      startDate: sd,
      endDate: ed,
      subjects: cleanSubjects,
      pin: pin.trim(),
      reward: reward.trim(),
      ...(convertingToDiet ? { convertedFrom: initial.theme || "girl" } : initial.convertedFrom ? { convertedFrom: initial.convertedFrom } : {}),
      ...(theme === "diet" ? { trackSteps } : {}),
      ...(theme === "diet" && parseFloat(targetWeight) > 0 ? { targetWeight: Math.round(parseFloat(targetWeight) * 10) / 10 } : {}),
      ...(profileId ? { profileId } : {}),
    };

    if (!hasExisting) {
      // Only warn on brand-new schedules — someone editing an existing one
      // has already made this choice once.
      const days = Math.round((parseDate(ed).getTime() - parseDate(sd).getTime()) / 86400000) + 1;
      if (days < MIN_CARD_DAYS || cleanSubjects.length < MIN_CARD_SUBJECTS) {
        setPendingLowCardSave(payload);
        return;
      }
    }
    onSave(payload);
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
            {linkStatus === "gendermismatch" && (
              <p style={styles.profileLinkError}>
                このスタンプ帳は、{THEME_NAMES[theme] || "女の子"}用のスケジュールとは種類が違うため、つなげられません。
              </p>
            )}
          </div>
        )}

        <label style={styles.label}>タイトル</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例）祐太郎9月のチャレンジ"
          style={styles.input}
        />

        <label style={{ ...styles.label, marginTop: 14 }}>期間（いつから、いつまで）</label>
        <div style={styles.dateRow}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              const newStart = e.target.value;
              setStartDate(newStart);
              // Only for a brand-new schedule — editing an existing one
              // shouldn't silently overwrite an end date someone already
              // chose on purpose.
              if (!hasExisting) setEndDate(defaultEndDateFor(newStart));
            }}
            style={styles.dateInput}
          />
          <span style={{ color: "#4a6c85", fontWeight: 700 }}>〜</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.dateInput} />
        </div>
        {canConvertToDiet && (
          <div style={{ marginTop: 14, borderRadius: 14, padding: "10px 12px", background: convertingToDiet ? "#EAF7EE" : "#F4FAF6", border: `2px ${convertingToDiet ? "solid #9AD5AE" : "dashed #BFE6C9"}` }}>
            {convertingToDiet ? (
              <div style={{ fontSize: 13.5, color: "#1E4A3B", fontWeight: 700, lineHeight: 1.6 }}>
                🌿 大人用に変更します。下の「このスケジュールで始める」を押すと確定します。
                <button
                  onClick={() => {
                    setTheme(initial.theme || "girl");
                    setSubjects((prev) => prev.map((x, i) => ({ ...x, color: (initial.subjects && initial.subjects[i] && initial.subjects[i].color) || x.color })));
                  }}
                  style={{ marginLeft: 8, background: "none", border: "none", color: "#7c98aa", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}
                >
                  やめる
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmToDiet(true)}
                style={{ border: "none", borderRadius: 12, padding: "10px 14px", background: "linear-gradient(135deg,#4FA283,#2C8A5F)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}
              >
                🌿 大人用に変更する
              </button>
            )}
          </div>
        )}

        <label style={{ ...styles.label, marginTop: 14 }}>🎁 全部達成したときのご褒美（任意）</label>
        <input
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          placeholder="例）焼肉を食べに行く！／お小遣いをもらう！"
          style={styles.input}
        />
        {theme === "diet" && (
          <>
            <label style={{ ...styles.label, marginTop: 14 }}>⚖️ 目標体重（任意）</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="例：75.0"
                style={{ ...styles.input, width: 140 }}
              />
              <span style={{ fontWeight: 700, color: "#4a6c85" }}>kg</span>
            </div>

            <label style={{ ...styles.label, marginTop: 14 }}>📱 毎日の記録（健康アプリの1日の合計）</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#4a6c85" }}>🔥 消費カロリーは毎日記録します。</span>
              <button
                onClick={() => setTrackSteps((v) => !v)}
                style={{ ...styles.measureToggle, ...(trackSteps ? styles.measureToggleOn : {}) }}
              >
                👟 歩数も記録する
              </button>
            </div>


          </>
        )}

        <label style={{ ...styles.label, marginTop: 14 }}>やること（教科・習い事）</label>
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
              isDiet={theme === "diet"}
              isFocused={s.id === focusSubjectId}
            />
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 20 }}>
          <button style={{ ...styles.addBtn, marginBottom: 0 }} onClick={addSubject}>
            <Plus size={20} /> やることを追加
          </button>
          <button style={{ ...styles.saveBtn, width: "auto", flex: "1 1 auto", padding: "12px 18px", fontSize: 18, borderRadius: 14 }} onClick={handleSave}>
            このスケジュールで始める
          </button>
        </div>

        {(() => {
          const sdo = parseDate(startDate);
          const edo = parseDate(endDate);
          const days = sdo && edo ? Math.round((edo.getTime() - sdo.getTime()) / 86400000) + 1 : 0;
          // 保存時と同じく、名前が入っている「やること」だけを数える
          const nSubj = subjects.filter((x) => (x.name || "").trim().length > 0).length;
          const nUnnamed = subjects.length - nSubj;
          const okDays = days >= MIN_CARD_DAYS;
          const okSubj = nSubj >= MIN_CARD_SUBJECTS;
          const ok = okDays && okSubj;
          return (
            <div style={{ marginTop: 16, borderRadius: 14, padding: "12px 14px", background: ok ? "#EAF7EE" : "#FFF3E0", border: `2px solid ${ok ? "#9AD5AE" : "#F4C95D"}`, fontSize: 13, lineHeight: 1.7, color: "#4a5c66" }}>
              <div style={{ fontWeight: 800, color: ok ? "#2E7D4F" : "#8B5E34", marginBottom: 4 }}>
                {ok ? "🥚 ファミリアが登場します！" : "⚠️ このままだとファミリアは登場しません"}
              </div>
              ファミリア（キャラクター）が登場してカードがもらえるのは、次の<b>両方</b>を満たすスケジュールだけです。
              <div>{okDays ? "✅" : "❌"} 期間が{MIN_CARD_DAYS}日以上（いま{days}日）</div>
              <div>{okSubj ? "✅" : "❌"} 「やること」が{MIN_CARD_SUBJECTS}つ以上（いま{nSubj}つ）</div>
              {nUnnamed > 0 && (
                <div style={{ color: "#B4432F", fontWeight: 700 }}>
                  ※名前が空の「やること」が{nUnnamed}つあります。いちばん上の「何を頑張る？」の欄に名前を入れてください（名前が空のものは保存されません）。
                </div>
              )}
              <div style={{ marginTop: 4, fontSize: 12, color: "#7c98aa" }}>条件を満たさないスケジュールでは、キャラクターは表示されません。</div>
            </div>
          );
        })()}

        <button style={styles.saveBtn} onClick={handleSave}>
          このスケジュールで始める
        </button>

        {onRequestDelete && (
          <button style={styles.deleteScheduleBtn} onClick={onRequestDelete}>
            🗑 このスケジュールを削除する
          </button>
        )}
      </div>
      {confirmToDiet && (
        <ConfirmModal
          title="大人用に変更しますか？"
          message="スタンプ・⭐・メモ・育てているファミリアはそのまま引き継がれます。見た目が大人用のデザインに変わり、体重・消費カロリー・走行距離を記録できるようになります。やることの色も大人用の色に変わります。保存したあとは、女の子用・男の子用に戻せません。"
          confirmLabel="大人用にする"
          cancelLabel="やめる"
          onConfirm={() => {
            setTheme("diet");
            setSubjects((prev) => prev.map((x, i) => ({ ...x, color: THEMES.diet.palette[i % THEMES.diet.palette.length].hex })));
            setConfirmToDiet(false);
          }}
          onCancel={() => setConfirmToDiet(false)}
        />
      )}

      {pendingLowCardSave && (
        <ConfirmModal
          title="ファミリアが登場しません"
          message="スケジュールが30日未満、または「やること」が1つだけだと、ファミリア（キャラクター）は表示されず、カードももらえないよ（名前が空の「やること」は数えません）。それでもスケジュールを作る？"
          confirmLabel="作る"
          cancelLabel="編集にもどる"
          onConfirm={() => {
            onSave(pendingLowCardSave);
            setPendingLowCardSave(null);
          }}
          onCancel={() => setPendingLowCardSave(null)}
        />
      )}
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
  isExcused,
  onToggleExcused,
  missedBacklog,
  onOpenSettings,
  onEditSubject,
  onRequestDelete,
  stats,
  todayStats,
  streak,
  notes,
  achievements,
  weights,
  calories,
  steps,
  onSaveWeight,
  onSaveTargetWeight,
  onOpenNote,
  onOpenRecords,
  linkedProfile,
}) {
  const pct = stats.need > 0 ? Math.min(100, Math.round((stats.done / stats.need) * 100)) : 0;
  const pearlCount = 10;
  const filledPearls = stats.need > 0 ? Math.min(pearlCount, Math.round((stats.done / stats.need) * pearlCount)) : 0;

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
      <CornerDecor theme={theme.key} />
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
              🌟 {linkedProfile.name || "スタンプ帳"}へ
            </a>
          )}
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
          {isCardEligibleConfig(config) && (
            <GrowthMascotArt theme={theme.key} pct={pct} variantKey={config.mascotVariant} mascotName={config.mascotName} />
          )}
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
                  {describeTargets(s).join(" ") || "目標未設定"}
                </div>
                <div style={styles.subjectSpotlightFreq}>📅 {describeFrequency(s)}</div>
              </div>
              {backlog > 0 && <span style={styles.backlogBadgeBig}>🔁 残り{backlog}</span>}
            </button>
          );
        })}
      </div>

      {theme.key === "diet" && (
        <CalorieTotal calories={calories || {}} steps={steps || {}} trackSteps={!!config.trackSteps} isExcused={isExcused} achievements={achievements || {}} subjects={subjects} startDate={startDate} endDate={endDate} />
      )}
      {theme.key !== "diet" && (
        <ProgressCard isExcused={isExcused} achievements={achievements || {}} subjects={subjects} startDate={startDate} endDate={endDate} />
      )}
      {theme.key === "diet" && <WeightChart weights={weights || {}} startDate={startDate} endDate={endDate} target={config.targetWeight} onSaveWeight={onSaveWeight} onSaveTarget={onSaveTargetWeight} />}

      {/* ロックの案内はカレンダーのすぐ上（スタンプの説明と一緒）に表示 */}
      <div style={{ ...styles.lockNote, color: theme.headerTextColor, fontSize: 14, margin: "14px 18px 0", position: "relative", zIndex: 2 }}>
        {locked
          ? "🔒 マスを長押しすると、保護者の方がロックを開けて本スタンプを押せます"
          : "🔓 本スタンプが押せます（3分後に自動ロック）"}
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
        {/* スタンプの凡例：カレンダーをスクロールしても画面上部に残る */}
        <div style={styles.stampLegend}>
          {subjects.map((s, idx) => (
            <span key={s.id} style={styles.stampLegendItem}>
              <span style={{ ...styles.stampLegendIcon, background: s.color }}>
                <StampIcon
                  index={taskIconIndex(idx, theme.isMapTheme, theme.shapes.length)}
                  color="#ffffff"
                  size="70%"
                  shapes={theme.shapes}
                  withFace={theme.withFace}
                />
              </span>
              <span style={styles.stampLegendName}>{s.name}</span>
            </span>
          ))}
        </div>
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
                    className="memoBtn"
                    style={{
                      ...styles.memoBtn,
                      ...(theme.isMapTheme
                        ? {
                            background: notes[dKey] || achievements[dKey] ? "#F4C95D" : "rgba(139,94,52,0.12)",
                            border: notes[dKey] || achievements[dKey] ? "1px solid #8B5E34" : "1px dashed #C4A876",
                            color: notes[dKey] || achievements[dKey] ? "#5C3A21" : "#8B6B47",
                          }
                        : notes[dKey] || (weights && weights[dKey]) || (calories && calories[dKey]) || (steps && steps[dKey])
                        ? styles.memoBtnFilled
                        : {}),
                    }}
                    aria-label={`${d.getMonth() + 1}月${d.getDate()}日 の メモ`}
                  >
                    <span>📝</span>
                    <span>メモ</span>
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
                      const achvLabel = achv ? formatAchvShort(achv, s) : "";
                      const excusedHere = isExcused(dKey, s.id);
                      // お休みスタンプ：今日・過去の日の、まだ押していないマス（または
                      // お休みを押したマス）に小さなボタンを出す。押すと毎回暗証番号を聞く。
                      const excuseBtn =
                        dKey <= todayKey && (count === 0 || excusedHere) ? (
                          <button
                            onClick={() => onToggleExcused(d, s.id)}
                            style={styles.excuseBtn}
                            aria-label={excusedHere ? "お休みスタンプを取り消す" : "お休みスタンプを押す"}
                          >
                            {excusedHere ? "🌙取消" : "🌙お休み"}
                          </button>
                        ) : null;
                      if (excusedHere) {
                        return (
                          <div key={s.id} style={styles.stampSlot}>
                            <div style={styles.excusedStamp} title={`${s.name}：お休み`}>
                              <span style={{ fontSize: "58%", lineHeight: 1 }}>🌙</span>
                            </div>
                            {achvLabel && <div style={styles.achvMiniLabel}>{achvLabel}</div>}
                            {excuseBtn}
                          </div>
                        );
                      }
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
                            {excuseBtn}
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
                            locked={locked}
                            isFuture={isFuture}
                            onRequestUnlock={onLockToggle}
                            onTogglePast={() => onTogglePastStamp(d, s.id)}
                            onClearPast={() => onClearPastStamp(d, s.id)}
                          />
                          {achvLabel && <div style={styles.achvMiniLabel}>{achvLabel}</div>}
                          {excuseBtn}
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

// Long-press detector: fires `onLongPress` once the pointer/finger has been
// held on the element for `delay` ms, and marks the click that follows
// (mobile fires a synthetic click after touchend; desktop fires one after
// mouseup) so `guardedClick` can swallow it — a short, quick tap still goes
// through to whatever handler the caller passes it.
function useLongPress(onLongPress, delay = 550) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);

  function start() {
    firedRef.current = false;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, delay);
  }
  function clear() {
    clearTimeout(timerRef.current);
  }
  function guardedClick(handler) {
    return (e) => {
      if (firedRef.current) {
        firedRef.current = false;
        return;
      }
      if (handler) handler(e);
    };
  }

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchCancel: clear,
    onTouchMove: clear, // a scroll/drag starting on the cell shouldn't count as a hold
    guardedClick,
  };
}

function HistoryCell({ count, color, iconIndex, label, missed, fun, onToggleFun, onTogglePast, onClearPast, locked, isFuture, onRequestUnlock, shapes, withFace, useDragonStamp }) {
  // Called unconditionally (Rules of Hooks) even though only the locked,
  // non-future branches below actually wire it up to an element.
  const longPress = useLongPress(onRequestUnlock);

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
    <StampIcon index={iconIndex} color="#ffffff" size="80%" shapes={shapes} withFace={withFace} />
  );
  const hintIdx = taskIconIndex(iconIndex, useDragonStamp, shapes ? shapes.length : 1);
  const hintIcon = (
    <span style={styles.stampHintIcon}>
      <StampIcon index={hintIdx} color={color} size="82%" shapes={shapes} withFace={false} />
    </span>
  );

  if (real) {
    if (isFuture) {
      // Future day — a genuine future record shouldn't exist, but just in
      // case, keep this fully non-interactive (can't unlock from a future day).
      return (
        <div
          style={{
            ...styles.stampCircle,
            cursor: "default",
            ...stampedCircleStyle(color, useDragonStamp),
          }}
        >
          {icon}
          {count === 2 && <span style={styles.x2Badge}>×2</span>}
        </div>
      );
    }
    // Past day, locked — long-press brings up the parent PIN/confirm prompt,
    // same as tapping today's stamp does. Lets a parent unlock from any past
    // day's cell, not only from today's (today may have nothing scheduled).
    // A quick tap does nothing, same as before.
    return (
      <button
        onClick={longPress.guardedClick(null)}
        onMouseDown={longPress.onMouseDown}
        onMouseUp={longPress.onMouseUp}
        onMouseLeave={longPress.onMouseLeave}
        onTouchStart={longPress.onTouchStart}
        onTouchEnd={longPress.onTouchEnd}
        onTouchCancel={longPress.onTouchCancel}
        onTouchMove={longPress.onTouchMove}
        style={{
          ...styles.stampCircle,
          ...stampedCircleStyle(color, useDragonStamp),
          cursor: "pointer",
        }}
        aria-label={`${label} の記録をあとから直す（長押しで保護者用）`}
      >
        {icon}
        {count === 2 && <span style={styles.x2Badge}>×2</span>}
      </button>
    );
  }

  if (isFuture) {
    // No real record, future day — a free, playful "practice" stamp the
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
            <StampIcon index={iconIndex} color={color} size="82%" shapes={shapes} withFace={false} />
          )
        ) : (
          hintIcon
        )}
      </button>
    );
  }

  // No real record here, past day, locked — a quick tap keeps the original
  // free, playful "practice" stamp toggle; a long-press instead brings up
  // the parent PIN/confirm prompt, so any past day works as an unlock entry
  // point even when it has no stamp on it yet.
  return (
    <button
      onClick={longPress.guardedClick(onToggleFun)}
      onMouseDown={longPress.onMouseDown}
      onMouseUp={longPress.onMouseUp}
      onMouseLeave={longPress.onMouseLeave}
      onTouchStart={longPress.onTouchStart}
      onTouchEnd={longPress.onTouchEnd}
      onTouchCancel={longPress.onTouchCancel}
      onTouchMove={longPress.onTouchMove}
      style={{
        ...styles.stampCircle,
        borderColor: fun ? color : missed ? "#F4C95D" : "#dbe8ee",
        background: fun ? color + "18" : "#fff",
      }}
      aria-label={`${label} れんしゅうスタンプ（長押しで保護者用）`}
    >
      {fun ? (
        useDragonStamp ? (
          <img src="/dragon-stamp.png" alt="" style={{ ...styles.dragonStampImg, opacity: 0.55 }} />
        ) : (
          <StampIcon index={iconIndex} color={color} size="82%" shapes={shapes} withFace={false} />
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

// 押したスタンプの丸：その色でぬりつぶし＋実線の枠（押していないマスの点線・白地とはっきり区別する）
function stampedCircleStyle(color, useDragonStamp) {
  return {
    borderColor: color,
    borderStyle: "solid",
    background: useDragonStamp ? color + "55" : color,
    boxShadow: `0 2px 6px ${color}88`,
  };
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
          ...(count >= 1 ? stampedCircleStyle(color, useDragonStamp) : { borderColor: color, background: "#ffffff" }),
        }}
        aria-label={`${label} スタンプ`}
      >
        {count >= 1 ? (
          <span key={popKey} style={styles.stampPopWrap}>
            {useDragonStamp ? (
              <img src="/dragon-stamp.png" alt="" style={styles.dragonStampImg} />
            ) : (
              <StampIcon index={iconIndex} color="#ffffff" size="80%" shapes={shapes} withFace={withFace} />
            )}
          </span>
        ) : (
          <span style={styles.stampHintIcon}>
            <StampIcon
              index={taskIconIndex(iconIndex, useDragonStamp, shapes ? shapes.length : 1)}
              color={color}
              size="82%"
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

function NoteModal({ date, initialText, initialAchievements, comments, subjects, isMapTheme, isDiet, trackSteps, initialCalories, initialSteps, onSave, onClose }) {
  const [text, setText] = useState(initialText || "");
  const [achv, setAchv] = useState(initialAchievements || {});
  const [kcal, setKcal] = useState(initialCalories != null ? String(initialCalories) : "");
  const [stepCount, setStepCount] = useState(initialSteps != null ? String(initialSteps) : "");
  const dLabel = `${date.getMonth() + 1}月${date.getDate()}日`;

  // 手で直した記録は auto を外す（スタンプを取り消しても消えないように）
  function setField(subjId, field, value) {
    setAchv((prev) => ({ ...prev, [subjId]: { ...(prev[subjId] || {}), [field]: value, auto: false } }));
  }

  // 筋トレ：部位ごとの回数。合計は custom に入れる（合計の計算・表示用）
  function setPartReps(subject, itemId, value) {
    setAchv((prev) => {
      const cur = prev[subject.id] || {};
      const parts = { ...(cur.parts || {}), [itemId]: value };
      if (value === "") delete parts[itemId];
      const sum = Object.values(parts).reduce((a, n) => a + (Number(n) || 0), 0);
      return { ...prev, [subject.id]: { ...cur, parts, custom: Object.keys(parts).length ? sum : "", auto: false } };
    });
  }

  // 大人用：時間を「分＋秒」で入れる。保存は分（小数）で持つ
  function minSecParts(v) {
    if (v === undefined || v === null || v === "") return ["", ""];
    const total = Math.round(Number(v) * 60);
    return [String(Math.floor(total / 60)), String(total % 60)];
  }
  function setMinSec(subjId, mStr, sStr) {
    if (mStr === "" && sStr === "") return setField(subjId, "minutes", "");
    const val = (parseFloat(mStr) || 0) + (parseFloat(sStr) || 0) / 60;
    setField(subjId, "minutes", Math.round(val * 10000) / 10000);
  }

  const measurableSubjects = (subjects || []).filter(
    (x) => subjectIsMeasurable(x) || (isDiet && x.exType && (x.name || "").trim())
  );

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.noteModalCard}>
      <div style={styles.noteModalScrollBody}>
        <h3 style={styles.modalTitle}>📝 {dLabel} の記録</h3>

        {isDiet && (
          <div style={{ ...styles.achievementSection, background: "#EEF8F2", borderColor: "#BFE6C9", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ ...styles.achievementSectionLabel, color: "#2C6E55", margin: 0 }}>📱 健康アプリの1日の合計（トレーニング込み・任意）</p>

            <label style={{ ...styles.achievementField, fontSize: 15, color: "#1E4A3B" }}>
              🔥 消費カロリー
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                placeholder="例：450"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                style={{ ...styles.achievementInput, width: 84, borderColor: "#A9DEC4", fontSize: 16 }}
              />
              kcal
            </label>
            {trackSteps && (
              <label style={{ ...styles.achievementField, fontSize: 15, color: "#1E4A3B" }}>
                👟 歩数
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="1"
                  placeholder="例：12000"
                  value={stepCount}
                  onChange={(e) => setStepCount(e.target.value)}
                  style={{ ...styles.achievementInput, width: 96, borderColor: "#A9DEC4", fontSize: 16 }}
                />
                歩
              </label>
            )}

            <div style={{ fontSize: 11.5, color: "#5d7d70", lineHeight: 1.5 }}>
              健康アプリに出ている1日の合計をそのまま入れてください（カロリーは「アクティブカロリー」）。下の「実際にどれだけできた？」のトレーニング分を引いた残りが、日常生活の分になります。
            </div>
            {(() => {
              // 日常生活の分を、その場で計算して見せる
              const train = { steps: 0, kcal: 0, km: 0 };
              Object.entries(achv || {}).forEach(([sid, v]) => {
                if (!v) return;
                const sj = (subjects || []).find((x) => x.id === sid);
                if (sj && sj.exType === "other") train.steps += Number(v.steps) || 0;
                train.kcal += Number(v.kcal) || 0;
                train.km += Number(v.km) || 0;
              });
              const parts = [];
              if (parseFloat(stepCount) > 0) parts.push(`👟 ${Math.max(0, Math.round(parseFloat(stepCount) - train.steps)).toLocaleString()}歩`);
              if (parseFloat(kcal) > 0) parts.push(`🔥 ${Math.max(0, Math.round(parseFloat(kcal) - train.kcal)).toLocaleString()}kcal`);
              return parts.length ? (
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1E4A3B", background: "#fff", borderRadius: 10, padding: "6px 10px" }}>
                  🏠 日常生活の分：{parts.join("　")}
                </div>
              ) : null;
            })()}
          </div>
        )}

        {measurableSubjects.length > 0 && (
          <div style={styles.achievementSection}>
            <p style={styles.achievementSectionLabel}>実際にどれだけできた？</p>
            {measurableSubjects.map((s) => (
              <div key={s.id} style={styles.achievementSubjectRow}>
                <div style={{ ...styles.achievementSubjectName, color: s.color }}>{s.name}</div>
                <div style={styles.achievementFieldsRow}>
                  {s.measureTime && !isDiet && (
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
                  {s.measureTime !== false && isDiet && (() => {
                    const [mm, ss] = minSecParts(achv[s.id]?.minutes);
                    return (
                      <label style={styles.achievementField}>
                        ⏱
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          placeholder={minSecParts(s.targetMinutes || 30)[0]}
                          value={mm}
                          onChange={(e) => {
                            setMinSec(s.id, e.target.value, ss);
                            // 分を2桁入れたら秒の欄へ移る
                            if (e.target.value.length >= 2) {
                              const sec = e.target.parentElement && e.target.parentElement.querySelector("input[data-sec]");
                              if (sec) sec.focus();
                            }
                          }}
                          style={{ ...styles.achievementInput, width: 56 }}
                        />
                        分
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={59}
                          data-sec="1"
                          placeholder={minSecParts(s.targetMinutes || 30)[1]}
                          value={ss}
                          onChange={(e) => setMinSec(s.id, mm, String(Math.min(59, Math.max(0, parseInt(e.target.value || "0", 10) || 0))))}
                          style={{ ...styles.achievementInput, width: 48 }}
                        />
                        秒
                      </label>
                    );
                  })()}
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
                  {s.measureDistance && (
                    <label style={styles.achievementField}>
                      🏃
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.1"
                        placeholder={String(s.targetKm ?? 3)}
                        value={achv[s.id]?.km ?? ""}
                        onChange={(e) => setField(s.id, "km", e.target.value)}
                        style={styles.achievementInput}
                      />
                      km
                    </label>
                  )}
                  {isDiet && s.exType === "other" && (
                    <label style={styles.achievementField}>
                      👟
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder={s.perSteps ? String(s.perSteps) : "歩数"}
                        value={achv[s.id]?.steps ?? ""}
                        onChange={(e) => setField(s.id, "steps", e.target.value)}
                        style={{ ...styles.achievementInput, width: 76 }}
                      />
                      歩
                    </label>
                  )}
                  {isDiet && ["strength", "walk", "run", "other"].includes(s.exType) && (
                    <label style={styles.achievementField}>
                      🔥
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder={s.perKcal ? String(s.perKcal) : "kcal"}
                        value={achv[s.id]?.kcal ?? ""}
                        onChange={(e) => setField(s.id, "kcal", e.target.value)}
                        style={{ ...styles.achievementInput, width: 64 }}
                      />
                      kcal
                    </label>
                  )}
                  {s.exType === "strength" && strengthItems(s).length > 0 &&
                    strengthItems(s).map((it) => (
                      <label key={it.id} style={styles.achievementField}>
                        💪{it.part}
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          placeholder={String(it.reps ?? "")}
                          value={achv[s.id]?.parts?.[it.id] ?? ""}
                          onChange={(e) => setPartReps(s, it.id, e.target.value)}
                          style={{ ...styles.achievementInput, width: 56 }}
                        />
                        回
                      </label>
                    ))}
                  {s.measureCustom && !(s.exType === "strength" && strengthItems(s).length > 0) && (
                    <label style={styles.achievementField}>
                      {s.exType === "strength" ? "💪" : "🎯"}
                      {(s.customLabel || "").trim()}
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        placeholder={String(s.targetCustom ?? "")}
                        value={achv[s.id]?.custom ?? ""}
                        onChange={(e) => setField(s.id, "custom", e.target.value)}
                        style={styles.achievementInput}
                      />
                      {(s.customUnit || "").trim()}
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

        {comments && comments.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <p style={styles.modalMsg}>💬 みんなからのコメント</p>
            {comments.map((c) => (
              <div key={c.id} style={styles.parentCommentReadOnly}>
                <div style={styles.parentCommentLabel}>{c.name}</div>
                <div style={styles.parentCommentText}>{c.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

        <div style={styles.noteModalFooter}>
          <button style={styles.modalCancel} onClick={onClose}>
            とじる
          </button>
          <button style={styles.modalConfirm} onClick={() => onSave(text, achv, isDiet ? kcal : undefined, isDiet && trackSteps ? stepCount : undefined)}>
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordsListModal({ entries, subjects, profileId, profileName, onAddComment, onEditComment, onDeleteComment, onClose }) {
  // Remembered across entries for this viewing session only, so someone
  // replying to several days in a row doesn't have to retype their name
  // each time. Not persisted — next time they open this, it starts blank.
  const [commenterName, setCommenterName] = useState("");

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.recordsListCard}>
        <h3 style={styles.modalTitle}>📋 きろく一覧</h3>
        {entries.length === 0 ? (
          <p style={styles.modalMsg}>まだ記録できる日がありません。</p>
        ) : (
          <div style={styles.recordsListScroll}>
            {entries.map((e) => (
              <RecordEntryCard
                key={e.dKey}
                entry={e}
                subjects={subjects}
                commenterName={commenterName}
                onCommenterNameChange={setCommenterName}
                onAddComment={onAddComment}
                onEditComment={onEditComment}
                onDeleteComment={onDeleteComment}
              />
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...styles.modalConfirm, flex: 1 }} onClick={onClose}>
            閉じる
          </button>
          {profileId && (
            <a
              href={`${window.location.pathname}?profile=${profileId}`}
              style={{
                ...styles.modalConfirm,
                flex: 1,
                background: "#EAF4F9",
                color: "#14588C",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
            >
              🌟 {profileName || "スタンプ帳"}へ戻る
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordEntryCard({ entry: e, subjects, commenterName, onCommenterNameChange, onAddComment, onEditComment, onDeleteComment }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editingId, setEditingId] = useState(null); // comment id currently being edited, or null
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState(null); // comment id awaiting delete confirmation, or null

  const achvParts = [];
  if (e.achv) {
    Object.entries(e.achv).forEach(([subjId, vals]) => {
      const s = subjects.find((x) => x.id === subjId);
      if (!s) return;
      const parts = [];
      if (vals.minutes) parts.push(`⏱${fmtMinSec(vals.minutes)}`);
      if (vals.pages) parts.push(`📖${vals.pages}ページ`);
      if (vals.problems) parts.push(`✏️${vals.problems}問`);
      if (vals.km) parts.push(`🏃${vals.km}km`);
      if (vals.steps) parts.push(`👟${Number(vals.steps).toLocaleString()}歩`);
      if (vals.kcal) parts.push(`🔥${Number(vals.kcal).toLocaleString()}kcal`);
      if (vals.custom) parts.push(`${s.exType === "strength" ? "💪" : "🎯"}${customGoalText(s, vals.custom)}`);
      if (parts.length > 0) achvParts.push({ name: s.name, color: s.color, text: parts.join(" ") });
    });
  }

  function submitReply() {
    if (!replyText.trim()) return;
    onAddComment(e.dKey, commenterName, replyText);
    setReplyText("");
    setReplyOpen(false);
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditText(c.text);
    setDeletingId(null);
  }

  function saveEdit(commentId) {
    if (!editText.trim()) return;
    onEditComment(e.dKey, commentId, editText);
    setEditingId(null);
    setEditText("");
  }

  function confirmDelete(commentId) {
    onDeleteComment(e.dKey, commentId);
    setDeletingId(null);
  }

  return (
    <div style={styles.recordEntryCard}>
      <div style={styles.recordEntryDate}>
        {e.date.getMonth() + 1}月{e.date.getDate()}日
      </div>
      {e.weight && <div style={{ ...styles.recordEntryAchv, color: "#1E4A3B" }}>⚖️ 体重：{Number(e.weight).toFixed(1)}kg</div>}
      {e.steps && <div style={{ ...styles.recordEntryAchv, color: "#1E4A3B" }}>📱 1日の歩数：{Number(e.steps).toLocaleString()}歩</div>}
      {e.kcal && <div style={{ ...styles.recordEntryAchv, color: "#1E4A3B" }}>📱 1日の消費カロリー：{Number(e.kcal).toLocaleString()}kcal</div>}
      {achvParts.map((a) => (
        <div key={a.name} style={{ ...styles.recordEntryAchv, color: a.color }}>
          {a.name}：{a.text}
        </div>
      ))}
      {e.note ? (
        <div style={styles.recordEntryNote}>{e.note}</div>
      ) : (
        <div style={{ ...styles.recordEntryNote, color: "#9db3c2" }}>（まだメモはありません）</div>
      )}

      {e.comments && e.comments.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {e.comments.map((c) => (
            <div key={c.id} style={styles.recordEntryParentComment}>
              {editingId === c.id ? (
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>{c.name}</div>
                  <textarea
                    value={editText}
                    onChange={(ev) => setEditText(ev.target.value)}
                    rows={2}
                    style={styles.replyTextarea}
                    autoFocus
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button style={styles.replyCancelBtn} onClick={() => setEditingId(null)}>
                      やめる
                    </button>
                    <button style={styles.replySubmitBtn} onClick={() => saveEdit(c.id)}>
                      保存する
                    </button>
                  </div>
                </div>
              ) : deletingId === c.id ? (
                <div>
                  <div style={{ fontWeight: 800 }}>{c.name}</div>
                  <div style={{ marginBottom: 6 }}>このコメントを削除しますか？</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={styles.replyCancelBtn} onClick={() => setDeletingId(null)}>
                      やめる
                    </button>
                    <button style={{ ...styles.replySubmitBtn, background: "#E0526B" }} onClick={() => confirmDelete(c.id)}>
                      削除する
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div>
                    <span style={{ fontWeight: 800 }}>{c.name}</span>：{c.text}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button style={styles.commentEditBtn} onClick={() => startEdit(c)}>
                      編集
                    </button>
                    <button style={styles.commentEditBtn} onClick={() => setDeletingId(c.id)}>
                      削除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {replyOpen ? (
        <div style={styles.replyForm}>
          <input
            value={commenterName}
            onChange={(ev) => onCommenterNameChange(ev.target.value)}
            placeholder="名前"
            maxLength={20}
            style={styles.replyNameInput}
          />
          <textarea
            value={replyText}
            onChange={(ev) => setReplyText(ev.target.value)}
            placeholder="コメントを書く"
            rows={2}
            style={styles.replyTextarea}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.replyCancelBtn} onClick={() => setReplyOpen(false)}>
              やめる
            </button>
            <button style={styles.replySubmitBtn} onClick={submitReply}>
              送信する
            </button>
          </div>
        </div>
      ) : (
        <button style={styles.replyOpenBtn} onClick={() => setReplyOpen(true)}>
          {e.note ? "💬 返信する" : "💬 コメントを書く"}
        </button>
      )}
    </div>
  );
}


// ===== 進み具合の表示（大人用の合計カード・子ども用の進捗表で共通） =====

// 期間内の日付を1日ずつ回す
function forEachDay(startDate, endDate, fn) {
  for (let d = new Date(startDate); d.getTime() <= endDate.getTime(); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) fn(d, dateKey(d));
}

// 予定のマス（やること×日、お休みは除く）ごとに fn(subject, 日付キー) を呼ぶ
function forEachPlannedCell(subjects, startDate, endDate, isExcused, fn) {
  forEachDay(startDate, endDate, (d, k) => {
    subjects.forEach((x) => {
      if ((x.name || "").trim() && subjectAppliesOnDate(x, d, startDate, endDate) && !(isExcused && isExcused(k, x.id))) fn(x, k);
    });
  });
}

// 数値の表示：unit が "min" なら時間、それ以外は桁区切り
function formatAmount(n, unit) {
  if (unit === "min") {
    const total = Math.round(n * 60);
    if (total < 3600) return fmtMinSec(n);
    const m = Math.round(n);
    return `${Math.floor(m / 60)}時間${m % 60 ? (m % 60) + "分" : ""}`;
  }
  if (unit === "km") return `${Math.round(n * 10) / 10}`;
  return (Math.round(n * 10) / 10).toLocaleString();
}

const mdLabel = (d) => `${d.getMonth() + 1}/${d.getDate()}`;

// 1項目分のバー：実績／目標（%）、開始日・今日・最終日、予定との差
function ProgressRow({ icon, label, actual, goal, pace, unit, unitText, startDate, endDate, ink, track, details, bigLabel }) {
  const u = unitText || "";
  const [open, setOpen] = useState(false);
  const hasDetails = Array.isArray(details) && details.length > 0;
  // タップで開く「内訳」（記録のあった日とその値）
  const breakdown = hasDetails && open && (
    <div style={{ marginTop: 6, padding: "8px 10px", background: "#F5F9FB", borderRadius: 10, fontSize: 12.5, color: "#3f5a66" }}>
      <div style={{ fontWeight: 800, color: ink, marginBottom: 4 }}>{/^\d{4}-/.test(details[0][0]) ? `内訳（${details.length}回）` : "部位ごとの内訳"}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
        {details.map(([k, v]) => {
          const isDate = /^\d{4}-\d{2}-\d{2}$/.test(k);
          const [, mm, dd] = isDate ? k.split("-").map(Number) : [];
          return (
            <span key={k} style={{ whiteSpace: "nowrap" }}>
              <span style={{ color: "#7a958a" }}>{isDate ? `${mm}/${dd}` : k}</span> <b>{formatAmount(v, unit)}</b>{u}
            </span>
          );
        })}
      </div>
    </div>
  );
  const head = (right) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: bigLabel ? 15.5 : 13, fontWeight: 800, color: ink }}>
        {icon} {label}
        {hasDetails && <span style={{ fontSize: 11, fontWeight: 700, color: "#8aa1b0", marginLeft: 6, whiteSpace: "nowrap", display: "inline-block" }}>{open ? "▾ 内訳をとじる" : "▸ タップで内訳"}</span>}
      </span>
      <span style={{ fontSize: 13, color: "#6b8590", whiteSpace: "nowrap" }}>{right}</span>
    </div>
  );
  // 目標がない項目は合計だけ
  const rowProps = hasDetails ? { onClick: () => setOpen((o) => !o), role: "button", style: { padding: "6px 2px", cursor: "pointer" } } : { style: { padding: "6px 2px" } };
  if (!(goal > 0)) {
    return (
      <div {...rowProps}>
        {head(
          <>
            <b style={{ fontSize: 19, color: ink }}>{formatAmount(actual, unit)}</b>
            {u} ／ 目標なし
          </>
        )}
        <div style={{ height: 12, borderRadius: 999, background: track, marginTop: 4, opacity: 0.6 }} />
        {breakdown}
      </div>
    );
  }
  const pctRaw = Math.round((actual / goal) * 100);
  const pacePct = Math.min(100, (pace / goal) * 100);
  const showToday = pace > 0 && pace < goal;
  const done = actual >= goal;
  const ahead = actual >= pace;
  const good = done || ahead;
  const todayK = todayStr();
  return (
    <div {...rowProps}>
      {head(
        <>
          <b style={{ fontSize: 19, color: ink }}>{formatAmount(actual, unit)}</b> ／ {formatAmount(goal, unit)}
          {u}（<span style={{ color: pctRaw > 100 ? "#C98A00" : "inherit", fontWeight: pctRaw > 100 ? 900 : 400 }}>{pctRaw}%</span>）
        </>
      )}
      <div style={{ position: "relative", height: 12, borderRadius: 999, background: track, marginTop: 4, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, pctRaw)}%`, height: "100%", borderRadius: 999, background: good ? "#3E9A74" : "#E08A3C", transition: "width .4s" }} />
        {showToday && <div style={{ position: "absolute", top: -2, bottom: -2, left: `calc(${pacePct}% - 1px)`, width: 2, background: ink, opacity: 0.55 }} />}
      </div>
      {/* 開始日（左）・今日（縦線の位置）・最終日（右） */}
      <div style={{ position: "relative", height: 14, marginTop: 2, fontSize: 10.5, color: "#7a958a", fontWeight: 700 }}>
        {!(showToday && pacePct < 16) && <span style={{ position: "absolute", left: 0 }}>{mdLabel(startDate)}</span>}
        {showToday && (
          <span style={{ position: "absolute", left: `${Math.min(88, Math.max(6, pacePct))}%`, transform: "translateX(-50%)", color: ink, whiteSpace: "nowrap" }}>
            今日 {mdLabel(new Date(todayK + "T00:00:00"))}
          </span>
        )}
        {!(showToday && pacePct > 84) && <span style={{ position: "absolute", right: 0 }}>{mdLabel(endDate)}</span>}
      </div>
      <div style={{ fontSize: 11.5, marginTop: 3, color: good ? "#2C8A5F" : "#C0603F", fontWeight: 700 }}>
        {done
          ? actual > goal
            ? `🎉 期間の目標を達成！（目標より ${formatAmount(actual - goal, unit)}${u} 多い）`
            : "🎉 期間の目標を達成！"
          : pace === 0
          ? "スタンプの予定から目標を計算しています"
          : actual > pace
          ? `予定より ${formatAmount(actual - pace, unit)}${u} 進んでいます👍`
          : actual === pace
          ? "予定どおり👍"
          : `予定より ${formatAmount(pace - actual, unit)}${u} 遅れています`}
      </div>
      {breakdown}
    </div>
  );
}

const progressCardStyle = (shadow) => ({
  position: "relative",
  zIndex: 2,
  margin: "14px 18px 0",
  background: "#fff",
  borderRadius: 18,
  padding: "12px 14px",
  boxShadow: `0 10px 24px ${shadow}`,
  boxSizing: "border-box",
});

// 大人用：トレーニングの合計（バー）と日常生活（健康アプリの1日の合計 − トレーニング分）
function CalorieTotal({ calories, steps, trackSteps, isExcused, achievements, subjects, startDate, endDate }) {
  const startKey = dateKey(startDate);
  const endKey = dateKey(endDate);
  const todayK = todayStr();
  const inRange = (k) => k >= startKey && k <= endKey;
  const isKmUnit = (x) => x && /^(km|キロ|ｋｍ)$/i.test((x.customUnit || "").trim());

  // 実績：やることごとの記録（スタンプの自動入力＋メモで直した分）
  // 歩数はその他トレーニングだけ。距離は「🏃距離」と単位が km の自由目標。
  const actual = { min: 0, steps: 0, km: 0, kcal: 0, reps: 0 };
  const dayTrain = {}; // 日付ごとのトレーニング分（日常生活の計算用）
  const kmBySubj = {};
  const repsByPart = {}; // 筋トレの部位ごとの回数（内訳用）
  Object.entries(achievements).forEach(([k, day]) => {
    if (!inRange(k)) return;
    Object.entries(day || {}).forEach(([sid, v]) => {
      if (!v) return;
      const subj = subjects.find((x) => x.id === sid);
      const st = subj && subj.exType === "other" ? Number(v.steps) || 0 : 0;
      const km = (Number(v.km) || 0) + (isKmUnit(subj) ? Number(v.custom) || 0 : 0);
      const kc = Number(v.kcal) || 0;
      actual.min += Number(v.minutes) || 0;
      actual.steps += st;
      actual.km += km;
      actual.kcal += kc;
      if (km > 0) kmBySubj[sid] = (kmBySubj[sid] || 0) + km;
      if (subj && subj.exType === "strength") {
        const items = strengthItems(subj);
        const parts = v.parts || {};
        const hasParts = Object.values(parts).some((n) => Number(n) > 0);
        if (hasParts) {
          Object.entries(parts).forEach(([id, n]) => {
            const r = Number(n) || 0;
            if (r <= 0) return;
            const it = items.find((x) => x.id === id);
            const name = (it && (it.part || "").trim()) || subj.name;
            repsByPart[name] = (repsByPart[name] || 0) + r;
            actual.reps += r;
          });
        } else if (Number(v.custom) > 0) {
          repsByPart[subj.name] = (repsByPart[subj.name] || 0) + Number(v.custom);
          actual.reps += Number(v.custom);
        }
      }
      const t = dayTrain[k] || (dayTrain[k] = { steps: 0, kcal: 0 });
      t.steps += st;
      t.kcal += kc;
    });
  });

  // 目標：予定のマスごとに、やることの「1回あたり」の値を足す
  const plan = { min: 0, steps: 0, km: 0, kcal: 0, reps: 0 };
  const pace = { min: 0, steps: 0, km: 0, kcal: 0, reps: 0 };
  forEachPlannedCell(subjects, startDate, endDate, isExcused, (x, k) => {
    const add = {
      min: x.measureTime !== false ? Number(x.targetMinutes) || 0 : 0,
      steps: x.exType === "other" ? Number(x.perSteps) || 0 : 0,
      km: x.measureDistance ? Number(x.targetKm) || 0 : 0,
      kcal: Number(x.perKcal) || 0,
      reps: x.exType === "strength" ? strengthItems(x).reduce((a, it) => a + ((it.part || "").trim() ? Number(it.reps) || 0 : 0), 0) : 0,
    };
    Object.keys(add).forEach((key) => {
      plan[key] += add[key];
      if (k <= todayK) pace[key] += add[key];
    });
  });

  // 日常生活：健康アプリの1日の合計 − その日のトレーニング分（マイナスにはしない）
  const life = { steps: 0, kcal: 0 };
  const lifeDays = { steps: 0, kcal: 0 };
  [
    ["steps", steps],
    ["kcal", calories],
  ].forEach(([key, src]) => {
    Object.entries(src || {}).forEach(([k, n]) => {
      if (!inRange(k) || !(Number(n) > 0)) return;
      life[key] += Math.max(0, Number(n) - ((dayTrain[k] && dayTrain[k][key]) || 0));
      lifeDays[key] += 1;
    });
  });

  const rows = [
    { key: "min", icon: "⏱", label: "運動時間", unit: "min", unitText: "" },
    { key: "steps", icon: "👟", label: "歩数", unit: "steps", unitText: "歩", hideIfEmpty: true },
    { key: "km", icon: "🏃", label: "走行距離", unit: "km", unitText: "km", hideIfEmpty: true },
    { key: "reps", icon: "💪", label: "筋トレの回数", unit: "reps", unitText: "回", hideIfEmpty: true, details: Object.entries(repsByPart).sort((a, b) => b[1] - a[1]) },
    { key: "kcal", icon: "🔥", label: "消費カロリー", unit: "kcal", unitText: "kcal" },
  ].filter((r) => !r.hideIfEmpty || plan[r.key] > 0 || actual[r.key] > 0);
  const withGoal = rows.filter((r) => plan[r.key] > 0);
  const allDone = withGoal.length > 0 && withGoal.every((r) => actual[r.key] >= plan[r.key]);
  const hasNoGoal = rows.length > withGoal.length;
  const kmBreakdown = Object.entries(kmBySubj).map(([sid, km]) => `${(subjects.find((x) => x.id === sid) || {}).name || "？"} ${Math.round(km * 10) / 10}km`);
  const showLifeSteps = trackSteps || lifeDays.steps > 0;
  const ink = "#1E4A3B";

  return (
    <div style={progressCardStyle("rgba(30,74,59,0.25)")}>
      <div style={{ fontSize: 13, color: ink, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>💪 トレーニングの合計</div>
      {allDone && (
        <div style={{ textAlign: "center", margin: "4px 0 8px", padding: "8px 10px", borderRadius: 12, background: "linear-gradient(135deg,#FFF3C4,#DFF3E6)", fontWeight: 900, color: ink }}>
          🎉 目標をすべて達成しました！すばらしい！
        </div>
      )}
      {[...withGoal, ...rows.filter((r) => !(plan[r.key] > 0))].map((r) => (
        <ProgressRow key={r.key} {...r} actual={actual[r.key]} goal={plan[r.key]} pace={pace[r.key]} startDate={startDate} endDate={endDate} ink={ink} track="#E6F1EB" />
      ))}
      {hasNoGoal && (
        <div style={{ fontSize: 11.5, color: "#C0603F", textAlign: "center", marginTop: 6, lineHeight: 1.5 }}>
          「目標なし」の項目は、「✏️ 修正する」でやることの種類（ウォーキングなど）を選び、1回あたりの値を入れると進み具合が出ます
        </div>
      )}
      {kmBreakdown.length > 1 && <div style={{ fontSize: 11.5, color: "#5d7d70", textAlign: "center", marginTop: 4 }}>（{kmBreakdown.join("・")}）</div>}

      {/* 日常生活（トレーニング以外） */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "2px solid #E3EEF3" }}>
        <div style={{ fontSize: 13, color: ink, fontWeight: 800, textAlign: "center", marginBottom: 6 }}>🏠 日常生活（トレーニング以外）</div>
        {lifeDays.steps + lifeDays.kcal === 0 ? (
          <div style={{ fontSize: 12, color: "#8aa69a", textAlign: "center", lineHeight: 1.5 }}>
            「📝 メモ」に健康アプリの1日の合計を入れると、トレーニング分を引いた日常生活の分がここに出ます
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${showLifeSteps ? 2 : 1}, 1fr)`, columnGap: 6 }}>
            {[...(showLifeSteps ? [["👟", "歩数", "steps", "歩"]] : []), ["🔥", "消費カロリー", "kcal", "kcal"]].map(([icon, label, key, u]) => (
              <div key={key} style={{ textAlign: "center", minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#5d7d70", fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: ink, whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 15 }}>{icon}</span>
                  {formatAmount(life[key], key)}
                  <span style={{ fontSize: 11.5, marginLeft: 2 }}>{u}</span>
                </div>
                <div style={{ fontSize: 11, color: "#8aa69a" }}>{lifeDays[key] > 0 ? `1日平均 ${formatAmount(Math.round(life[key] / lifeDays[key]), key)}${u}` : "記録なし"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 女の子用・男の子用：がんばりの進み具合（時間・ページ数・問題数・自由目標）
// 目標＝やることの目標 × スタンプの予定（お休みを除く）、実績＝「実際にどれだけできた？」の記録
function ProgressCard({ isExcused, achievements, subjects, startDate, endDate }) {
  const startKey = dateKey(startDate);
  const endKey = dateKey(endDate);
  const todayK = todayStr();
  // やることが持っている目標の一覧（[集計キー, 表示情報, 1回あたりの目標, 記録のフィールド名]）
  const goalsOf = (x) => {
    const out = [];
    const mins = Number(x.targetMinutes || x.durationMinutes || 30);
    if (x.measureTime !== false && mins > 0) out.push(["min", { icon: "⏱", label: "取り組んだ時間", unit: "min", unitText: "" }, mins, "minutes"]);
    if (x.measurePages) out.push(["pages", { icon: "📖", label: "ページ数", unit: "pages", unitText: "ページ" }, Number(x.targetPages || 5), "pages"]);
    if (x.measureProblems) out.push(["problems", { icon: "✏️", label: "問題数", unit: "problems", unitText: "問" }, Number(x.targetProblems || 10), "problems"]);
    if (x.measureCustom && Number(x.targetCustom) > 0) {
      const label = (x.customLabel || "").trim() || x.name;
      const unitText = (x.customUnit || "").trim();
      out.push([`c:${label}|${unitText}`, { icon: "🎯", label, unit: "custom", unitText }, Number(x.targetCustom), "custom"]);
    }
    return out;
  };
  // やること（スタンプのカード）ごとに別々のバーで集計する
  const metrics = {};
  const labelOf = (x, info, n) => {
    const dot = <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 999, background: x.color || "#9bb", marginRight: 2, verticalAlign: "middle" }} />;
    return { icon: dot, label: `${x.name}　${info.icon}${n > 1 ? (info.unit === "min" ? "時間" : info.label) : ""}` };
  };
  const metric = (x, key, info) => {
    const id = `${x.id}:${key}`;
    return metrics[id] || (metrics[id] = { key: id, ...info, ...labelOf(x, info, goalsOf(x).length), plan: 0, pace: 0, actual: 0, details: [] });
  };
  forEachPlannedCell(subjects, startDate, endDate, isExcused, (x, k) => {
    goalsOf(x).forEach(([key, info, target]) => {
      const m = metric(x, key, info);
      m.plan += target;
      if (k <= todayK) m.pace += target;
    });
  });
  Object.entries(achievements).forEach(([k, day]) => {
    if (k < startKey || k > endKey) return;
    Object.entries(day || {}).forEach(([sid, v]) => {
      const x = subjects.find((y) => y.id === sid);
      if (x && v) goalsOf(x).forEach(([key, info, , field]) => {
          const n = Number(v[field]) || 0;
          if (n <= 0) return;
          const m = metric(x, key, info);
          m.actual += n;
          m.details.push([k, n]);
        });
    });
  });
  const list = Object.values(metrics).filter((m) => m.plan > 0);
  if (list.length === 0) return null;
  list.forEach((m) => m.details.sort(([a], [b]) => (a < b ? -1 : 1)));
  const ink = "#0B3D62";

  return (
    <div style={progressCardStyle("rgba(11,61,98,0.22)")}>
      <div style={{ fontSize: 13, color: ink, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>📊 がんばりの合計</div>
      {list.map((m) => (
        <ProgressRow key={m.key} {...m} bigLabel goal={m.plan} startDate={startDate} endDate={endDate} ink={ink} track="#E6EEF3" />
      ))}
      <div style={{ fontSize: 11.5, color: "#8aa1b0", textAlign: "center", marginTop: 6, lineHeight: 1.5 }}>スタンプを押すと目標の値が記録され、「📝 メモ」で調整できます</div>
    </div>
  );
}

// ダイエット用：体重の推移グラフ（スケジュール期間内の記録だけを表示）
function WeightChart({ weights, startDate, endDate, target, onSaveWeight, onSaveTarget }) {
  const goal = Number(target) > 0 ? Number(target) : null;
  const startKey = dateKey(startDate);
  const endKey = dateKey(endDate);
  // 入力欄：日付は今日（期間外なら期間の端）を初期値に
  const todayK = todayStr();
  const defaultDay = todayK < startKey ? startKey : todayK > endKey ? endKey : todayK;
  const [day, setDay] = useState(defaultDay);
  const [val, setVal] = useState(weights[defaultDay] ? String(weights[defaultDay]) : "");
  const [goalVal, setGoalVal] = useState(goal ? String(goal) : "");
  const [editGoal, setEditGoal] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  // カードの横幅に合わせてグラフを描く
  const cardRef = useRef(null);
  const [cw, setCw] = useState(320);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setCw(Math.max(240, Math.round(el.clientWidth - 28)));
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  function pickDay(k) {
    setDay(k);
    setVal(weights[k] ? String(weights[k]) : "");
  }
  function save() {
    onSaveWeight(day, val);
    setSavedMsg(parseFloat(val) > 0 ? "記録しました" : "この日の記録を消しました");
    setTimeout(() => setSavedMsg(""), 1500);
  }
  const inputStyle = { padding: "8px 10px", borderRadius: 10, border: "2px solid #A9DEC4", fontSize: 16, fontFamily: "inherit", boxSizing: "border-box", background: "#fff", color: "#1E4A3B" };
  const btnStyle = { padding: "8px 14px", borderRadius: 10, border: "none", background: "#2C8A5F", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" };
  const entry = (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #CFE6D8" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <input type="date" value={day} min={startKey} max={endKey} onChange={(e) => e.target.value && pickDay(e.target.value)} style={{ ...inputStyle, width: 150 }} />
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.1"
          placeholder="例：62.5"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          style={{ ...inputStyle, width: 90 }}
        />
        <span style={{ fontWeight: 700, color: "#1E4A3B" }}>kg</span>
        <button onClick={save} style={btnStyle}>記録する</button>
        {savedMsg && <span style={{ fontSize: 12.5, color: "#2C8A5F", fontWeight: 700 }}>✓ {savedMsg}</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13, color: "#5d7d70" }}>
        {editGoal ? (
          <>
            🎯 目標体重
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="例：75.0"
              value={goalVal}
              onChange={(e) => setGoalVal(e.target.value)}
              style={{ ...inputStyle, width: 90, fontSize: 15, padding: "6px 8px" }}
            />
            kg
            <button
              onClick={() => {
                onSaveTarget(goalVal);
                setEditGoal(false);
              }}
              style={{ ...btnStyle, padding: "6px 12px", fontSize: 13 }}
            >
              決定
            </button>
          </>
        ) : (
          <button onClick={() => setEditGoal(true)} style={{ background: "none", border: "none", color: "#2C8A5F", fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: 0 }}>
            🎯 {goal ? `目標体重を変える（いま ${goal.toFixed(1)}kg）` : "目標体重を決める"}
          </button>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: "#8aa69a", marginTop: 6 }}>グラフの点をタップすると、その日の体重を直せます。空にして「記録する」で消せます。</div>
    </div>
  );
  const points = Object.entries(weights)
    .filter(([k, w]) => k >= startKey && k <= endKey && w > 0)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const card = {
    position: "relative",
    zIndex: 2,
    margin: "14px 18px 0",
    background: "#fff",
    borderRadius: 18,
    padding: "12px 14px",
    boxShadow: "0 10px 24px rgba(30,74,59,0.25)",
    boxSizing: "border-box",
  };
  if (points.length === 0) {
    return (
      <div style={card} ref={cardRef}>
        <div style={{ fontWeight: 800, color: "#1E4A3B", fontSize: 15 }}>⚖️ 体重の記録</div>
        {goal && <div style={{ fontSize: 13, fontWeight: 800, color: "#E07A4F", marginTop: 4 }}>目標 {goal.toFixed(1)}kg</div>}
        <div style={{ fontSize: 12.5, color: "#5d7d70", marginTop: 4 }}>下の欄に体重を入れると、ここにグラフが出ます。</div>
        {entry}
      </div>
    );
  }
  const first = points[0][1];
  const last = points[points.length - 1][1];
  const diff = Math.round((last - first) * 10) / 10;
  const vals = points.map(([, w]) => w).concat(goal ? [goal] : []);
  // 目盛りはきりのいい値（1kg単位）にそろえる
  let lo = Math.floor(Math.min(...vals) - 0.5);
  let hi = Math.ceil(Math.max(...vals) + 0.5);
  if ((hi - lo) % 2 === 1) hi += 1;
  const W = cw, H = 180, L = 34, R = 16, T = 12, B = 24;
  // 横軸は「最初の記録日〜最後の記録日」。記録が1つだけなら真ん中に置く
  const dayNum = (k) => {
    const [y, m, d] = k.split("-").map(Number);
    return Math.round(new Date(y, m - 1, d).getTime() / 86400000);
  };
  const d0 = dayNum(points[0][0]);
  const span = dayNum(points[points.length - 1][0]) - d0;
  const xOf = (k) => (span <= 0 ? (L + W - R) / 2 : L + ((W - L - R) * (dayNum(k) - d0)) / span);
  // 記録のあった日付を表示（重なる分は間引く。最後の日は必ず出す）
  const labelKeys = [];
  for (let i = 0; i < points.length; i++) {
    const k = points[i][0];
    const x = xOf(k);
    if (i === points.length - 1) {
      while (labelKeys.length && x - xOf(labelKeys[labelKeys.length - 1]) < 34) labelKeys.pop();
      labelKeys.push(k);
    } else if (!labelKeys.length || x - xOf(labelKeys[labelKeys.length - 1]) >= 34) {
      labelKeys.push(k);
    }
  }
  const mdKey = (k) => { const [, m, d] = k.split("-").map(Number); return `${m}/${d}`; };
  const yOf = (w) => T + ((H - T - B) * (hi - w)) / (hi - lo);
  const path = points.map(([k, w], i) => `${i === 0 ? "M" : "L"}${xOf(k).toFixed(1)} ${yOf(w).toFixed(1)}`).join(" ");
  const ticks = [hi, (hi + lo) / 2, lo];
  return (
    <div style={card} ref={cardRef}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800, color: "#1E4A3B", fontSize: 15 }}>⚖️ 体重の記録</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1E4A3B" }}>
          {goal && <span style={{ marginRight: 8 }}>目標 {goal.toFixed(1)}kg</span>}
          いま {last.toFixed(1)}kg
          {points.length > 1 && (
            <span style={{ marginLeft: 6, color: diff < 0 ? "#2C8A5F" : diff > 0 ? "#C0603F" : "#5d7d70" }}>
              （最初から {diff > 0 ? "+" : ""}{diff.toFixed(1)}kg）
            </span>
          )}
        </div>
      </div>
      {goal && (
        <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: last <= goal ? "#2C8A5F" : "#E07A4F" }}>
          {last <= goal ? "🎉 目標達成！" : `🎯 目標まで あと ${(Math.round((last - goal) * 10) / 10).toFixed(1)}kg`}
        </div>
      )}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block", margin: "6px 0 0" }}>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={yOf(v)} y2={yOf(v)} stroke="#E3EFE8" strokeWidth="1" />
            <text x={L - 4} y={yOf(v) + 3.5} fontSize="10.5" textAnchor="end" fill="#7a958a">{v}</text>
          </g>
        ))}
        {labelKeys.map((k) => (
          <text key={k} x={xOf(k)} y={H - 6} fontSize="10.5" textAnchor="middle" fill="#7a958a">{mdKey(k)}</text>
        ))}
        {goal && (
          <g>
            <line x1={L} x2={W - R} y1={yOf(goal)} y2={yOf(goal)} stroke="#E07A4F" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={W - R} y={yOf(goal) - 4} fontSize="10.5" textAnchor="end" fill="#E07A4F" fontWeight="700">目標 {goal}kg</text>
          </g>
        )}
        <path d={path} fill="none" stroke="#3E9A74" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map(([k, w]) => (
          <g key={k} onClick={() => pickDay(k)} style={{ cursor: "pointer" }}>
            <circle cx={xOf(k)} cy={yOf(w)} r="9" fill="transparent" />
            <circle cx={xOf(k)} cy={yOf(w)} r="3.5" fill={k === day ? "#3E9A74" : "#fff"} stroke="#3E9A74" strokeWidth="2" />
          </g>
        ))}
      </svg>
      {entry}
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
        <span style={{ fontSize: 46 }}>{theme === "boy" ? "⚔️" : theme === "diet" ? "💪" : "🐚"}</span>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0B3D62", marginTop: 4 }}>今日は全部できたね！</div>
      </div>
    </div>
  );
}

function ScheduleCompleteCelebration({ onClose, title, reward, theme, variantKey, awarded, stars }) {
  const variant = getVariant(theme, variantKey);
  // A schedule that just reached 100% is Master — Lv.20.
  const cardStats = awarded ? computeCardStats(variant.species, MASTER_LEVEL) : null;
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
            <div style={styles.cardGetLabel}>🎴 ファミリアカードげっと！</div>
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
            {cardStats && (
              <div style={styles.cardStatsGrid}>
                {STAT_KEYS.map((k) => (
                  <div key={k} style={styles.cardStatChip}>
                    <span style={styles.cardStatLabel}>{STAT_LABELS[k]}</span>
                    <span style={styles.cardStatValue}>{cardStats[k]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {reward ? (
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

function HatchNamingModal({ theme, variantKey, defaultName, onSave, onSkip }) {
  const [name, setName] = useState("");
  const variant = getVariant(theme, variantKey);
  return (
    <div style={styles.weekCelebrateOverlay}>
      <Confetti />
      <div style={styles.weekCelebrateCard}>
        <h2 style={styles.weekCelebrateTitle}>たまごが かえったよ！</h2>
        <p style={{ ...styles.weekCelebrateSub, fontSize: 22, fontWeight: 800, color: "#0B3D62" }}>なまえを つけてあげよう</p>
        <div style={styles.cardGetBox}>
          <div
            style={{
              ...styles.cardGetImgWrap,
              background: variant.cardBg,
            }}
          >
            <img
              src={stageImage(variant.species, 15)}
              alt={variant.name}
              style={{
                ...styles.cardGetImg,
                filter: variant.filter === "none" ? "none" : variant.filter,
              }}
            />
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder={defaultName}
            className="hatchNameInput"
            style={{
              marginTop: 12,
              width: "100%",
              boxSizing: "border-box",
              textAlign: "center",
              padding: "10px 12px",
              borderRadius: 12,
              border: "2px solid #BFE3F0",
              fontSize: 17,
              fontWeight: 800,
              color: "#0B3D62",
              fontFamily: "inherit",
            }}
          />
        </div>
        <button style={styles.weekCelebrateBtn} onClick={() => onSave(name)}>
          きめる
        </button>
        {onSkip && (
          // The kid should get to choose their own mascot's name — if a
          // parent happens to be the one who opens the app right after it
          // hatches, this lets them back out without naming it for them.
          // Naming later just re-shows this same modal next time.
          <button style={styles.hatchSkipBtn} onClick={onSkip}>
            あとで（大人の方はこちら）
          </button>
        )}
      </div>
    </div>
  );
}

// Shown before the evolution animation itself — lets whoever opened the
// app right now choose whether to watch it immediately ("声をかける") or
// leave it for later ("放っておく"). Exists so a parent who unlocks the
// app for something unrelated can't accidentally spoil the reveal before
// the kid gets to see it: choosing "放っておく" doesn't record anything,
// so the same prompt comes back next time the app is opened instead.
function EvolutionNoticeModal({ mascotName, onTalk, onLeave }) {
  return (
    <div style={styles.weekCelebrateOverlay}>
      <div style={styles.weekCelebrateCard}>
        <h2 style={styles.weekCelebrateTitle}>{mascotName ? `${mascotName}の様子が…` : "なにかの様子が…"}</h2>
        <p style={styles.weekCelebrateSub}>なんだか いつもと ちがうみたい…</p>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={{ ...styles.weekCelebrateBtn, flex: 1, margin: 0, padding: "12px 8px", fontSize: 15, background: "#8B98A8" }} onClick={onLeave}>
            放っておく
          </button>
          <button style={{ ...styles.weekCelebrateBtn, flex: 1, margin: 0, padding: "12px 8px", fontSize: 15 }} onClick={onTalk}>
            声をかける
          </button>
        </div>
      </div>
    </div>
  );
}

// Pokémon-style evolution reveal: the current stage's art shakes and
// flashes white ("charging"), then bursts into the new stage with a
// spinning ray-of-light burst and a bounce-in pop. Pure CSS animation on
// the same stage art already used elsewhere — see the .evo* keyframes in
// GlobalStyle — so it needs no extra art assets.
function EvolutionCelebration({ fromSrc, toSrc, filter, cardBg, isFinal, stageIdx, mascotName, onClose }) {
  const [phase, setPhase] = useState("charge"); // charge -> flash -> reveal
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("flash"), 1300);
    const t2 = setTimeout(() => setPhase("reveal"), 1620);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  const imgFilter = filter && filter !== "none" ? filter : "none";
  return (
    <div style={{ ...styles.weekCelebrateOverlay, background: "rgba(11,61,98,0.94)" }}>
      {phase === "reveal" && <Confetti />}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
          boxSizing: "border-box",
          animation: "popIn 0.35s ease-out",
        }}
      >
        <h2 style={{ ...styles.weekCelebrateTitle, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
          {phase === "reveal" ? (isFinal ? "さいだい しんか！" : "しんか した！") : "・・・？"}
        </h2>
        {phase !== "reveal" && <p style={{ ...styles.weekCelebrateSub, color: "#EAF7FB" }}>なにかが おきている…</p>}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: phase === "reveal" ? 8 : 20 }}>
          <div
            style={{
              width: "min(78vw, 62vh, 440px)",
              height: "min(78vw, 62vh, 440px)",
              borderRadius: 32,
              background: cardBg,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 4px rgba(255,255,255,0.6)",
              padding: 18,
              boxSizing: "border-box",
            }}
          >
            {phase === "reveal" && <div className="evoRays" />}
            {/* The color filter (hue-rotate for the mascot's variant) lives
                on this wrapper, separate from the shake/pulse/pop
                animation on the <img> itself — animating `filter` on the
                same element as a *different* inline filter would let the
                keyframes silently overwrite the color for the animation's
                duration, which is why every color used to flash back to
                the base one during this scene. */}
            <div style={{ width: "100%", height: "100%", filter: imgFilter }}>
              {phase !== "reveal" ? (
                <img key="from" src={fromSrc} alt="" className="evoCharge" style={styles.cardGetImg} />
              ) : (
                <img key="to" src={toSrc} alt="" className="evoReveal" style={{ ...styles.cardGetImg, position: "relative", zIndex: 1 }} />
              )}
            </div>
            {phase === "flash" && <div className="evoFlash" />}
          </div>
          {phase === "reveal" && mascotName && (
            <div style={{ ...styles.cardGetName, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.5)", fontSize: 20, marginTop: 14 }}>
              {mascotName}
              {stageLabel(stageIdx) && (
                <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.85, marginLeft: 6 }}>（{stageLabel(stageIdx)}）</span>
              )}
            </div>
          )}
        </div>
        {phase === "reveal" && (
          <button style={styles.weekCelebrateBtn} onClick={onClose}>
            とじる
          </button>
        )}
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

// Purely decorative background flourishes (waves/shells/sparkles for the
// girl theme; compass/embers/claw-marks for the boy theme) — kept as
// absolute, non-interactive background art. The growth-mascot image and
// its name live in GrowthMascotArt instead, laid out inline in the flex
// row next to the mascot icon/speech bubble (see styles.mascotRow) rather
// than pinned to a fixed pixel offset — that fixed offset used to assume
// how many lines the header buttons above would wrap onto, and on
// narrower devices where they wrap onto more lines it could end up
// overlapping them.
function CornerDecor({ theme }) {
  if (theme === "boy") {
    return (
      <>
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
  if (theme === "diet") {
    return (
      <>
        {/* leaves, top right */}
        <svg style={{ position: "absolute", top: 8, right: -6, opacity: 0.45 }} width="110" height="90" viewBox="0 0 110 90">
          <path d="M20 70C30 30 60 12 100 10 98 48 70 74 20 70z" fill="#CFF3DE" />
          <path d="M22 68C46 48 70 30 96 14" stroke="#2C6E55" strokeWidth="2" fill="none" />
        </svg>
        {/* water drop, bottom right */}
        <svg style={{ position: "absolute", bottom: 8, right: 4, opacity: 0.45 }} width="70" height="90" viewBox="0 0 70 90">
          <path d="M35 6C48 28 60 42 60 58a25 25 0 01-50 0C10 42 22 28 35 6z" fill="#E6F7F9" />
        </svg>
        {/* small leaf, left */}
        <svg style={{ position: "absolute", top: "50%", left: -8, opacity: 0.35 }} width="70" height="70" viewBox="0 0 70 70">
          <path d="M10 60C14 30 34 12 62 8 60 36 42 58 10 60z" fill="#fff" />
        </svg>
      </>
    );
  }
  return (
    <>
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

// The growth-mascot image + its name, sized responsively with clamp() and
// laid out as a flex item (an "invisible table cell") in styles.mascotRow
// — always the same row and right edge as the mascot icon/speech bubble,
// on every device, instead of a fixed-pixel absolute box.
function GrowthMascotArt({ theme, pct, variantKey, mascotName }) {
  const isBoy = theme === "boy";
  const variant = getVariant(theme, variantKey);
  const src = stageImage(variant.species, pct);
  const colorFilter = variant.filter;
  const shadow = isBoy ? "drop-shadow(0 4px 8px rgba(0,0,0,0.35))" : "drop-shadow(0 4px 8px rgba(11,61,98,0.3))";
  return (
    <div style={styles.growthMascotWrap}>
      <div style={styles.growthMascotImgBox}>
        <img
          src={src}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center top",
            opacity: isBoy ? 0.9 : 1,
            filter: colorFilter === "none" ? shadow : `${colorFilter} ${shadow}`,
          }}
        />
      </div>
      {mascotName && (
        <div
          style={{
            ...styles.mascotNameLabel,
            position: "static",
            width: "100%",
            marginTop: 2,
            color: isBoy ? "#F4E9CE" : "#fff",
            textShadow: isBoy ? "0 1px 4px rgba(0,0,0,0.75)" : "0 1px 3px rgba(0,0,0,0.45)",
            fontSize: mascotNameFontSize(mascotName),
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {mascotName}
        </div>
      )}
    </div>
  );
}

// Keeps the mascot's name on one line at any length instead of wrapping —
// shrinks the font size as the name gets longer rather than letting it
// break onto a second line (which threw off the row height it shares with
// the mascot icon/speech bubble).
function mascotNameFontSize(name) {
  const len = (name || "").length;
  if (len <= 5) return 12;
  if (len <= 7) return 11;
  if (len <= 9) return 10;
  if (len <= 12) return 9;
  if (len <= 16) return 8;
  return 7;
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



function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Yuji+Syuku&family=Kaisei+Decol:wght@400;700&family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap');
      /* 入力欄の例示（プレースホルダー）は薄いグレーで、入力した文字と見分けやすく */
      /* メモボタン：狭いマスでは「📝」と「メモ」を上下2段にして収める */
      @media (max-width: 600px) {
        .memoBtn { flex-direction: column; gap: 0 !important; line-height: 1.1; font-size: 10px !important; padding: 3px 0 !important; }
      }
      .noScrollbar { scrollbar-width: none; }
      .noScrollbar::-webkit-scrollbar { display: none; }
      input::placeholder, textarea::placeholder {
        color: #cbd5db;
        font-weight: 400;
        opacity: 1;
      }
      .hatchNameInput::placeholder {
        color: #d3dee4;
        font-weight: 400;
        opacity: 1;
      }
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
      @keyframes evoShake {
        0%, 100% { transform: translateX(0) rotate(0deg); }
        15% { transform: translateX(-3px) rotate(-3deg); }
        30% { transform: translateX(3px) rotate(3deg); }
        45% { transform: translateX(-3px) rotate(-3deg); }
        60% { transform: translateX(3px) rotate(3deg); }
        80% { transform: translateX(-1px) rotate(0deg); }
      }
      @keyframes evoPulseWhite {
        0%, 100% { filter: brightness(1) saturate(1); }
        50% { filter: brightness(2.4) saturate(0.25); }
      }
      .evoCharge {
        animation: evoShake 0.45s ease-in-out infinite, evoPulseWhite 0.45s ease-in-out infinite;
      }
      @keyframes evoFlashPulse {
        0% { opacity: 0; }
        45% { opacity: 1; }
        100% { opacity: 0; }
      }
      .evoFlash {
        position: absolute;
        inset: 0;
        background: #fff;
        animation: evoFlashPulse 0.32s ease-out forwards;
      }
      @keyframes evoRevealPop {
        0% { transform: scale(0.25); opacity: 0; }
        60% { transform: scale(1.18); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .evoReveal {
        animation: evoRevealPop 0.5s cubic-bezier(.34,1.56,.64,1) both;
      }
      @keyframes evoRaysSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .evoRays {
        position: absolute;
        inset: -60%;
        background: repeating-conic-gradient(from 0deg, rgba(255,255,255,0.6) 0deg 8deg, transparent 8deg 24deg);
        animation: evoRaysSpin 3s linear infinite;
        opacity: 0.75;
        mix-blend-mode: screen;
        pointer-events: none;
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
  customGoalCaption: { fontSize: 11, fontWeight: 700, color: "#7c98aa", whiteSpace: "nowrap" },
  measureUnit: { fontSize: 14, fontWeight: 700, color: "#4a6c85" },
  intervalInput: { width: 68, padding: "8px 8px", borderRadius: 10, border: "2px solid #BFE3F0", fontSize: 18, fontFamily: "inherit", textAlign: "center" },
  weekdayPicker: { display: "flex", gap: 6, flexWrap: "wrap" },
  weekdayToggle: { width: 42, height: 42, borderRadius: 10, border: "2px solid", cursor: "pointer", fontSize: 16, color: "#0B3D62", fontFamily: "inherit" },

  addBtn: { display: "inline-flex", alignItems: "center", gap: 4, background: "#14588C", color: "#fff", border: "none", borderRadius: 14, padding: "12px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 18, marginBottom: 20 },
  saveBtn: { width: "100%", padding: "16px 0", borderRadius: 16, border: "none", background: "linear-gradient(135deg, #2FA36B, #1F7A4F)", color: "#fff", fontWeight: 900, fontSize: 20, cursor: "pointer", boxShadow: "0 8px 18px rgba(31,122,79,0.35)", fontFamily: "inherit" },
  deleteScheduleBtn: { width: "100%", padding: "14px 0", borderRadius: 16, border: "2px solid #FBD4DB", background: "#fff", color: "#E0526B", fontWeight: 700, fontSize: 17, cursor: "pointer", fontFamily: "inherit", marginTop: 14 },

  // overflow は "clip"（"hidden" だと凡例の position: sticky が効かないため）
  mainWrap: { position: "relative", background: oceanBg, minHeight: 560, overflow: "clip", paddingBottom: 30 },
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
  growthMascotWrap: {
    flexShrink: 0,
    width: "clamp(56px, 20vw, 92px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  growthMascotImgBox: { width: "100%", aspectRatio: "1" },
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

  subjectSummaryRow: { position: "relative", zIndex: 2, display: "flex", flexWrap: "wrap", gap: 6, padding: "0 18px", marginTop: 8, justifyContent: "center" },
  // やることのカード：控えめなサイズ（カレンダーや進捗表より目立ちすぎないように）
  subjectSpotlight: { display: "flex", alignItems: "center", gap: 8, borderRadius: 14, padding: "7px 12px", boxShadow: "0 4px 10px rgba(11,61,98,0.18)", justifyContent: "center", flexWrap: "wrap" },
  subjectSpotlightIcon: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 10px rgba(0,0,0,0.2)" },
  subjectSpotlightTextWrap: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" },
  subjectSpotlightName: { fontFamily: "'Kaisei Decol', serif", fontSize: 16, fontWeight: 700, color: "#0B3D62", lineHeight: 1.2 },
  subjectSpotlightDuration: { fontSize: 12, fontWeight: 700, color: "#0B3D62", marginTop: 1 },
  subjectSpotlightFreq: { fontSize: 11, fontWeight: 700, color: "#3d6a86", marginTop: 1 },
  backlogBadgeBig: { fontSize: 11.5, color: "#B5651D", background: "#FFE9B3", borderRadius: 999, padding: "3px 8px", fontWeight: 800, boxShadow: "0 1px 3px rgba(0,0,0,0.12)" },

  calendarLegendRow: { position: "relative", zIndex: 2, display: "flex", gap: 14, padding: "10px 18px 0", flexWrap: "wrap", justifyContent: "center" },
  calendarLegendItem: { display: "inline-flex", alignItems: "center", gap: 6, color: "#EAF7FB", fontSize: 13, fontWeight: 700 },
  legendDot: { width: 12, height: 12, borderRadius: "50%", display: "inline-block" },

  calendarPanel: { position: "relative", zIndex: 2, margin: "12px 18px 0", background: "linear-gradient(180deg,#FFFDF8,#FFF3E4)", borderRadius: 22, padding: 12, boxShadow: "0 16px 34px rgba(11,61,98,0.3)" },
  stampLegend: { position: "sticky", top: 56, zIndex: 5, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 12px", margin: "0 0 10px", padding: "8px 10px", background: "rgba(255,253,248,0.96)", borderRadius: 14, boxShadow: "0 4px 12px rgba(11,61,98,0.18)", border: "1px solid #F0E3CC" },
  stampLegendItem: { display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0 },
  stampLegendIcon: { width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stampLegendName: { fontSize: 13, fontWeight: 800, color: "#0B3D62", whiteSpace: "nowrap", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" },
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
  memoBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3, background: "#EAF7FB", border: "1px dashed #BFE3F0", color: "#7c98aa", borderRadius: 999, padding: "4px 2px", width: "86%", maxWidth: 150, minHeight: 26, boxSizing: "border-box", whiteSpace: "nowrap", overflow: "hidden", fontSize: 11.5, fontWeight: 700, cursor: "pointer", marginTop: 2 },
  memoBtnFilled: { background: "#FFF3B0", border: "1px solid #E0C24A", color: "#8a6d00" },
  dayHeadTodayTag: { fontSize: 9, color: "#fff", background: "#14588C", borderRadius: 999, padding: "1px 5px", fontWeight: 900 },
  dayHeadTrophy: { fontSize: 12 },

  headBubble: { width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 3px 6px rgba(0,0,0,0.15)" },
  headLabel: { fontSize: 17, fontWeight: 800, color: "#0B3D62", lineHeight: 1.3 },
  backlogBadge: { fontSize: 13, color: "#B5651D", background: "#FFE9B3", borderRadius: 999, padding: "2px 8px", display: "inline-block", fontWeight: 800 },
  durationBadge: { fontSize: 13, color: "#14588C", background: "#DCEEF7", borderRadius: 999, padding: "2px 8px", display: "inline-block", fontWeight: 800 },

  dayStampsRow: { display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center", width: "100%" },
  stampSlot: { flex: "1 1 0", minWidth: 26, maxWidth: 90 },
  excuseBtn: { display: "block", margin: "3px auto 0", border: "1px dashed #B9A8E0", background: "#F4F0FF", color: "#6B52AE", borderRadius: 999, padding: "1px 6px", fontSize: 9, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  excusedStamp: { width: "100%", aspectRatio: "1", borderRadius: "50%", border: "3px solid #B9A8E0", background: "radial-gradient(circle at 35% 30%, #F4F0FF, #D9CFF5)", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" },
  achvMiniLabel: { fontSize: 8.5, fontWeight: 800, color: "#5C3A21", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", textAlign: "center" },
  stampCellWrap: { position: "relative", width: "100%" },
  stampCircle: { width: "100%", aspectRatio: "1", padding: 0, borderRadius: "50%", border: "3px dashed", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", overflow: "visible", boxSizing: "border-box" },
  stampPopWrap: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", animation: "stampPop 0.45s cubic-bezier(.34,1.56,.64,1)" },
  x2Badge: { position: "absolute", top: -8, right: -8, background: "#FF6B8A", color: "#fff", fontSize: 11, fontWeight: 900, borderRadius: 999, padding: "2px 6px", boxShadow: "0 2px 5px rgba(0,0,0,0.3)" },
  undoBadge: { position: "absolute", top: -8, left: -8, width: 22, height: 22, borderRadius: "50%", background: "#8aa4b4", color: "#fff", fontSize: 14, fontWeight: 900, border: "2px solid #fff", boxShadow: "0 2px 5px rgba(0,0,0,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 },
  commentBubble: { position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", background: "#fff", color: "#FF6B8A", fontSize: 12, fontWeight: 900, padding: "3px 8px", borderRadius: 999, boxShadow: "0 4px 10px rgba(0,0,0,0.2)", animation: "floatComment 1.3s ease-out forwards", pointerEvents: "none", zIndex: 5 },
  dashMark: { color: "#c9d8e0", fontSize: 15, fontWeight: 700 },

  tabBar: { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 998, background: "rgba(11,61,98,0.92)", paddingBottom: "calc(6px + env(safe-area-inset-bottom))", boxShadow: "0 -6px 16px rgba(0,0,0,0.25)", backdropFilter: "blur(6px)" },
  toast: { position: "fixed", left: "50%", bottom: 76, transform: "translateX(-50%)", background: "#0B3D62", color: "#fff", padding: "12px 22px", borderRadius: 999, fontSize: 17, fontWeight: 700, boxShadow: "0 10px 24px rgba(0,0,0,0.3)", zIndex: 50, maxWidth: "90%", textAlign: "center" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(11,61,98,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 20 },
  modalCard: { background: "#fff", borderRadius: 20, padding: 26, maxWidth: 360, width: "100%", textAlign: "center", animation: "popIn 0.25s ease-out" },
  noteModalCard: { background: "#fff", borderRadius: 20, maxWidth: 360, width: "100%", textAlign: "center", animation: "popIn 0.25s ease-out", display: "flex", flexDirection: "column", maxHeight: "88vh", overflow: "hidden" },
  noteModalScrollBody: { padding: "26px 26px 0", overflowY: "auto", flex: "1 1 auto", minHeight: 0 },
  noteModalFooter: { display: "flex", gap: 10, padding: "16px 26px 26px", flexShrink: 0, borderTop: "1px solid #E4EFF5" },
  modalTitle: { margin: "0 0 8px", fontSize: 22, color: "#0B3D62" },
  modalMsg: { fontSize: 17, color: "#4a6c85", lineHeight: 1.6, marginBottom: 18 },
  noteTextarea: { width: "100%", padding: "12px 14px", borderRadius: 14, border: "2px solid #BFE3F0", fontSize: 16, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#fff", resize: "vertical", marginBottom: 18, color: "#0B3D62" },
  parentCommentReadOnly: {
    background: "#FFF7E0",
    border: "2px solid #F4C95D",
    borderRadius: 14,
    padding: "12px 14px",
    marginBottom: 18,
  },
  parentCommentLabel: { fontSize: 12.5, fontWeight: 800, color: "#B5651D", marginBottom: 4 },
  parentCommentText: { fontSize: 15, color: "#5C3A21", whiteSpace: "pre-wrap", lineHeight: 1.5 },
  achievementSection: { textAlign: "left", background: "#FFF7EC", border: "2px solid #F0DBA6", borderRadius: 14, padding: 12, marginBottom: 16 },
  achievementSectionLabel: { fontSize: 13, fontWeight: 600, color: "#A27C55", margin: "0 0 8px" },
  achievementSubjectRow: { marginBottom: 8 },
  achievementSubjectName: { fontWeight: 900, fontSize: 14.5, marginBottom: 4 },
  achievementFieldsRow: { display: "flex", flexWrap: "wrap", gap: 10 },
  achievementField: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 500, color: "#8A6D55" },
  achievementInput: { width: 56, padding: "5px 6px", borderRadius: 8, border: "2px solid #E0C68A", fontSize: 14, fontFamily: "inherit", textAlign: "center" },
  recordsListCard: { background: "#fff", borderRadius: 20, padding: 24, maxWidth: 420, width: "100%", textAlign: "left", animation: "popIn 0.25s ease-out", maxHeight: "82vh", display: "flex", flexDirection: "column" },
  recordsListScroll: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, paddingRight: 2 },
  recordEntryCard: { background: "#FFF7EC", border: "2px solid #F0DBA6", borderRadius: 14, padding: "10px 14px" },
  recordEntryDate: { fontSize: 14, fontWeight: 900, color: "#8B5E34", marginBottom: 4 },
  recordEntryAchv: { fontSize: 13.5, fontWeight: 800, marginBottom: 2 },
  recordEntryNote: { fontSize: 14, color: "#4a6c85", lineHeight: 1.6, marginTop: 4, whiteSpace: "pre-wrap" },
  recordEntryParentComment: { fontSize: 13.5, color: "#B5651D", lineHeight: 1.6, marginTop: 6, whiteSpace: "pre-wrap", background: "#FFF7E0", borderRadius: 10, padding: "6px 10px" },
  replyOpenBtn: {
    marginTop: 10,
    background: "none",
    border: "none",
    color: "#3E6FBF",
    fontWeight: 800,
    fontSize: 13.5,
    padding: 0,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  replyForm: { marginTop: 10, background: "#F5F9FB", borderRadius: 12, padding: 10 },
  replyNameInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    borderRadius: 10,
    border: "2px solid #BFE3F0",
    fontSize: 13.5,
    fontFamily: "inherit",
    marginBottom: 6,
    color: "#0B3D62",
  },
  replyTextarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    borderRadius: 10,
    border: "2px solid #BFE3F0",
    fontSize: 14,
    fontFamily: "inherit",
    resize: "vertical",
    marginBottom: 8,
    color: "#0B3D62",
  },
  replyCancelBtn: { flex: 1, padding: "8px 0", borderRadius: 10, border: "none", background: "#E5EEF2", color: "#4a6c85", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5 },
  replySubmitBtn: { flex: 1, padding: "8px 0", borderRadius: 10, border: "none", background: "#3E6FBF", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5 },
  commentEditBtn: { border: "none", background: "none", color: "#B5651D", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" },
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
  // まだ押していないマスの目印は薄く（押したスタンプと見分けやすくするため）
  stampHintIcon: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.35, filter: "grayscale(0.4)" },
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
  cardStatsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 10, width: "100%" },
  cardStatChip: {
    background: "#F5F9FB",
    borderRadius: 10,
    padding: "4px 2px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  cardStatLabel: { fontSize: 10, fontWeight: 700, color: "#7c98aa" },
  cardStatValue: { fontSize: 14, fontWeight: 900, color: "#0B3D62" },
  mascotNameLabel: {
    position: "absolute",
    textAlign: "center",
    fontSize: 12,
    fontWeight: 800,
    color: "#fff",
    textShadow: "0 1px 3px rgba(0,0,0,0.45)",
    pointerEvents: "none",
    zIndex: 0,
    fontFamily: "'Kaisei Decol', serif",
  },
  rewardCard: { background: "linear-gradient(135deg,#FFF3B0,#FFD6E0)", borderRadius: 16, padding: "16px 22px", marginBottom: 18, boxShadow: "0 6px 16px rgba(0,0,0,0.15)" },
  rewardLabel: { fontSize: 15, fontWeight: 900, color: "#B5651D", marginBottom: 4 },
  rewardText: { fontSize: 21, fontWeight: 900, color: "#0B3D62", fontFamily: "'Kaisei Decol', serif", lineHeight: 1.4 },
  weekCelebrateBtn: { display: "block", margin: "0 auto", padding: "12px 32px", borderRadius: 999, border: "none", background: "#14588C", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 18 },
  hatchSkipBtn: {
    display: "block",
    margin: "10px auto 0",
    padding: "6px 10px",
    borderRadius: 999,
    border: "none",
    background: "none",
    color: "#8296a8",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    textDecoration: "underline",
  },
};
