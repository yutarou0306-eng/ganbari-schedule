// Color variants for the growth mascots. 男の子用 has one species (dragon,
// 5 colors). 女の子用 has many species — pegasus (5 colors, the
// original — treated as "unicorn" for stats purposes, see STATS below),
// fairy / magical cat (3 colors each, added later, kept as flavor-only
// species with average stats), and tiger / phoenix / fenrir / griffon /
// swamp princess / mermaid (3 colors each, added later still, each with
// its own stat leanings). Most colors are produced with a CSS `filter` on
// top of a single base art asset per species/stage rather than needing
// separate art per color; a couple of "native" colors use no filter since
// the base art is already that color.
//
// Shared by App.jsx (growth art + the "schedule complete" card reveal)
// and ProfileRoot.jsx (the collected-cards list + breeding), so a
// schedule's `config.mascotVariant` means the same thing everywhere.

// Growth-stage art per species, ordered egg → fully grown. Dragon and
// pegasus have 6 hand-drawn stages; everything else has 5 (no separate
// "kids" stage between infant and adult).
const PEGASUS_STAGES = ["/pegasus-egg.png", "/pegasus-baby.png", "/pegasus-infant.png", "/pegasus-adult.png", "/pegasus-master.png"];

const STAGE_FILES = {
  dragon: ["/egg.png", "/baby.png", "/infant.png", "/kids.png", "/adult.png", "/master.png"],
  pegasus: PEGASUS_STAGES,
  fairy: ["/fairy-egg.png", "/fairy-baby.png", "/fairy-infant.png", "/fairy-adult.png", "/fairy-master.png"],
  cat: ["/cat-egg.png", "/cat-baby.png", "/cat-infant.png", "/cat-adult.png", "/cat-master.png"],
  tiger: ["/tiger-egg.png", "/tiger-baby.png", "/tiger-infant.png", "/tiger-adult.png", "/tiger-master.png"],
  phoenix: ["/phoenix-egg.png", "/phoenix-baby.png", "/phoenix-infant.png", "/phoenix-adult.png", "/phoenix-master.png"],
  fenrir: ["/fenrir-egg.png", "/fenrir-baby.png", "/fenrir-infant.png", "/fenrir-adult.png", "/fenrir-master.png"],
  griffon: ["/griffon-egg.png", "/griffon-baby.png", "/griffon-infant.png", "/griffon-adult.png", "/griffon-master.png"],
  swamp: ["/swamp-egg.png", "/swamp-baby.png", "/swamp-infant.png", "/swamp-adult.png", "/swamp-master.png"],
  mermaid: ["/mermaid-egg.png", "/mermaid-baby.png", "/mermaid-infant.png", "/mermaid-adult.png", "/mermaid-master.png"],
};

// Picks the growth-stage index (0 = still an egg, higher = further grown)
// for a species at a given completion percentage. 6-stage species use
// 20%-wide bands; 5-stage species use slightly wider bands since they
// have one fewer stage in between.
export function stageIndex(species, pct) {
  const files = STAGE_FILES[species] || STAGE_FILES.pegasus;
  if (files.length >= 6) {
    if (pct >= 90) return 5;
    if (pct >= 70) return 4;
    if (pct >= 50) return 3;
    if (pct >= 30) return 2;
    if (pct >= 10) return 1;
    return 0;
  }
  if (pct >= 85) return 4;
  if (pct >= 60) return 3;
  if (pct >= 35) return 2;
  if (pct >= 15) return 1;
  return 0;
}

// Picks the right growth-stage image for a species at a given completion
// percentage.
export function stageImage(species, pct) {
  const files = STAGE_FILES[species] || STAGE_FILES.pegasus;
  return files[stageIndex(species, pct)];
}

// Picks a growth-stage image by explicit stage index rather than a
// percentage — used for the evolution animation, which needs the exact
// "before" and "after" art for a stage jump it already knows the indices
// of. Clamped so an out-of-range index degrades to the nearest real stage
// instead of returning undefined.
export function stageImageAt(species, index) {
  const files = STAGE_FILES[species] || STAGE_FILES.pegasus;
  const i = Math.max(0, Math.min(files.length - 1, index));
  return files[i];
}

