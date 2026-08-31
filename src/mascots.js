// Color variants for the two growth mascots — dragon (男の子用) and
// pegasus (女の子用). There's only one real art asset per growth stage
// (egg.png…master.png for the dragon, unicorn-0.png…unicorn-100.png for
// the pegasus), so each color is produced with a CSS `filter` on top of
// the same images rather than needing separate art per color.
//
// Shared by App.jsx (growth art + the "schedule complete" card reveal)
// and ProfileRoot.jsx (the collected-cards list in the stamp book), so a
// schedule's `config.mascotVariant` means the same thing everywhere.

export const DRAGON_VARIANTS = [
  {
    key: "blue",
    name: "ブルードラゴン",
    filter: "none",
    cardBg: "linear-gradient(135deg,#5EB3E8,#0B3D62)",
  },
  {
    key: "red",
    name: "レッドドラゴン",
    filter: "hue-rotate(150deg) saturate(1.4) brightness(1.02)",
    cardBg: "linear-gradient(135deg,#FF9B8A,#B0261E)",
  },
  {
    key: "green",
    name: "グリーンドラゴン",
    filter: "hue-rotate(270deg) saturate(1.25)",
    cardBg: "linear-gradient(135deg,#8FD98A,#20692B)",
  },
  {
    key: "yellow",
    name: "イエロードラゴン",
    filter: "hue-rotate(200deg) saturate(1.6) brightness(1.15)",
    cardBg: "linear-gradient(135deg,#FFE27A,#C98A12)",
  },
  {
    key: "purple",
    name: "パープルドラゴン",
    filter: "hue-rotate(70deg) saturate(1.3)",
    cardBg: "linear-gradient(135deg,#D9A6EF,#5A1E80)",
  },
];

export const PEGASUS_VARIANTS = [
  {
    key: "rainbow",
    name: "レインボーペガサス",
    filter: "none",
    cardBg: "linear-gradient(135deg,#FFD6E0,#C9B6FF,#B6E3FF)",
  },
  {
    key: "sunset",
    name: "サンセットペガサス",
    filter: "hue-rotate(-40deg) saturate(2) brightness(1.05)",
    cardBg: "linear-gradient(135deg,#FFB37B,#FF6F91)",
  },
  {
    key: "starlight",
    name: "スターライトペガサス",
    filter: "hue-rotate(160deg) saturate(2)",
    cardBg: "linear-gradient(135deg,#9AC8FF,#33459E)",
  },
  {
    key: "blossom",
    name: "ブロッサムペガサス",
    filter: "hue-rotate(60deg) saturate(2)",
    cardBg: "linear-gradient(135deg,#FFC1E3,#D6438D)",
  },
  {
    key: "emerald",
    name: "エメラルドペガサス",
    filter: "hue-rotate(-110deg) saturate(2)",
    cardBg: "linear-gradient(135deg,#8CE6C0,#137A55)",
  },
];

export function variantsForTheme(themeKey) {
  return themeKey === "boy" ? DRAGON_VARIANTS : PEGASUS_VARIANTS;
}

export function pickRandomVariant(themeKey) {
  const list = variantsForTheme(themeKey);
  return list[Math.floor(Math.random() * list.length)].key;
}

export function getVariant(themeKey, variantKey) {
  const list = variantsForTheme(themeKey);
  return list.find((v) => v.key === variantKey) || list[0];
}

// The "grown up" image each theme's card shows — same asset the corner
// art already uses at pct >= 90.
export function finalFormImage(themeKey) {
  return themeKey === "boy" ? "/master.png" : "/unicorn-100.png";
}
