// Color variants for the growth mascots. 男の子用 has one species (dragon,
// 5 colors). 女の子用 has three species — pegasus (5 colors, the
// original), and fairy / magical cat (3 colors each, added later) — 11
// variants total. Most colors are produced with a CSS `filter` on top of
// a single base art asset per species/stage rather than needing separate
// art per color; a couple of "native" colors (blue dragon, blue cat) use
// no filter since the base art is already that color.
//
// Shared by App.jsx (growth art + the "schedule complete" card reveal)
// and ProfileRoot.jsx (the collected-cards list in the stamp book), so a
// schedule's `config.mascotVariant` means the same thing everywhere.

// Growth-stage art per species, ordered egg → fully grown. Pegasus and
// dragon have 6 hand-drawn stages; fairy and cat have 5 (no separate
// "kids" stage between infant and adult).
const STAGE_FILES = {
  dragon: ["/egg.png", "/baby.png", "/infant.png", "/kids.png", "/adult.png", "/master.png"],
  pegasus: ["/unicorn-0.png", "/unicorn-20.png", "/unicorn-40.png", "/unicorn-60.png", "/unicorn-80.png", "/unicorn-100.png"],
  fairy: ["/fairy-egg.png", "/fairy-baby.png", "/fairy-infant.png", "/fairy-adult.png", "/fairy-master.png"],
  cat: ["/cat-egg.png", "/cat-baby.png", "/cat-infant.png", "/cat-adult.png", "/cat-master.png"],
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
    filter: "hue-rotate(90deg) saturate(1.6)",
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

export const GIRL_VARIANTS = [...PEGASUS_VARIANTS, ...FAIRY_VARIANTS, ...CAT_VARIANTS];

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