// How many growth stages a species has — the evolution effect uses this to
// know it's showing the final (master) stage, where there's nothing further
// to grow into.
export function stageCount(species) {
  const files = STAGE_FILES[species] || STAGE_FILES.pegasus;
  return files.length;
}

export const DRAGON_VARIANTS = [
  {
    key: "blue",
    species: "dragon",
    name: "ブルードラゴン",
    filter: "none",
    cardBg: "linear-gradient(135deg,#5EB3E8,#0B3D62)",
  },
  {
    key: "red",
    species: "dragon",
    name: "レッドドラゴン",
    filter: "hue-rotate(150deg) saturate(1.4) brightness(1.02)",
    cardBg: "linear-gradient(135deg,#FF9B8A,#B0261E)",
  },
  {
    key: "green",
    species: "dragon",
    name: "グリーンドラゴン",
    filter: "hue-rotate(270deg) saturate(1.25)",
    cardBg: "linear-gradient(135deg,#8FD98A,#20692B)",
  },
  {
    key: "yellow",
    species: "dragon",
    name: "イエロードラゴン",
    filter: "hue-rotate(200deg) saturate(1.6) brightness(1.15)",
    cardBg: "linear-gradient(135deg,#FFE27A,#C98A12)",
  },
  {
    key: "purple",
    species: "dragon",
    name: "パープルドラゴン",
    filter: "hue-rotate(70deg) saturate(1.3)",
    cardBg: "linear-gradient(135deg,#D9A6EF,#5A1E80)",
  },
];

const PEGASUS_VARIANTS = [
  {
    key: "rainbow",
    species: "pegasus",
    name: "レインボーペガサス",
    filter: "none",
    cardBg: "linear-gradient(135deg,#FFD6E0,#C9B6FF,#B6E3FF)",
  },
  {
    key: "sunset",
    species: "pegasus",
    name: "サンセットペガサス",
    filter: "hue-rotate(-40deg) saturate(2) brightness(1.05)",
    cardBg: "linear-gradient(135deg,#FFB37B,#FF6F91)",
  },
  {
    key: "starlight",
    species: "pegasus",
    name: "スターライトペガサス",
    filter: "hue-rotate(160deg) saturate(2)",
    cardBg: "linear-gradient(135deg,#9AC8FF,#33459E)",
  },
  {
    key: "blossom",
    species: "pegasus",
    name: "ブロッサムペガサス",
    filter: "hue-rotate(60deg) saturate(2)",
    cardBg: "linear-gradient(135deg,#FFC1E3,#D6438D)",
  },
  {
    key: "emerald",
    species: "pegasus",
    name: "エメラルドペガサス",
    filter: "hue-rotate(-110deg) saturate(2)",
    cardBg: "linear-gradient(135deg,#8CE6C0,#137A55)",
  },
];

const FAIRY_VARIANTS = [
  {
    key: "fairy-red",
    species: "fairy",
    name: "レッドフェアリー",
    filter: "hue-rotate(-30deg) saturate(1.6)",
    cardBg: "linear-gradient(135deg,#FFA6A6,#C6262E)",
  },
  {
    key: "fairy-blue",
    species: "fairy",
    name: "ブルーフェアリー",
    filter: "hue-rotate(180deg) saturate(1.6)",
    cardBg: "linear-gradient(135deg,#A6E0FF,#1F6FB8)",
  },
  {
    key: "fairy-green",
    species: "fairy",
    name: "グリーンフェアリー",
    filter: "hue-rotate(90deg) saturate(0.7) brightness(1.1)",
    cardBg: "linear-gradient(135deg,#B9F0A6,#2F8F3B)",
  },
];

const CAT_VARIANTS = [
  {
    key: "cat-blue",
    species: "cat",
    name: "ブルーマジカルキャット",
    filter: "none",
    cardBg: "linear-gradient(135deg,#9AB3F5,#243E8C)",
  },
  {
    key: "cat-red",
    species: "cat",
    name: "レッドマジカルキャット",
    filter: "hue-rotate(110deg) saturate(1.3)",
    cardBg: "linear-gradient(135deg,#FFA6A6,#A32131)",
  },
  {
    key: "cat-green",
    species: "cat",
    name: "グリーンマジカルキャット",
    filter: "hue-rotate(230deg) saturate(1.2)",
    cardBg: "linear-gradient(135deg,#A6E8B0,#227A4E)",
  },
];

const TIGER_VARIANTS = [
  {
    key: "tiger-red",
    species: "tiger",
    name: "レッドタイガー",
    filter: "none",
    cardBg: "linear-gradient(135deg,#FFB870,#B0430E)",
  },
  {
    key: "tiger-blue",
    species: "tiger",
    name: "ブルータイガー",
    filter: "hue-rotate(216deg) saturate(1.3)",
    cardBg: "linear-gradient(135deg,#8CA6FF,#1E2C8C)",
  },
  {
    key: "tiger-green",
    species: "tiger",
    name: "グリーンタイガー",
    filter: "hue-rotate(96deg) saturate(1.3)",
    cardBg: "linear-gradient(135deg,#9FE68A,#276B1E)",
  },
];

const PHOENIX_VARIANTS = [
  {
    key: "phoenix-red",
    species: "phoenix",
    name: "レッドフェニックス",
    filter: "none",
    cardBg: "linear-gradient(135deg,#FFB870,#B0261E)",
  },
  {
    key: "phoenix-blue",
    species: "phoenix",
    name: "ブルーフェニックス",
    filter: "hue-rotate(214deg) saturate(1.3)",
    cardBg: "linear-gradient(135deg,#8CB8FF,#1E3E8C)",
  },
  {
    key: "phoenix-green",
    species: "phoenix",
    name: "グリーンフェニックス",
    filter: "hue-rotate(94deg) saturate(1.3)",
    cardBg: "linear-gradient(135deg,#9FE68A,#276B2E)",
  },
];

const FENRIR_VARIANTS = [
  {
    key: "fenrir-blue",
    species: "fenrir",
    name: "ブルーフェンリル",
    filter: "none",
    cardBg: "linear-gradient(135deg,#9AC8FF,#1E3E8C)",
  },
  {
    key: "fenrir-red",
    species: "fenrir",
    name: "レッドフェンリル",
    filter: "hue-rotate(142deg) saturate(1.3)",
    cardBg: "linear-gradient(135deg,#FFA6A6,#A3212F)",
  },
  {
    key: "fenrir-green",
    species: "fenrir",
    name: "グリーンフェンリル",
    filter: "hue-rotate(262deg) saturate(1.3)",
    cardBg: "linear-gradient(135deg,#9FE68A,#22762F)",
  },
];

const GRIFFON_VARIANTS = [
  {
    key: "griffon-gold",
    species: "griffon",
    name: "ゴールドグリフォン",
    filter: "none",
    cardBg: "linear-gradient(135deg,#FFE27A,#B0791E)",
  },
  {
    key: "griffon-blue",
    species: "griffon",
    name: "ブルーグリフォン",
    filter: "hue-rotate(213deg) saturate(1.3)",
    cardBg: "linear-gradient(135deg,#9AB3FF,#242E8C)",
  },
  {
    key: "griffon-green",
    species: "griffon",
    name: "グリーングリフォン",
    filter: "hue-rotate(93deg) saturate(1.3)",
    cardBg: "linear-gradient(135deg,#9FE68A,#1E7B2E)",
  },
];

const SWAMP_VARIANTS = [
  {
    key: "swamp-gold",
    species: "swamp",
    name: "ゴールドスワンプリンセス",
    filter: "saturate(1.5)",
    cardBg: "linear-gradient(135deg,#FFE9A8,#C98A12)",
  },
  {
    key: "swamp-blue",
    species: "swamp",
    name: "ブルースワンプリンセス",
    filter: "hue-rotate(207deg) saturate(1.6)",
    cardBg: "linear-gradient(135deg,#B6D4FF,#33459E)",
  },
  {
    key: "swamp-green",
    species: "swamp",
    name: "グリーンスワンプリンセス",
    filter: "hue-rotate(87deg) saturate(1.6)",
    cardBg: "linear-gradient(135deg,#C1F0B0,#2F8F3B)",
  },
];

const MERMAID_VARIANTS = [
  {
    key: "mermaid-green",
    species: "mermaid",
    name: "グリーンマーメイド",
    filter: "none",
    cardBg: "linear-gradient(135deg,#9FE6C8,#137A55)",
  },
  {
    key: "mermaid-blue",
    species: "mermaid",
    name: "ブルーマーメイド",
    filter: "hue-rotate(68deg) saturate(1.2)",
    cardBg: "linear-gradient(135deg,#9AC8FF,#1F5FB8)",
  },
  {
    key: "mermaid-red",
    species: "mermaid",
    name: "レッドマーメイド",
    filter: "hue-rotate(188deg) saturate(1.2)",
    cardBg: "linear-gradient(135deg,#FFA6C0,#C6265E)",
  },
];

export const GIRL_VARIANTS = [
  ...PEGASUS_VARIANTS,
  ...FAIRY_VARIANTS,
  ...CAT_VARIANTS,
  ...TIGER_VARIANTS,
  ...PHOENIX_VARIANTS,
  ...FENRIR_VARIANTS,
  ...GRIFFON_VARIANTS,
  ...SWAMP_VARIANTS,
  ...MERMAID_VARIANTS,
];

export function variantsForTheme(themeKey) {
  return themeKey === "boy" ? DRAGON_VARIANTS : GIRL_VARIANTS;
}

export function pickRandomVariant(themeKey) {
  const list = variantsForTheme(themeKey);
  return list[Math.floor(Math.random() * list.length)].key;
}

export function getVariant(themeKey, variantKey) {
  const list = variantsForTheme(themeKey);
  return list.find((v) => v.key === variantKey) || list[0];
}

// The "grown up" image the given theme+variant shows — same asset the
// corner art already uses at pct >= ~85-90.
export function finalFormImage(themeKey, variantKey) {
  const variant = getVariant(themeKey, variantKey);
  const files = STAGE_FILES[variant.species] || STAGE_FILES.pegasus;
  return files[files.length - 1];
}

/* ---------------- RPG-style stats (LV-based) ---------------- */
// Every collected card has a Level and 6 stats. A schedule's own progress
// maps straight onto Level — 100% complete (Master) = Lv.20 — and each
// stat is the species' Master-level base stat scaled by that Level (i.e.
// base × Lv/20, rounded to a whole number), so a card visibly grows
// alongside the schedule instead of the level being a separate thing to
// manage. HP/MP cap at 999; the rest cap at 255. Levels themselves cap at
// 999 — a single schedule can only reach Lv.20 on its own, but combining
// (配合) two Master (Lv.20+) cards sums their Levels (and stats) into one
// stronger card, which is how higher levels happen.
export const STAT_MAX = { hp: 999, mp: 999, power: 255, defense: 255, speed: 255, wisdom: 255 };
export const STAT_LABELS = { hp: "HP", mp: "MP", power: "ちから", defense: "しゅび", speed: "はやさ", wisdom: "かしこさ" };
export const STAT_KEYS = ["hp", "mp", "power", "defense", "speed", "wisdom"];
export const LEVEL_MAX = 999;
export const MASTER_LEVEL = 20; // 100%進捗 = Lv.20 = 一枚のカード単体で到達できる最大レベル

const HP_HIGH = 60,
  HP_MID = 25;
const ST_HIGH = 15,
  ST_MID = 6,
  ST_AVG = 9;

// species key -> Master-level (Lv.20) base stats. "pegasus" carries the
// ユニコーン archetype (treated as the same creature — see mascots
// feature notes), and the original flavor-only fairy/cat get a flat,
// unfavored spread.
export const SPECIES_BASE_STATS = {
  dragon: { hp: HP_HIGH, mp: HP_MID, power: ST_HIGH, defense: ST_MID, speed: ST_MID, wisdom: ST_MID }, // HP・ちから高め
  tiger: { hp: HP_HIGH, mp: HP_MID, power: ST_HIGH, defense: ST_MID, speed: ST_HIGH, wisdom: ST_MID }, // HP・ちから・はやさ高め
  phoenix: { hp: HP_MID, mp: HP_HIGH, power: ST_MID, defense: ST_MID, speed: ST_MID, wisdom: ST_HIGH }, // MP・かしこさ高め
  fenrir: { hp: HP_MID, mp: HP_HIGH, power: ST_MID, defense: ST_HIGH, speed: ST_MID, wisdom: ST_MID }, // MP・しゅび高め
  griffon: { hp: HP_HIGH, mp: HP_MID, power: ST_MID, defense: ST_MID, speed: ST_MID, wisdom: ST_HIGH }, // HP・かしこさ高め
  pegasus: { hp: HP_HIGH, mp: HP_MID, power: ST_MID, defense: ST_HIGH, speed: ST_MID, wisdom: ST_HIGH }, // (ユニコーン) HP・しゅび・かしこさ高め
  swamp: { hp: HP_MID, mp: HP_HIGH, power: ST_MID, defense: ST_MID, speed: ST_HIGH, wisdom: ST_MID }, // MP・はやさ高め
  mermaid: { hp: HP_MID, mp: HP_HIGH, power: ST_MID, defense: ST_HIGH, speed: ST_MID, wisdom: ST_HIGH }, // MP・しゅび・かしこさ高め
  fairy: { hp: HP_MID + 5, mp: HP_MID + 5, power: ST_AVG, defense: ST_AVG, speed: ST_AVG, wisdom: ST_AVG }, // 平均型
  cat: { hp: HP_MID + 5, mp: HP_MID + 5, power: ST_AVG, defense: ST_AVG, speed: ST_AVG, wisdom: ST_AVG }, // 平均型
};

function capFor(statKey) {
  return statKey === "hp" || statKey === "mp" ? STAT_MAX.hp : STAT_MAX.power;
}

// Level from a schedule's completion percentage — 100% (Master) = Lv.20,
// 0% (still an egg) = Lv.0, straight-line in between.
export function levelFromPct(pct) {
  const clamped = Math.max(0, Math.min(100, pct || 0));
  return Math.round((clamped / 100) * MASTER_LEVEL);
}

// A card's stats at a given Level — its species' Master-level (Lv.20)
// base stat scaled by Lv/20, rounded to a whole number, capped per stat.
// A bred card (no single species) doesn't use this — see combineStats.
export function computeCardStats(species, lv) {
  const base = SPECIES_BASE_STATS[species] || SPECIES_BASE_STATS.fairy;
  const clampedLv = Math.max(0, Math.min(LEVEL_MAX, lv || 0));
  const out = {};
  STAT_KEYS.forEach((k) => {
    out[k] = Math.min(capFor(k), Math.round((base[k] * clampedLv) / MASTER_LEVEL));
  });
  return out;
}

// Combining (配合) two cards sums their stats, capped at each stat's max.
export function combineStats(statsA, statsB) {
  const out = {};
  STAT_KEYS.forEach((k) => {
    out[k] = Math.min(capFor(k), (statsA[k] || 0) + (statsB[k] || 0));
  });
  return out;
}

// Combining (配合) two cards sums their Levels too, capped at LEVEL_MAX.
export function combineLevel(lvA, lvB) {
  return Math.min(LEVEL_MAX, Math.max(0, lvA || 0) + Math.max(0, lvB || 0));
}
