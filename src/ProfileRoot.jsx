import React, { useEffect, useState } from "react";
import { supabase } from "./db.js";
import { getProfileIdFromUrl, generateProfileId } from "./profileId.js";
import { upsertKnownProfile, removeKnownProfile } from "./profileRegistry.js";
import { generateScheduleId } from "./scheduleId.js";
import { getVariant, finalFormImage, stageImage, stageIndex, stageLabel, eggLabel, speciesLabel, computeCardStats, combineStats, combineLevel, levelFromPct, stageImageAt, stageCount, getGrandMasterCombo, STAT_LABELS, STAT_KEYS, STAT_MAX, MASTER_LEVEL } from "./mascots.js";
import { todayPendingSubjects, computeOverallStats } from "./progress.js";

const bg = "linear-gradient(180deg, #0B3D62 0%, #14588C 42%, #2E9BC7 78%, #6FCFEB 100%)";
// Backup PIN — always accepted alongside whatever PIN the parent set, in case
// they forget their own. Intentionally not a secret kept from the parent.
const MASTER_PIN = "5963";

// Counts by total stamp VALUE, matching computeOverallStats in progress.js
// — a "取り戻す" double-tap is worth 2, since it's covering a missed day
// as well as today's, not just counted as one stamp slot filled.
function countStampsInBlob(blob) {
  const completions = (blob && blob.completions) || {};
  let n = 0;
  Object.values(completions).forEach((day) => {
    Object.values(day || {}).forEach((v) => {
      n += Math.min(2, Math.max(0, v || 0));
    });
  });
  return n;
}

// Sums up every day's achv entries (minutes/pages/problems) for a
// schedule, across every subject — used to show a "what they actually did"
// total on a completed schedule (e.g. ⏱120分 📖45ページ ✏️80問).
function totalAchievementsInBlob(blob) {
  const achievements = (blob && blob.achievements) || {};
  const totals = { minutes: 0, pages: 0, problems: 0 };
  Object.values(achievements).forEach((day) => {
    Object.values(day || {}).forEach((vals) => {
      if (!vals) return;
      totals.minutes += Number(vals.minutes) || 0;
      totals.pages += Number(vals.pages) || 0;
      totals.problems += Number(vals.problems) || 0;
    });
  });
  return totals;
}

const BIRTH_YEAR_OPTIONS = Array.from({ length: 57 }, (_, i) => 2026 - i); // 2026 down to 1970
const BIRTH_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const BIRTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

const dateSelectStyle = {
  flex: 1,
  minWidth: 0,
  padding: "10px 4px",
  borderRadius: 10,
  border: "2px solid #BFE3F0",
  fontSize: 14,
  fontFamily: "inherit",
  background: "#fff",
  color: "#0B3D62",
  fontWeight: 700,
};
const dateSelectYearStyle = { ...dateSelectStyle, flex: 1.6, minWidth: 70, padding: "10px 2px" };

// Year / month / day as three drum-roll <select> wheels instead of a native
// date input — some browsers only let year+month scroll and make day a
// separate calendar tap, so this keeps all three consistently quick.
//
// Keeps its own y/m/d state (seeded once from `value`) instead of deriving
// it fresh from `value` on every render. Deriving from `value` meant that
// picking just the year (with month/day still unset) sent onChange("") to
// the parent — which fed back in as an empty `value` and wiped the just
// -picked year right back out, so nothing seemed to "stick" until all
// three happened to be chosen in the same tick.
function BirthdateSelects({ value, onChange }) {
  const [iy, im, id] = (value || "").split("-");
  const [y, setY] = useState(iy || "");
  const [m, setM] = useState(im ? Number(im) : "");
  const [d, setD] = useState(id ? Number(id) : "");

  function update(ny, nm, nd) {
    setY(ny);
    setM(nm);
    setD(nd);
    if (ny && nm && nd) onChange(`${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`);
    else onChange("");
  }
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <select value={y} onChange={(e) => update(e.target.value, m, d)} style={dateSelectYearStyle}>
        <option value="">年</option>
        {BIRTH_YEAR_OPTIONS.map((yy) => (
          <option key={yy} value={yy}>
            {yy}
          </option>
        ))}
      </select>
      <select value={m} onChange={(e) => update(y, e.target.value ? Number(e.target.value) : "", d)} style={dateSelectStyle}>
        <option value="">月</option>
        {BIRTH_MONTH_OPTIONS.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
      <select value={d} onChange={(e) => update(y, m, e.target.value ? Number(e.target.value) : "")} style={dateSelectStyle}>
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

function freshProfile() {
  return { name: "", birthdate: "", pin: "", rewards: [], redemptions: [] };
}

export default function ProfileRoot() {
  const profileId = getProfileIdFromUrl();
  const [loaded, setLoaded] = useState(false);
  const [exists, setExists] = useState(false);
  const [profile, setProfile] = useState(freshProfile());
  const [schedules, setSchedules] = useState([]); // [{id, title, theme, stamps}]
  const [showAllSchedules, setShowAllSchedules] = useState(false); // 「つながっているスケジュール」を5件超えて全部表示中か
  const [breedPage, setBreedPage] = useState(false); // 配合ページを表示中かどうか
  const [openCardId, setOpenCardId] = useState(null); // card.id currently open in the detail view
  const [view, setView] = useState("main"); // main | editProfile | rewards
  const [redeemTarget, setRedeemTarget] = useState(null); // reward | null
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [gateTarget, setGateTarget] = useState(null); // "rewards" | "editProfile" | null
  const [showGatePin, setShowGatePin] = useState(false);
  const [showGateConfirm, setShowGateConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("profiles").select("blob").eq("id", profileId).maybeSingle();
        if (data && data.blob) {
          setProfile({ ...freshProfile(), ...data.blob });
          setExists(true);
          upsertKnownProfile({ id: profileId, name: data.blob.name || "" });
          await loadSchedules();
        } else {
          setView("editProfile");
        }
      } catch (e) {
        setView("editProfile");
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSchedules() {
    try {
      const { data } = await supabase
        .from("schedules")
        .select("id, blob")
        .eq("blob->config->>profileId", profileId);
      const list = (data || [])
        .filter((row) => row.blob && row.blob.config)
        .map((row) => {
          const stats = computeOverallStats(row.blob.config, row.blob.completions);
          return {
            id: row.id,
            title: row.blob.config.title,
            theme: row.blob.config.theme || "girl",
            startDate: row.blob.config.startDate || "",
            endDate: row.blob.config.endDate || "",
            stamps: countStampsInBlob(row.blob),
            awardedCard: row.blob.config.awardedCard || null,
            mascotVariant: row.blob.config.mascotVariant || null,
            mascotName: row.blob.config.mascotName || "",
            currentPct: stats.pct,
            pendingToday: todayPendingSubjects(row.blob.config, row.blob.completions),
            completed: stats.need > 0 && stats.done >= stats.need,
            achvTotals: totalAchievementsInBlob(row.blob),
          };
        });
      setSchedules(list);
    } catch (e) {}
  }

  async function saveProfile(next) {
    await supabase.from("profiles").upsert({ id: profileId, blob: next, updated_at: new Date().toISOString() });
    setProfile(next);
    setExists(true);
    upsertKnownProfile({ id: profileId, name: next.name || "" });
  }

  async function handleCreateOrEditProfile(name, birthdate, pin) {
    const next = { ...profile, name: name.trim(), birthdate, pin: (pin || "").trim() };
    await saveProfile(next);
    setView("main");
    if (!exists) await loadSchedules();
  }

  function handleCreateSchedule(themeKey) {
    const id = generateScheduleId();
    window.location.href = `${window.location.pathname}?id=${id}&theme=${themeKey}&profileId=${profileId}`;
  }

  async function handleDeleteProfile() {
    setDeleting(true);
    try {
      await supabase.from("profiles").delete().eq("id", profileId);
    } catch (e) {}
    removeKnownProfile(profileId);
    window.location.href = window.location.pathname;
  }

  function requestParentGate(target) {
    setGateTarget(target);
    if (profile.pin && profile.pin.length > 0) {
      setShowGatePin(true);
    } else {
      setShowGateConfirm(true);
    }
  }

  function handleGateSuccess() {
    setShowGatePin(false);
    setShowGateConfirm(false);
    if (gateTarget) setView(gateTarget);
    setGateTarget(null);
  }

  function handleGateCancel() {
    setShowGatePin(false);
    setShowGateConfirm(false);
    setGateTarget(null);
  }

  const totalEarned = schedules.reduce((sum, s) => sum + s.stamps, 0);

  // ⭐ ステータス割り振り用のプール。景品交換用の available（totalEarned -
  // totalSpent、下の方で計算）とは完全に別勘定 — ステータスに振っても交換
  // できる★は減らないし、景品と交換してもステータスに振れる★は減らない。
  // どちらも totalEarned から独立に差し引かれる。
  const totalAllocatedStars = Object.values(profile.statAllocations || {}).reduce(
    (sum, alloc) => sum + STAT_KEYS.reduce((s2, k) => s2 + (alloc[k] || 0), 0),
    0
  );
  const starsForStats = totalEarned - totalAllocatedStars;

  // Adds a card's saved stat-point allocation (if any) on top of its
  // computed base stats, capped the same way computeCardStats/combineStats
  // already cap everything else.
  function applyStatAllocation(cardId, stats) {
    const alloc = (profile.statAllocations || {})[cardId];
    if (!alloc) return stats;
    const out = { ...stats };
    STAT_KEYS.forEach((k) => {
      const cap = k === "hp" || k === "mp" ? STAT_MAX.hp : STAT_MAX.power;
      out[k] = Math.min(cap, out[k] + (alloc[k] || 0));
    });
    return out;
  }

  // Schedules that still have at least one of today's stamps un-pressed —
  // surfaced at the top of the page as a reminder.
  const pendingSchedules = schedules.filter((s) => s.pendingToday && s.pendingToday.length > 0);

  // Schedules that reached 100% — shown as a small trophy list with what
  // was actually earned/done on each one.
  const completedSchedules = schedules.filter((s) => s.completed);

  // Cards earned across every schedule linked to this stamp book, grouped
  // by theme+color so getting the same dragon/pegasus twice shows as
  // "ブルードラゴン ×2" instead of two separate entries.
  // Every card actually earned, one entry per completed+card-eligible
  // schedule (not grouped) — breeding needs to pick two *specific* cards,
  // and each one's stats depend on how many stars it was earned with, so
  // two cards that look the same (same species+color) can still have
  // different stats.
  // If this card was used as a ベース in a 配合 that matched a Grand Master
  // combo, its name/art switch to the fusion result — the new art has no
  // hue-rotate tint (it's bespoke, pre-colored artwork, same idea as the
  // fairyGreen/swampGreen variants), so filter is forced off when real art
  // exists. Without art yet, it falls back to the usual ⚗️ placeholder.
  function applyGrandMaster(override, variant, fallbackLabel, fallbackImgSrc) {
    const gm = override && override.grandMaster;
    if (!gm) return { variant, label: fallbackLabel, imgSrc: fallbackImgSrc, grandMaster: false };
    return {
      variant,
      label: gm.name,
      imgSrc: gm.img,
      grandMaster: true,
    };
  }

  const myCards = schedules
    .filter((s) => s.awardedCard && !(profile.consumedScheduleCards || []).includes(s.id))
    .map((s) => {
      const cardTheme = s.awardedCard.theme || s.theme || "girl";
      const variant = getVariant(cardTheme, s.awardedCard.variant);
      const stars = typeof s.awardedCard.stars === "number" ? s.awardedCard.stars : s.stamps;
      // A schedule that's actually earned a card is by definition 100%
      // done, so it's naturally Lv.20 (Master) — unless it's been used as
      // a ベース (base) in 配合 before, in which case its Lv/stats were
      // upgraded in place and are stored as an override.
      const override = (profile.cardOverrides && profile.cardOverrides[s.id]) || null;
      const lv = override ? override.lv : MASTER_LEVEL;
      const stats = applyStatAllocation(`sched:${s.id}`, override ? override.stats : computeCardStats(variant.species, lv));
      const disp = applyGrandMaster(override, variant, s.mascotName || variant.name, finalFormImage(cardTheme, s.awardedCard.variant));
      return {
        id: `sched:${s.id}`,
        source: "schedule",
        scheduleId: s.id,
        theme: cardTheme,
        variant: disp.variant,
        imgSrc: disp.imgSrc,
        stars,
        lv,
        isMaster: true,
        grandMaster: disp.grandMaster,
        combinedFrom: (override && override.combinedFrom) || [],
        stats,
        label: disp.label,
        // The name the kid gave it — independent of label, which switches
        // to the Grand Master fusion's own name once combined.
        givenName: s.mascotName || variant.name,
        fromTitle: s.title,
        earnedAt: s.awardedCard.earnedAt || "",
        startDate: s.startDate,
        endDate: s.endDate,
        achvTotals: s.achvTotals,
      };
    });

  // Pets still growing (not yet awarded — the schedule hasn't reached
  // 100%, or hasn't crossed the 30-day/50-stamp card threshold yet) — the
  // kid can still see them here at their current stage while working
  // toward it, using whatever name they've already given it. Falls back
  // to the theme's first variant if a schedule somehow never got a
  // mascotVariant assigned (e.g. older data from before that existed),
  // rather than silently disappearing from this list.
  const growingCards = schedules
    .filter((s) => !s.awardedCard && !(profile.consumedScheduleCards || []).includes(s.id))
    .map((s) => {
      const variant = getVariant(s.theme, s.mascotVariant);
      const hatched = stageIndex(variant.species, s.currentPct) > 0;
      // A schedule can reach 100% progress without hitting the 30日/50スタンプ
      // threshold that awards an official card — it's still visually at the
      // Master stage, so it should be breedable too, not stuck forever just
      // because it was never "awarded". Once it's been used as a ベース in
      // 配合, its boosted Lv/stats are stored the same way an awarded card's
      // are (keyed by schedule id), so we check for that override here too.
      const reachedMaster = stageIndex(variant.species, s.currentPct) >= stageCount(variant.species) - 1;
      const override = (profile.cardOverrides && profile.cardOverrides[s.id]) || null;
      const lv = override ? override.lv : levelFromPct(s.currentPct);
      const stats = applyStatAllocation(`growing:${s.id}`, override ? override.stats : computeCardStats(variant.species, lv));
      const disp = applyGrandMaster(
        override,
        variant,
        hatched ? s.mascotName || variant.name : eggLabel(variant),
        stageImage(variant.species, s.currentPct)
      );
      return {
        id: `growing:${s.id}`,
        source: "growing",
        scheduleId: s.id,
        theme: s.theme,
        variant: disp.variant,
        imgSrc: disp.imgSrc,
        // Still an egg — don't give away which species it'll hatch into.
        label: disp.label,
        givenName: hatched ? s.mascotName || variant.name : null,
        fromTitle: s.title,
        startDate: s.startDate,
        endDate: s.endDate,
        currentPct: s.currentPct,
        lv,
        isMaster: override ? true : reachedMaster,
        grandMaster: disp.grandMaster,
        combinedFrom: (override && override.combinedFrom) || [],
        stats,
        stamps: s.stamps,
      };
    });

  // Cards produced by combining two others (配合) — stored on the profile
  // itself since they aren't tied to any one schedule. Always Master-tier
  // (breedable again) once created; updated in place if later used as a
  // ベース (base) themselves.
  const bredCards = (profile.bredCards || []).map((c) => ({
    id: `bred:${c.id}`,
    bredId: c.id,
    source: "bred",
    theme: null,
    variant: null,
    imgSrc: null,
    stars: null,
    lv: typeof c.lv === "number" ? c.lv : MASTER_LEVEL,
    isMaster: true,
    combinedFrom: c.combinedFrom || [],
    stats: applyStatAllocation(`bred:${c.id}`, c.stats),
    label: c.name,
    fromTitle: c.parentLabel,
    earnedAt: c.createdAt || "",
  }));

  const allCards = [...myCards, ...growingCards, ...bredCards];
  const masterCards = allCards.filter((c) => c.isMaster);

  const totalSpent = (profile.redemptions || []).reduce((sum, r) => sum + r.cost, 0);
  const available = totalEarned - totalSpent;

  // 配合 (breeding): ベース (base) keeps existing as one card, upgraded
  // in place with the combined Lv/stats; サブ (sub, the material) is
  // consumed — removed from the collection entirely. No third card is
  // created. If both sides are still their original, un-fused species and
  // that pair has a グランドマスター combo entry, the base's name/art also
  // switch to the fusion result. The sub's own schedule info and growth
  // history are kept (combinedFrom) so the detail view can still show them
  // afterwards, alongside anything the sub had itself already absorbed.
  async function handleFinalizeBreed(baseId, subId) {
    const base = allCards.find((c) => c.id === baseId);
    const sub = allCards.find((c) => c.id === subId);
    if (!base || !sub || !base.isMaster || !sub.isMaster) return;
    const newLv = combineLevel(base.lv, sub.lv);
    const newStats = combineStats(base.stats, sub.stats);
    const combo =
      base.variant && sub.variant && !base.grandMaster ? getGrandMasterCombo(base.variant.species, sub.variant.species) : null;
    const existingGm = profile.cardOverrides && profile.cardOverrides[base.scheduleId] && profile.cardOverrides[base.scheduleId].grandMaster;
    const existingCombined =
      base.source === "bred"
        ? ((profile.bredCards || []).find((c) => c.id === base.bredId) || {}).combinedFrom || []
        : (profile.cardOverrides && profile.cardOverrides[base.scheduleId] && profile.cardOverrides[base.scheduleId].combinedFrom) || [];
    const subOwnRecord = sub.variant
      ? [
          {
            variant: sub.variant,
            stageIdx: sub.source === "growing" ? stageIndex(sub.variant.species, sub.currentPct) : stageCount(sub.variant.species) - 1,
            fromTitle: sub.fromTitle,
            startDate: sub.startDate,
            endDate: sub.endDate,
            stars: sub.source === "schedule" ? sub.stars : sub.stamps,
            earnedAt: sub.earnedAt || "",
            label: sub.givenName || sub.label,
          },
        ]
      : [];
    const combinedFrom = [...existingCombined, ...(sub.combinedFrom || []), ...subOwnRecord];

    let next = { ...profile };
    if (base.source === "schedule" || base.source === "growing") {
      next.cardOverrides = {
        ...(next.cardOverrides || {}),
        [base.scheduleId]: { lv: newLv, stats: newStats, grandMaster: combo || existingGm || null, combinedFrom },
      };
    } else if (base.source === "bred") {
      next.bredCards = (next.bredCards || []).map((c) => (c.id === base.bredId ? { ...c, lv: newLv, stats: newStats, combinedFrom } : c));
    }
    if (sub.source === "schedule" || sub.source === "growing") {
      next.consumedScheduleCards = [...(next.consumedScheduleCards || []), sub.scheduleId];
    } else if (sub.source === "bred") {
      next.bredCards = (next.bredCards || []).filter((c) => c.id !== sub.bredId);
    }
    await saveProfile(next);
  }

  // ⭐ ステータス割り振りの確定処理 — 既存の割り振り分に今回の増分を足し込む
  // （上書きではなく加算）。カードは常に card.id（例: "sched:abc123"）で
  // 引く。
  async function handleAllocateStats(cardId, deltas) {
    const current = (profile.statAllocations && profile.statAllocations[cardId]) || {};
    const merged = { ...current };
    STAT_KEYS.forEach((k) => {
      merged[k] = (merged[k] || 0) + (deltas[k] || 0);
    });
    const next = { ...profile, statAllocations: { ...(profile.statAllocations || {}), [cardId]: merged } };
    await saveProfile(next);
  }

  async function handleRedeem(reward) {
    if (available < reward.cost) return;
    const next = {
      ...profile,
      redemptions: [
        ...(profile.redemptions || []),
        { id: generateScheduleId(6), rewardId: reward.id, rewardName: reward.name, cost: reward.cost, date: new Date().toISOString().slice(0, 10) },
      ],
    };
    await saveProfile(next);
    setRedeemTarget(null);
  }

  async function handleShare() {
    const url = `${window.location.origin}${window.location.pathname}?profile=${profileId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile.name || "スタンプ帳"}`, url });
      } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {}
    }
  }

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#fff", fontSize: 18 }}>読み込み中…</div>
      </div>
    );
  }

  if (view === "editProfile") {
    return (
      <>
        <ProfileSetupScreen
          initial={profile}
          isNew={!exists}
          onSave={handleCreateOrEditProfile}
          onCancel={exists ? () => setView("main") : null}
          onRequestDelete={exists ? () => setShowDeleteConfirm(true) : null}
        />
        {showDeleteConfirm && (
          <div style={overlayStyle}>
            <div style={modalCardStyle}>
              <h3 style={{ margin: "0 0 10px", fontSize: 20, color: "#0B3D62" }}>このスタンプ帳を削除しますか？</h3>
              <p style={{ fontSize: 14.5, color: "#4a6c85", lineHeight: 1.6, marginBottom: 20 }}>
                「{profile.name || "スタンプ帳"}」を削除します。たまったスタンプの記録・景品・交換履歴はすべて消え、元に戻せません。
                <br />
                （つながっているスケジュール自体は消えず、そのまま個別に残ります）
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting} style={{ ...modalBtnStyle, background: "#fff", color: "#5a7d94", border: "2px solid #d7ecf3" }}>
                  やめる
                </button>
                <button onClick={handleDeleteProfile} disabled={deleting} style={{ ...modalBtnStyle, background: "#E0526B", color: "#fff", border: "none" }}>
                  {deleting ? "削除中…" : "削除する"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (view === "rewards") {
    return (
      <RewardsEditor
        rewards={profile.rewards || []}
        onSave={async (rewards) => {
          await saveProfile({ ...profile, rewards });
          setView("main");
        }}
        onCancel={() => setView("main")}
      />
    );
  }

  if (breedPage) {
    return <BreedPage masterCards={masterCards} onFinalize={handleFinalizeBreed} onClose={() => setBreedPage(false)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif", padding: "28px 16px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Kaisei+Decol:wght@700&family=Zen+Maru+Gothic:wght@500;700;900&display=swap');`}</style>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <a href={window.location.pathname} style={{ textDecoration: "none" }}>
            <span style={{ background: "rgba(11,61,98,0.85)", color: "#fff", borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 700 }}>
              🏠 トップへ
            </span>
          </a>
          <button onClick={() => requestParentGate("editProfile")} style={iconBtnStyle}>
            ⚙️
          </button>
        </div>

        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Kaisei Decol', serif", color: "#fff", fontSize: 28, textShadow: "0 2px 10px rgba(11,61,98,0.5)" }}>
            🌟 {profile.name || "スタンプ帳"} の スタンプ帳
          </div>
          {profile.birthdate && <div style={{ color: "#EAF7FB", fontSize: 13, marginTop: 2 }}>生年月日：{profile.birthdate}</div>}
        </div>

        {pendingSchedules.length > 0 && (
          <>
            <SectionTitle>✨ まだ押していないスタンプ／今日のスタンプ</SectionTitle>
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pendingSchedules.map((s) => (
                  <a key={s.id} href={`${window.location.pathname}?id=${s.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: "10px 14px", boxShadow: "0 4px 10px rgba(11,61,98,0.15)" }}>
                      <div style={{ fontWeight: 800, color: "#0B3D62", fontSize: 14, marginBottom: 6 }}>
                        {s.theme === "boy" ? "🐉" : "🎀"} {s.title || "無題のスケジュール"}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {s.pendingToday.map((subj) => (
                          <span
                            key={subj.id}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 12.5,
                              fontWeight: 700,
                              border: `1.5px solid ${subj.color}`,
                              color: "#0B3D62",
                              background: subj.color + "18",
                            }}
                          >
                            {subj.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}

        <SectionTitle>📅 つながっているスケジュール</SectionTitle>
        <div style={{ marginBottom: 18 }}>
          {schedules.length === 0 ? (
            <div style={emptyCardStyle}>まだスケジュールがありません。下のボタンから作ってみましょう。</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(showAllSchedules ? schedules : schedules.slice(0, 5)).map((s) => (
                <a key={s.id} href={`${window.location.pathname}?id=${s.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "#fff", borderRadius: 14, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 10px rgba(11,61,98,0.15)" }}>
                    <span style={{ fontWeight: 800, color: "#0B3D62", fontSize: 14.5 }}>
                      {s.theme === "boy" ? "🐉" : "🎀"} {s.title || "無題のスケジュール"}
                    </span>
                    <span style={{ color: "#B5651D", fontWeight: 800, fontSize: 13.5 }}>⭐️ {s.stamps}</span>
                  </div>
                </a>
              ))}
              {!showAllSchedules && schedules.length > 5 && (
                <button
                  onClick={() => setShowAllSchedules(true)}
                  style={{
                    border: "none",
                    background: "#EAF4F9",
                    color: "#14588C",
                    fontWeight: 800,
                    fontSize: 13.5,
                    borderRadius: 12,
                    padding: "10px 0",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  すべて見る（{schedules.length}件）
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: 22, padding: "22px 20px", textAlign: "center", boxShadow: "0 16px 34px rgba(11,61,98,0.3)", marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: "#7c98aa", fontWeight: 700 }}>今もっているスタンプ</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#0B3D62", fontFamily: "'Kaisei Decol', serif" }}>⭐️ {available}</div>
          <div style={{ fontSize: 12.5, color: "#a8bcc9" }}>
            これまでに獲得 {totalEarned} － 交換した分 {totalSpent}
          </div>
        </div>

        <SectionTitle>🎁 景品と交換</SectionTitle>
        <div style={{ marginBottom: 8 }}>
          {(profile.rewards || []).length === 0 ? (
            <div style={emptyCardStyle}>まだ景品が登録されていません。⚙️の「景品を編集する」から追加できます。</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(profile.rewards || []).map((r) => {
                const can = available >= r.cost;
                return (
                  <div key={r.id} style={{ background: "#fff", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 6px 14px rgba(11,61,98,0.2)" }}>
                    <div>
                      <div style={{ fontWeight: 900, color: "#0B3D62", fontSize: 16 }}>{r.name}</div>
                      <div style={{ fontSize: 13, color: "#7c98aa", fontWeight: 700 }}>⭐️ {r.cost}個</div>
                    </div>
                    <button
                      onClick={() => setRedeemTarget(r)}
                      disabled={!can}
                      style={{
                        border: "none",
                        borderRadius: 999,
                        padding: "9px 16px",
                        fontWeight: 900,
                        fontSize: 13.5,
                        cursor: can ? "pointer" : "default",
                        background: can ? "linear-gradient(135deg,#FFB6C9,#F4C95D)" : "#e5edf1",
                        color: can ? "#fff" : "#aab8c0",
                        fontFamily: "inherit",
                      }}
                    >
                      交換する
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={() => requestParentGate("rewards")} style={{ ...linkBtnStyle, marginBottom: 22 }}>
          ✏️ 景品を編集する（保護者のみ）
        </button>

        <SectionTitle>🎴 集めたファミリアカード</SectionTitle>
        <div style={{ fontSize: 11.5, color: "#7c98aa", marginBottom: 8 }}>
          ステータスに割り振れる★：残り {starsForStats} 個（景品と交換できる★とは別に減ります）
        </div>
        <div style={{ marginBottom: 6 }}>
          {allCards.length === 0 ? (
            <div style={emptyCardStyle}>まだファミリアカードがありません。スケジュールを最後まで達成するとファミリアカードがもらえます。</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {allCards.map((c) => (
                <CardTile key={c.id} card={c} onOpen={() => setOpenCardId(c.id)} />
              ))}
            </div>
          )}
        </div>
        {masterCards.length >= 2 && (
          <button
            onClick={() => setBreedPage(true)}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg,#B48CE0,#5A3FA0)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 14.5,
              cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: 18,
            }}
          >
            ⚗️ 配合する
          </button>
        )}

        <SectionTitle>✅ 完了したスケジュール</SectionTitle>
        <div style={{ marginBottom: 18 }}>
          {completedSchedules.length === 0 ? (
            <div style={emptyCardStyle}>まだ完了したスケジュールはありません。</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {completedSchedules.map((s) => {
                const t = s.achvTotals;
                const achvParts = [];
                if (t.minutes > 0) achvParts.push(`⏱${t.minutes}分`);
                if (t.pages > 0) achvParts.push(`📖${t.pages}ページ`);
                if (t.problems > 0) achvParts.push(`✏️${t.problems}問`);
                return (
                  <a key={s.id} href={`${window.location.pathname}?id=${s.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: "10px 14px", boxShadow: "0 4px 10px rgba(11,61,98,0.15)" }}>
                      <div style={{ fontWeight: 800, color: "#0B3D62", fontSize: 14, marginBottom: 4 }}>
                        🏆 {s.title || "無題のスケジュール"}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#7c98aa", fontWeight: 700 }}>
                        ⭐ 獲得スタンプ {s.stamps}個
                        {achvParts.length > 0 ? `　${achvParts.join(" ")}` : ""}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
          <button onClick={() => handleCreateSchedule("girl")} style={{ ...actionBtnStyle, background: "linear-gradient(135deg,#FFB6C9,#F4C95D)" }}>
            🎀 新しいスケジュールを作る（女の子用）
          </button>
          <button onClick={() => handleCreateSchedule("boy")} style={{ ...actionBtnStyle, background: "linear-gradient(135deg,#8B5E34,#C89B3C)" }}>
            🐉 新しいスケジュールを作る（男の子用）
          </button>
        </div>

        {(profile.redemptions || []).length > 0 && (
          <>
            <SectionTitle>📖 交換した記録</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {[...(profile.redemptions || [])]
                .reverse()
                .map((r) => (
                  <div key={r.id} style={{ background: "rgba(255,255,255,0.85)", borderRadius: 12, padding: "8px 14px", fontSize: 13.5, color: "#0B3D62", display: "flex", justifyContent: "space-between" }}>
                    <span>{r.date}：{r.rewardName}</span>
                    <span style={{ fontWeight: 800 }}>-⭐️{r.cost}</span>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      {redeemTarget && (
        <div style={overlayStyle}>
          <div style={modalCardStyle}>
            <h3 style={{ margin: "0 0 10px", fontSize: 20, color: "#0B3D62" }}>これと交換する？</h3>
            <p style={{ fontSize: 16, color: "#4a6c85", marginBottom: 6 }}>
              <strong>{redeemTarget.name}</strong>
            </p>
            <p style={{ fontSize: 14, color: "#7c98aa", marginBottom: 20 }}>
              ⭐️{redeemTarget.cost}個 使います（残り {available - redeemTarget.cost} 個になります）
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setRedeemTarget(null)} style={{ ...modalBtnStyle, background: "#fff", color: "#5a7d94", border: "2px solid #d7ecf3" }}>
                やめる
              </button>
              <button onClick={() => handleRedeem(redeemTarget)} style={{ ...modalBtnStyle, background: "#14588C", color: "#fff", border: "none" }}>
                交換する
              </button>
            </div>
          </div>
        </div>
      )}

      {showGateConfirm && (
        <div style={overlayStyle}>
          <div style={modalCardStyle}>
            <h3 style={{ margin: "0 0 10px", fontSize: 20, color: "#0B3D62" }}>保護者の方へ</h3>
            <p style={{ fontSize: 15, color: "#4a6c85", lineHeight: 1.6, marginBottom: 20 }}>
              ここから先は{gateTarget === "rewards" ? "景品リストを編集" : "プロフィールの設定を変更"}できます。保護者の方が操作していますか？
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleGateCancel} style={{ ...modalBtnStyle, background: "#fff", color: "#5a7d94", border: "2px solid #d7ecf3" }}>
                やめる
              </button>
              <button onClick={handleGateSuccess} style={{ ...modalBtnStyle, background: "#14588C", color: "#fff", border: "none" }}>
                はい、開けます
              </button>
            </div>
          </div>
        </div>
      )}

      {showGatePin && <RewardsPinModal correctPin={profile.pin} onSuccess={handleGateSuccess} onCancel={handleGateCancel} />}

      {openCardId &&
        (() => {
          const card = allCards.find((c) => c.id === openCardId);
          if (!card) return null;
          const idx = allCards.findIndex((c) => c.id === openCardId);
          return (
            <CardDetailModal
              key={card.id}
              card={card}
              onClose={() => setOpenCardId(null)}
              onPrev={allCards.length > 1 ? () => setOpenCardId(allCards[(idx - 1 + allCards.length) % allCards.length].id) : null}
              onNext={allCards.length > 1 ? () => setOpenCardId(allCards[(idx + 1) % allCards.length].id) : null}
              starsForStats={starsForStats}
              onAllocate={handleAllocateStats}
            />
          );
        })()}
    </div>
  );
}

function RewardsPinModal({ correctPin, onSuccess, onCancel }) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [showHint, setShowHint] = useState(false);

  function submit() {
    if (value === correctPin || value === MASTER_PIN) {
      onSuccess();
    } else {
      setWrong(true);
      setValue("");
      setFailCount((n) => {
        const next = n + 1;
        if (next >= 3) setShowHint(true);
        return next;
      });
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        <h3 style={{ margin: "0 0 10px", fontSize: 20, color: "#0B3D62" }}>保護者の方へ</h3>
        <p style={{ fontSize: 15, color: "#4a6c85", lineHeight: 1.6, marginBottom: 14 }}>
          景品リストを編集するには、暗証番号を入力してください。
        </p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/[^0-9]/g, "").slice(0, 6));
            setWrong(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="••••"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: wrong ? "2px solid #E0526B" : "2px solid #BFE3F0",
            fontSize: 20,
            textAlign: "center",
            letterSpacing: 6,
            fontFamily: "inherit",
            marginBottom: wrong ? 8 : 18,
            boxSizing: "border-box",
          }}
        />
        {wrong && <p style={{ color: "#E0526B", fontSize: 13, marginTop: 0, marginBottom: 14 }}>暗証番号がちがいます</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ ...modalBtnStyle, background: "#fff", color: "#5a7d94", border: "2px solid #d7ecf3" }}>
            やめる
          </button>
          <button onClick={submit} style={{ ...modalBtnStyle, background: "#14588C", color: "#fff", border: "none" }}>
            開ける
          </button>
        </div>
      </div>
      {showHint && (
        <div style={overlayStyle} onClick={() => setShowHint(false)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 10px", fontSize: 20, color: "#0B3D62" }}>💡 ヒント</h3>
            <p style={{ fontSize: 15, color: "#4a6c85", lineHeight: 1.6, marginBottom: 18 }}>
              部長が部下が一仕事した時にかける言葉を思い出して……
            </p>
            <button onClick={() => setShowHint(false)} style={{ ...modalBtnStyle, background: "#14588C", color: "#fff", border: "none" }}>
              とじる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ color: "#fff", fontWeight: 900, fontSize: 15, marginBottom: 8, textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>{children}</div>;
}

// One card in the "🎴 集めたカード" grid — either an originally-awarded
// card (has art) or a 配合 (bred) card (stats only, no unique art since
// there's no dedicated hybrid illustration). Tappable to select for
// breeding; shows a highlighted ring + order badge while selected.
function CardTile({ card, selected, roleLabel, onOpen }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        onClick={onOpen}
        style={{
          width: "100%",
          position: "relative",
          cursor: "pointer",
        }}
      >
        {/* Percentage top-padding forces a true 1:1 box in every browser
            (including WebViews that don't honor CSS aspect-ratio),
            regardless of the source art's own proportions. */}
        <div style={{ paddingTop: "100%" }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 12,
            background: card.variant ? card.variant.cardBg : "linear-gradient(135deg,#D6C4F0,#5A3FA0)",
            boxShadow: selected
              ? "0 0 0 3px #FFE27A, 0 4px 10px rgba(11,61,98,0.35)"
              : "0 4px 10px rgba(11,61,98,0.25), inset 0 0 0 2px rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 6,
            boxSizing: "border-box",
            opacity: card.source === "growing" ? 0.9 : 1,
          }}
        >
          {card.imgSrc ? (
            <img
              src={card.imgSrc}
              alt={card.label}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: card.variant.filter === "none" ? "none" : card.variant.filter,
              }}
            />
          ) : (
            <span style={{ fontSize: 30 }}>⚗️</span>
          )}
          {roleLabel && (
            <span
              style={{
                position: "absolute",
                top: 3,
                left: 3,
                right: 3,
                textAlign: "center",
                background: roleLabel === "ベース" ? "#FFE27A" : "#9FD8EE",
                color: "#5C3A21",
                fontSize: 9.5,
                fontWeight: 900,
                borderRadius: 999,
                padding: "1px 4px",
              }}
            >
              {roleLabel}
            </span>
          )}
          <span
            style={{
              position: "absolute",
              bottom: 3,
              left: 3,
              background: card.source === "growing" ? "rgba(11,61,98,0.75)" : "#FFE27A",
              color: card.source === "growing" ? "#fff" : "#5C3A21",
              fontSize: 9,
              fontWeight: 900,
              borderRadius: 999,
              padding: "1px 5px",
            }}
          >
            Lv.{card.lv}
          </span>
        </div>
      </div>
      <div
        onClick={onOpen}
        style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.4)", marginTop: 4, textAlign: "center", cursor: "pointer", lineHeight: 1.3 }}
      >
        {card.label}
      </div>
    </div>
  );
}

// The card's full detail view — opened by tapping a card in the grid.
// Shows the growth line (small thumbnails, only once it's actually
// evolved past the egg), the Level and 6 stats (read-only — both are
// derived automatically from progress/Level, no manual editing), and
// which schedule earned it.
function CardDetailModal({ card, onClose, onPrev, onNext, starsForStats, onAllocate }) {
  const [previewStage, setPreviewStage] = useState(null); // stage index shown in the hero box, or null = current stage
  const [previewRecipe, setPreviewRecipe] = useState(null); // "base" | "sub" | null — which 配合の記録 tile (if any) is previewed
  const [allocating, setAllocating] = useState(false); // editing pending stat deltas
  const [pending, setPending] = useState({}); // { statKey: delta } — not yet saved
  const [confirming, setConfirming] = useState(false); // showing the final "これで良いですか？" check
  const isSchedule = card.source === "schedule";
  const isGrowing = card.source === "growing";
  const currentStageIdx = isGrowing && card.variant ? stageIndex(card.variant.species, card.currentPct) : null;
  const lastStageIdx = card.variant ? stageCount(card.variant.species) - 1 : null;
  const defaultHeroSrc = card.imgSrc || (isSchedule && card.variant ? stageImageAt(card.variant.species, lastStageIdx) : null);

  // The growth row shows this card's own stages, then — for each 配合
  // material that was absorbed into it — that material's own full stage
  // history too. The グランドマスター result itself isn't in this row; it
  // has its own recipe row below (ベース＋サブ＝結果). A still-unhatched egg
  // (stage 0) shows nothing here, to avoid spoiling which species it'll
  // become.
  const baseCount = card.variant && !(isGrowing && currentStageIdx === 0) ? (isGrowing ? currentStageIdx : lastStageIdx) + 1 : 0;
  const historyThumbs = [];
  for (let i = 0; i < baseCount; i++) {
    historyThumbs.push({
      src: stageImageAt(card.variant.species, i),
      filter: card.variant.filter,
      cardBg: card.variant.cardBg,
      variantName: card.variant.name,
      stageText: stageLabel(i),
    });
  }
  (card.combinedFrom || []).forEach((cf) => {
    if (!cf.variant) return;
    const n = (cf.stageIdx != null ? cf.stageIdx : stageCount(cf.variant.species) - 1) + 1;
    for (let i = 0; i < n; i++) {
      historyThumbs.push({
        src: stageImageAt(cf.variant.species, i),
        filter: cf.variant.filter,
        cardBg: cf.variant.cardBg,
        variantName: cf.variant.name,
        stageText: stageLabel(i),
      });
    }
  });
  const showEvolutionRow = historyThumbs.length > 0;
  // The slot that actually represents "now" among the plain growth stages
  // — this card's own last stage. For a グランドマスター card, none of
  // these represents "now" (that's the fusion result, shown separately),
  // so nothing here gets the "current" ring.
  const trueCurrentIdx = card.grandMaster ? null : baseCount > 0 ? baseCount - 1 : null;

  // 配合の記録：ベース＋サブ＝グランドマスター結果. Finds which absorbed
  // material's species, combined with this card's own original species,
  // actually produced the current fusion name (a card can absorb several
  // materials over time, but only one combo sets the name).
  const triggeringEntry =
    card.grandMaster && card.variant
      ? (card.combinedFrom || []).find((cf) => {
          if (!cf.variant) return false;
          const combo = getGrandMasterCombo(card.variant.species, cf.variant.species);
          return combo && combo.name === card.label;
        })
      : null;

  // Tapping a growth-stage thumbnail OR a 配合の記録 tile swaps the hero
  // preview, right in place — no separate overlay popup. Only one of the
  // two preview mechanisms is active at a time.
  const nowStageText = card.grandMaster ? "グランドマスター" : trueCurrentIdx !== null ? stageLabel(trueCurrentIdx) : "";
  const previewedThumb = previewStage !== null ? historyThumbs[previewStage] : null;
  let heroSrc = defaultHeroSrc;
  let heroFilter = card.grandMaster ? "none" : card.variant ? card.variant.filter : "none";
  let bubbleText = card.variant && nowStageText ? `${card.variant.name}（${nowStageText}）` : "";
  if (previewRecipe === "base" && card.variant) {
    heroSrc = stageImageAt(card.variant.species, lastStageIdx);
    heroFilter = card.variant.filter;
    bubbleText = `${card.variant.name}（${stageLabel(lastStageIdx)}）`;
  } else if (previewRecipe === "sub" && triggeringEntry) {
    const subLastIdx = stageCount(triggeringEntry.variant.species) - 1;
    heroSrc = stageImageAt(triggeringEntry.variant.species, subLastIdx);
    heroFilter = triggeringEntry.variant.filter;
    bubbleText = `${triggeringEntry.variant.name}（${stageLabel(subLastIdx)}）`;
  } else if (previewedThumb) {
    heroSrc = previewedThumb.src;
    heroFilter = previewedThumb.filter;
    bubbleText = `${previewedThumb.variantName}（${previewedThumb.stageText}）`;
  }

  const pendingTotal = STAT_KEYS.reduce((sum, k) => sum + (pending[k] || 0), 0);
  const remainingPool = starsForStats - pendingTotal;
  const overCapStats = STAT_KEYS.filter((k) => card.stats[k] + (pending[k] || 0) > capOf(k));
  const overPool = pendingTotal > starsForStats;
  const canConfirm = pendingTotal > 0 && !overPool && overCapStats.length === 0;

  function capOf(k) {
    return k === "hp" || k === "mp" ? STAT_MAX.hp : STAT_MAX.power;
  }
  function bump(k, delta) {
    setPending((prev) => {
      const next = (prev[k] || 0) + delta;
      const displayed = card.stats[k] + next;
      if (delta > 0 && (remainingPool <= 0 || displayed > capOf(k))) return prev;
      if (next < 0) return prev;
      return { ...prev, [k]: next };
    });
  }
  function setExact(k, raw) {
    const n = parseInt(raw, 10);
    setPending((prev) => ({ ...prev, [k]: isNaN(n) || n < 0 ? 0 : n }));
  }
  function startAllocating() {
    setPending({});
    setAllocating(true);
  }
  function cancelAllocating() {
    setPending({});
    setAllocating(false);
    setConfirming(false);
  }
  async function confirmAllocation() {
    if (!canConfirm) return;
    await onAllocate(card.id, pending);
    setPending({});
    setAllocating(false);
    setConfirming(false);
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalCardStyle, maxWidth: 440, maxHeight: "85vh", overflowY: "auto", textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 19, color: "#0B3D62" }}>{card.givenName || card.label}</h3>
          <button
            onClick={onClose}
            aria-label="閉じる"
            style={{ border: "none", background: "none", fontSize: 20, color: "#9db3c2", cursor: "pointer", padding: 0, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px auto 6px" }}>
          <button
            onClick={onPrev}
            disabled={!onPrev}
            aria-label="前のカード"
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: onPrev ? "#EAF4F9" : "transparent",
              color: onPrev ? "#14588C" : "transparent",
              fontSize: 16,
              fontWeight: 900,
              cursor: onPrev ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>
          <div
            style={{
              flex: 1,
              aspectRatio: "1 / 1",
              borderRadius: 20,
              background: card.variant ? card.variant.cardBg : "linear-gradient(135deg,#D6C4F0,#5A3FA0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              boxShadow: "0 10px 24px rgba(11,61,98,0.3), inset 0 0 0 3px rgba(255,255,255,0.6)",
              boxSizing: "border-box",
            }}
          >
            {heroSrc ? (
              <img
                src={heroSrc}
                alt={card.label}
                style={{ width: "100%", height: "100%", objectFit: "contain", filter: heroFilter === "none" ? "none" : heroFilter }}
              />
            ) : (
              <span style={{ fontSize: 100 }}>⚗️</span>
            )}
          </div>
          <button
            onClick={onNext}
            disabled={!onNext}
            aria-label="次のカード"
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: onNext ? "#EAF4F9" : "transparent",
              color: onNext ? "#14588C" : "transparent",
              fontSize: 16,
              fontWeight: 900,
              cursor: onNext ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ›
          </button>
        </div>
        {bubbleText && (
          <div style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "#7c98aa", marginBottom: 2 }}>{bubbleText}</div>
        )}
        <div style={{ textAlign: "center", fontSize: 15, fontWeight: 900, color: card.isMaster ? "#E0A83E" : "#0B3D62", marginBottom: 14 }}>
          Lv.{card.lv} {card.grandMaster ? "（Grand Master）" : card.isMaster ? "（Master）" : ""}
        </div>

        {triggeringEntry && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7c98aa", marginBottom: 6 }}>配合の記録（タップで上に表示）</div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 8, marginBottom: 14 }}>
              <RecipeTile
                src={stageImageAt(card.variant.species, lastStageIdx)}
                filter={card.variant.filter}
                cardBg={card.variant.cardBg}
                label={speciesLabel(card.variant.species)}
                selected={previewRecipe === "base"}
                onClick={() => {
                  setPreviewStage(null);
                  setPreviewRecipe(previewRecipe === "base" ? null : "base");
                }}
              />
              <div style={{ fontSize: 18, fontWeight: 900, color: "#7c98aa", marginTop: 24 }}>＋</div>
              <RecipeTile
                src={stageImageAt(triggeringEntry.variant.species, stageCount(triggeringEntry.variant.species) - 1)}
                filter={triggeringEntry.variant.filter}
                cardBg={triggeringEntry.variant.cardBg}
                label={speciesLabel(triggeringEntry.variant.species)}
                selected={previewRecipe === "sub"}
                onClick={() => {
                  setPreviewStage(null);
                  setPreviewRecipe(previewRecipe === "sub" ? null : "sub");
                }}
              />
              <div style={{ fontSize: 18, fontWeight: 900, color: "#7c98aa", marginTop: 24 }}>＝</div>
              <RecipeTile
                src={card.imgSrc}
                filter="none"
                cardBg={card.variant.cardBg}
                label={card.label}
                selected={previewRecipe === "result"}
                onClick={() => {
                  setPreviewStage(null);
                  setPreviewRecipe(previewRecipe === "result" ? null : "result");
                }}
              />
            </div>
          </>
        )}

        {showEvolutionRow && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7c98aa", margin: "12px 0 6px" }}>成長の様子（タップで上に表示）</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {historyThumbs.map((thumb, i) => {
                const isCurrent = i === trueCurrentIdx;
                const isPreviewed = previewStage === i;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      setPreviewRecipe(null);
                      setPreviewStage(isPreviewed ? null : i);
                    }}
                    style={{
                      width: "calc((100% - 24px) / 5)",
                      aspectRatio: "1 / 1",
                      borderRadius: 8,
                      background: thumb.cardBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 3,
                      boxSizing: "border-box",
                      boxShadow: isPreviewed ? "0 0 0 2px #3E6FBF" : isCurrent ? "0 0 0 2px #FFE27A" : "none",
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={thumb.src}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "contain", filter: thumb.filter === "none" ? "none" : thumb.filter }}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7c98aa" }}>ステータス</div>
          {card.isMaster && !allocating && (
            <button
              onClick={startAllocating}
              style={{ border: "none", background: "#FFE9A8", color: "#5C3A21", fontSize: 11.5, fontWeight: 800, borderRadius: 999, padding: "4px 10px", cursor: "pointer" }}
            >
              ⭐ ステータスに割り振る
            </button>
          )}
        </div>

        {card.isMaster && (
          <div style={{ fontSize: 12, fontWeight: 700, color: remainingPool < 0 ? "#D9455F" : "#4a6c85", marginBottom: 8 }}>
            使える★：残り {remainingPool} 個
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {STAT_KEYS.map((k) => {
            const delta = pending[k] || 0;
            const rowOverCap = card.stats[k] + delta > capOf(k);
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F5F9FB", borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0B3D62" }}>{STAT_LABELS[k]}</div>
                {allocating ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#0B3D62", minWidth: 26, textAlign: "right" }}>{card.stats[k]}</div>
                    <button
                      onClick={() => bump(k, -1)}
                      disabled={delta <= 0}
                      style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: delta > 0 ? "#DCEBF2" : "#EEF3F5", color: delta > 0 ? "#14588C" : "#c2d2da", fontWeight: 900, cursor: delta > 0 ? "pointer" : "default" }}
                    >
                      －
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: rowOverCap ? "#D9455F" : delta > 0 ? "#E0A83E" : "#c2d2da" }}>+</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={delta}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setExact(k, e.target.value)}
                        style={{
                          width: 44,
                          fontSize: 13,
                          fontWeight: 800,
                          color: rowOverCap ? "#D9455F" : "#0B3D62",
                          border: `1px solid ${rowOverCap ? "#D9455F" : "#BFE3F0"}`,
                          borderRadius: 6,
                          padding: "3px 4px",
                          textAlign: "center",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                    <button
                      onClick={() => bump(k, 1)}
                      disabled={remainingPool <= 0 || card.stats[k] + delta >= capOf(k)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "none",
                        background: remainingPool > 0 && card.stats[k] + delta < capOf(k) ? "#DCEBF2" : "#EEF3F5",
                        color: remainingPool > 0 && card.stats[k] + delta < capOf(k) ? "#14588C" : "#c2d2da",
                        fontWeight: 900,
                        cursor: remainingPool > 0 && card.stats[k] + delta < capOf(k) ? "pointer" : "default",
                      }}
                    >
                      ＋
                    </button>
                    <div style={{ fontSize: 12, color: "#7c98aa" }}>→</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: rowOverCap ? "#D9455F" : delta > 0 ? "#E0A83E" : "#0B3D62", minWidth: 28 }}>
                      {card.stats[k] + delta}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#0B3D62" }}>{card.stats[k]}</div>
                )}
              </div>
            );
          })}
        </div>

        {allocating && (overPool || overCapStats.length > 0) && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#D9455F", marginTop: -8, marginBottom: 14 }}>
            {overPool
              ? `★が足りません（使える★は残り ${starsForStats} 個です）`
              : `${overCapStats.map((k) => STAT_LABELS[k]).join("・")}が上限を超えています`}
          </div>
        )}

        {allocating && (
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button
              onClick={cancelAllocating}
              style={{ flex: 1, border: "none", background: "#EEF3F5", color: "#4a6c85", fontWeight: 800, borderRadius: 12, padding: "10px 0", cursor: "pointer" }}
            >
              キャンセル
            </button>
            <button
              onClick={() => canConfirm && setConfirming(true)}
              disabled={!canConfirm}
              style={{
                flex: 1,
                border: "none",
                background: canConfirm ? "#14588C" : "#c2d2da",
                color: "#fff",
                fontWeight: 800,
                borderRadius: 12,
                padding: "10px 0",
                cursor: canConfirm ? "pointer" : "default",
              }}
            >
              決定
            </button>
          </div>
        )}

        {isGrowing ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7c98aa", marginBottom: 6 }}>育成中のスケジュール</div>
            <div style={{ background: "#F5F9FB", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#4a6c85", lineHeight: 1.8 }}>
              <div style={{ fontWeight: 800, color: "#0B3D62" }}>{card.fromTitle || "無題のスケジュール"}</div>
              {card.startDate && card.endDate && (
                <div>
                  期間：{card.startDate} 〜 {card.endDate}
                </div>
              )}
              <div>⭐ 今のスタンプ数：{card.stamps}個</div>
              <div>達成度：{card.currentPct}%</div>
            </div>
          </>
        ) : isSchedule ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7c98aa", marginBottom: 6 }}>獲得したスケジュール</div>
            <div style={{ background: "#F5F9FB", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#4a6c85", lineHeight: 1.8 }}>
              <div style={{ fontWeight: 800, color: "#0B3D62" }}>{card.fromTitle || "無題のスケジュール"}</div>
              {card.startDate && card.endDate && (
                <div>
                  期間：{card.startDate} 〜 {card.endDate}
                </div>
              )}
              <div>⭐ 獲得スタンプ：{card.stars}個</div>
              {card.achvTotals && (card.achvTotals.minutes > 0 || card.achvTotals.pages > 0 || card.achvTotals.problems > 0) && (
                <div>
                  取り組んだ内容：
                  {card.achvTotals.minutes > 0 ? `⏱${card.achvTotals.minutes}分 ` : ""}
                  {card.achvTotals.pages > 0 ? `📖${card.achvTotals.pages}ページ ` : ""}
                  {card.achvTotals.problems > 0 ? `✏️${card.achvTotals.problems}問` : ""}
                </div>
              )}
              {card.earnedAt && <div>達成日：{card.earnedAt}</div>}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7c98aa", marginBottom: 6 }}>配合の記録</div>
            <div style={{ background: "#F5F9FB", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#4a6c85", lineHeight: 1.8 }}>
              <div>元のファミリアカード：{card.fromTitle}</div>
              {card.earnedAt && <div>配合した日：{card.earnedAt}</div>}
            </div>
          </>
        )}

        {(card.combinedFrom || []).map((cf, i) => (
          <div key={i} style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7c98aa", marginBottom: 6 }}>
              配合で加わったスケジュール{cf.label ? `（${cf.label}）` : ""}
            </div>
            <div style={{ background: "#F5F9FB", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#4a6c85", lineHeight: 1.8 }}>
              <div style={{ fontWeight: 800, color: "#0B3D62" }}>{cf.fromTitle || "無題のスケジュール"}</div>
              {cf.startDate && cf.endDate && (
                <div>
                  期間：{cf.startDate} 〜 {cf.endDate}
                </div>
              )}
              {typeof cf.stars === "number" && <div>⭐ 獲得スタンプ：{cf.stars}個</div>}
              {cf.earnedAt && <div>達成日：{cf.earnedAt}</div>}
            </div>
          </div>
        ))}
      </div>

      {confirming && (
        <div style={overlayStyle} onClick={() => setConfirming(false)}>
          <div style={{ ...modalCardStyle, maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px", fontSize: 17, color: "#0B3D62" }}>これで良いですか？</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, textAlign: "left" }}>
              {STAT_KEYS.filter((k) => (pending[k] || 0) > 0).map((k) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#0B3D62" }}>
                  <span style={{ fontWeight: 700 }}>{STAT_LABELS[k]}</span>
                  <span>
                    +{pending[k]}（{card.stats[k]} → {card.stats[k] + pending[k]}）
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#E0A83E", marginBottom: 16 }}>⭐ {pendingTotal}個 使います</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirming(false)} style={modalBtnStyle}>
                いいえ
              </button>
              <button onClick={confirmAllocation} style={{ ...modalBtnStyle, background: "#14588C", color: "#fff", border: "none" }}>
                はい
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// One tile in the ベース＋サブ＝結果 recipe row — a small square image with
// its species/fusion name underneath.
function RecipeTile({ src, filter, cardBg, label, selected, onClick }) {
  return (
    <div style={{ width: 68, textAlign: "center", cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 10,
          background: cardBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 4,
          boxShadow: selected ? "0 0 0 2px #3E6FBF, 0 4px 10px rgba(11,61,98,0.2)" : "0 4px 10px rgba(11,61,98,0.2)",
          boxSizing: "border-box",
        }}
      >
        {src ? (
          <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain", filter: filter === "none" ? "none" : filter }} />
        ) : (
          <span style={{ fontSize: 26 }}>⚗️</span>
        )}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#4a6c85", marginTop: 3, lineHeight: 1.2 }}>{label}</div>
    </div>
  );
}

function BreedPage({ masterCards, onFinalize, onClose }) {
  const [baseId, setBaseId] = useState(null);
  const [subId, setSubId] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function handleTap(id) {
    if (id === baseId) {
      setBaseId(null);
      return;
    }
    if (id === subId) {
      setSubId(null);
      return;
    }
    if (!baseId) {
      setBaseId(id);
      return;
    }
    if (!subId) {
      setSubId(id);
      return;
    }
    // both slots already filled — swap in the new pick as サブ
    setSubId(id);
  }

  const base = masterCards.find((c) => c.id === baseId);
  const sub = masterCards.find((c) => c.id === subId);
  const combined = base && sub ? combineStats(base.stats, sub.stats) : null;
  const combinedLv = base && sub ? combineLevel(base.lv, sub.lv) : null;
  const willGrandMaster =
    base && sub && base.variant && sub.variant && !base.grandMaster ? getGrandMasterCombo(base.variant.species, sub.variant.species) : null;

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif", padding: "28px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#EAF7FB", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 14, fontFamily: "inherit", padding: 0 }}
        >
          ← もどる
        </button>
        <h1 style={{ fontFamily: "'Kaisei Decol', serif", color: "#fff", fontSize: 24, textAlign: "center", textShadow: "0 2px 8px rgba(11,61,98,0.5)", marginBottom: 6 }}>
          ⚗️ ファミリア配合
        </h1>
        <p style={{ textAlign: "center", color: "#EAF7FB", fontSize: 13, marginBottom: 18, lineHeight: 1.7 }}>
          「ベース」と「サブ」を1枚ずつ選んでください。配合すると、ベースのLVとステータスにサブの分が合計され、サブのファミリアカードはなくなります。
        </p>

        <div style={{ fontSize: 12, color: "#EAF7FB", fontWeight: 700, marginBottom: 8 }}>Masterのファミリアカード一覧</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 22 }}>
          {masterCards.map((c) => (
            <CardTile
              key={c.id}
              card={c}
              selected={c.id === baseId || c.id === subId}
              roleLabel={c.id === baseId ? "ベース" : c.id === subId ? "サブ" : null}
              onOpen={() => handleTap(c.id)}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "center", marginBottom: 6 }}>
          <StatSlotCard label="ベース" accent="#FFE27A" card={base} />
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, marginTop: 60, flexShrink: 0 }}>＋</div>
          <StatSlotCard label="サブ" accent="#9FD8EE" card={sub} />
        </div>

        <div style={{ textAlign: "center", color: "#EAF7FB", fontSize: 22, fontWeight: 900, margin: "4px 0 10px" }}>↓</div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <ResultStatCard base={base} combined={combined} combinedLv={combinedLv} willGrandMaster={willGrandMaster} />
        </div>

        {base && sub && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            style={{ width: "100%", padding: "14px 0", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#B48CE0,#5A3FA0)", color: "#fff", fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "inherit", marginBottom: 18 }}
          >
            この内容で配合する
          </button>
        )}

        {confirming && (
          <div style={{ background: "#FFF7E0", border: "2px solid #F4C95D", borderRadius: 14, padding: 16, marginBottom: 18, textAlign: "center" }}>
            <p style={{ fontSize: 14.5, color: "#5C3A21", fontWeight: 700, margin: "0 0 12px" }}>
              これでよいですか？サブの「{sub.label}」のファミリアカードはなくなります。
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirming(false)}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "2px solid #d7ecf3", background: "#fff", color: "#5a7d94", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                いいえ、やめる
              </button>
              <button
                onClick={async () => {
                  await onFinalize(base.id, sub.id);
                  onClose();
                }}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: "#5A3FA0", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                はい、配合する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat-icon shown before each stat row on the 配合 cards — decorative only.
const STAT_ICONS = { hp: "❤️", mp: "💧", power: "⚔️", defense: "🛡️", speed: "💨", wisdom: "✨" };

// One side of the 配合 picker — the ベース or サブ slot, showing the full
// stat sheet for whichever card is selected there (or an empty placeholder
// prompting a pick from the list below).
function StatSlotCard({ label, accent, card }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: "#fff", borderRadius: 16, padding: "10px 8px", boxShadow: "0 8px 18px rgba(11,61,98,0.25)" }}>
      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 900, color: "#5C3A21", background: accent, borderRadius: 999, padding: "2px 0", marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: 130,
          aspectRatio: "1 / 1",
          margin: "0 auto 6px",
          borderRadius: 12,
          background: card ? (card.variant ? card.variant.cardBg : "linear-gradient(135deg,#D6C4F0,#5A3FA0)") : "#fff",
          border: card ? "none" : "2px dashed #d7ecf3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: card ? 5 : 0,
          boxSizing: "border-box",
        }}
      >
        {card &&
          (card.imgSrc ? (
            <img
              src={card.imgSrc}
              alt={card.label}
              style={{ width: "100%", height: "100%", objectFit: "contain", filter: card.variant && card.variant.filter === "none" ? "none" : card.variant ? card.variant.filter : "none" }}
            />
          ) : (
            <span style={{ fontSize: 30 }}>⚗️</span>
          ))}
      </div>
      <div style={{ textAlign: "center", fontSize: 11.5, fontWeight: 800, color: card ? "#0B3D62" : "#c2d2da", marginBottom: 2 }}>
        {card ? card.label : "下の一覧からタップして選択"}
      </div>
      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: card ? "#E0A83E" : "#c2d2da", marginBottom: 6 }}>
        {card ? `Lv.${card.lv}` : "Lv.—"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {STAT_KEYS.map((k) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: "#4a6c85", background: "#F5F9FB", borderRadius: 6, padding: "3px 7px" }}>
            <span>
              {STAT_ICONS[k]} {STAT_LABELS[k]}
            </span>
            <span style={{ fontWeight: 800, fontSize: 14, color: card ? "#0B3D62" : "#c2d2da" }}>{card ? card.stats[k] : "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// The combined-result preview — ベース's own art/name (or the グランドマス
// ター fusion's, if this pair matches a combo) with the summed stats.
function ResultStatCard({ base, combined, combinedLv, willGrandMaster }) {
  const ready = !!(base && combined);
  const displayLabel = ready ? (willGrandMaster ? willGrandMaster.name : base.label) : null;
  const displayImg = ready ? (willGrandMaster && willGrandMaster.img ? willGrandMaster.img : base.imgSrc) : null;
  const displayFilter = ready
    ? willGrandMaster && willGrandMaster.img
      ? "none"
      : base.variant && base.variant.filter === "none"
      ? "none"
      : base.variant
      ? base.variant.filter
      : "none"
    : "none";
  return (
    <div style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 16, padding: "12px 14px", boxShadow: "0 10px 22px rgba(11,61,98,0.3)", border: "2px solid #FFE27A", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 900, color: "#5C3A21", background: "#FFE27A", borderRadius: 999, padding: "2px 0", marginBottom: 8 }}>
        配合後のファミリア
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: 340,
          aspectRatio: "1 / 1",
          margin: "0 auto 8px",
          borderRadius: 14,
          background: ready ? (base.variant ? base.variant.cardBg : "linear-gradient(135deg,#D6C4F0,#5A3FA0)") : "#fff",
          border: ready ? "none" : "2px dashed #d7ecf3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: ready ? 10 : 0,
          boxSizing: "border-box",
        }}
      >
        {ready &&
          (displayImg ? (
            <img src={displayImg} alt={displayLabel} style={{ width: "100%", height: "100%", objectFit: "contain", filter: displayFilter }} />
          ) : (
            <span style={{ fontSize: 60 }}>⚗️</span>
          ))}
      </div>
      <div style={{ textAlign: "center", fontSize: 13, fontWeight: 900, color: ready ? "#0B3D62" : "#c2d2da", marginBottom: 2 }}>
        {ready ? displayLabel : "ベースとサブを選ぶとここに表示されます"}
      </div>
      {ready && willGrandMaster && (
        <div style={{ textAlign: "center", fontSize: 10.5, fontWeight: 800, color: "#E0A83E", marginBottom: 2 }}>⭐ グランドマスターに変化！</div>
      )}
      <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, color: ready ? "#E0A83E" : "#c2d2da", marginBottom: 8 }}>
        {ready ? `Lv.${combinedLv}` : "Lv.—"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 5 }}>
        {STAT_KEYS.map((k) => (
          <div key={k} style={{ background: "#F5F9FB", borderRadius: 8, padding: "4px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#7c98aa" }}>
              {STAT_ICONS[k]} {STAT_LABELS[k]}
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: ready ? "#0B3D62" : "#c2d2da" }}>{ready ? combined[k] : "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const iconBtnStyle = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "none",
  background: "rgba(255,255,255,0.3)",
  color: "#fff",
  fontSize: 18,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const actionBtnStyle = {
  flex: 1,
  border: "none",
  borderRadius: 14,
  padding: "13px 0",
  fontWeight: 900,
  fontSize: 14.5,
  color: "#fff",
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "0 8px 18px rgba(0,0,0,0.25)",
};

const linkBtnStyle = {
  display: "inline-block",
  background: "none",
  border: "none",
  color: "#EAF7FB",
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "underline",
  cursor: "pointer",
  fontFamily: "inherit",
  padding: 0,
};

const emptyCardStyle = {
  background: "rgba(255,255,255,0.9)",
  borderRadius: 14,
  padding: 16,
  color: "#7c98aa",
  fontSize: 13.5,
  lineHeight: 1.6,
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(11,61,98,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 20,
};

const modalCardStyle = {
  background: "#fff",
  borderRadius: 20,
  padding: 24,
  maxWidth: 340,
  width: "100%",
  textAlign: "center",
};

const modalBtnStyle = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 15,
};

function ProfileSetupScreen({ initial, isNew, onSave, onCancel, onRequestDelete }) {
  const [name, setName] = useState(initial.name || "");
  const [birthdate, setBirthdate] = useState(initial.birthdate || "");
  const [pin, setPin] = useState(initial.pin || "");
  const [dupProfile, setDupProfile] = useState(null); // { id, name } | null
  const [checking, setChecking] = useState(false);
  const pinValid = pin.length >= 4 && pin.length <= 6;
  const canSave = !!name.trim() && !!birthdate && pinValid;

  async function handleSaveClick() {
    if (!canSave) return;
    setDupProfile(null);

    if (isNew) {
      setChecking(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, blob")
          .eq("blob->>name", name.trim())
          .eq("blob->>birthdate", birthdate);
        if (data && data.length > 0) {
          setDupProfile({ id: data[0].id, name: (data[0].blob && data[0].blob.name) || name.trim() });
          setChecking(false);
          return;
        }
      } catch (e) {}
      setChecking(false);
    }

    onSave(name, birthdate, pin);
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "28px 16px", display: "flex", justifyContent: "center" }}>
      <div style={{ background: "linear-gradient(180deg,#FFFBF3,#FFF7EC)", borderRadius: 24, padding: 26, maxWidth: 420, width: "100%", height: "fit-content", boxShadow: "0 20px 50px rgba(11,61,98,0.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          <a href={window.location.pathname} style={{ textDecoration: "none", color: "#14588C", fontWeight: 700, fontSize: 15 }}>
            🏠 トップへ
          </a>
          {onCancel && (
            <button onClick={onCancel} style={{ background: "none", border: "none", color: "#14588C", fontWeight: 700, cursor: "pointer", fontSize: 15, fontFamily: "inherit" }}>
              ← もどる
            </button>
          )}
        </div>
        <h1 style={{ fontFamily: "'Kaisei Decol', serif", fontSize: 26, color: "#0B3D62", margin: "0 0 6px" }}>
          {isNew ? "スタンプ帳をつくろう" : "プロフィールを編集する"}
        </h1>
        <p style={{ color: "#4a6c85", fontSize: 14.5, marginBottom: 20 }}>
          名前と生年月日だけの、かんたんなプロフィールです。むずかしい登録は必要ありません。
        </p>

        <label style={{ display: "block", fontWeight: 700, fontSize: 15, marginBottom: 6, color: "#14588C" }}>なまえ</label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDupProfile(null);
          }}
          placeholder="例）美月"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "2px solid #BFE3F0", fontSize: 16, fontFamily: "inherit", marginBottom: 18, boxSizing: "border-box" }}
        />

        <label style={{ display: "block", fontWeight: 700, fontSize: 15, marginBottom: 6, color: "#14588C" }}>生年月日</label>
        <div style={{ marginBottom: 22 }}>
          <BirthdateSelects
            value={birthdate}
            onChange={(v) => {
              setBirthdate(v);
              setDupProfile(null);
            }}
          />
        </div>

        <label style={{ display: "block", fontWeight: 700, fontSize: 15, marginBottom: 6, color: "#14588C" }}>
          保護者用 暗証番号（数字4〜6桁）
        </label>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder="例）1234"
          style={{ width: "100%", padding: "11px 12px", borderRadius: 12, border: "2px solid #BFE3F0", fontSize: 15, fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box" }}
        />
        <p style={{ color: "#7c98aa", fontSize: 12.5, marginTop: 0, marginBottom: 22, lineHeight: 1.5 }}>
          「景品を編集する」を開くときにこの番号の入力が必要になります（お子さんが誤って変更しないためです）。同じ名前のお子さんがいても、生年月日でスタンプ帳を区別できます。
        </p>

        {dupProfile && (
          <div style={{ background: "#FFF3E0", border: "2px solid #F4C95D", borderRadius: 14, padding: "12px 14px", marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px", color: "#8B5E34", fontWeight: 800, fontSize: 14.5 }}>
              🌟 そのスタンプ帳はもうあるよ
            </p>
            <a
              href={`${window.location.pathname}?profile=${dupProfile.id}`}
              style={{ color: "#14588C", fontWeight: 700, fontSize: 13.5, textDecoration: "underline" }}
            >
              「{dupProfile.name}」のスタンプ帳を開く
            </a>
          </div>
        )}

        <button
          onClick={handleSaveClick}
          disabled={!canSave || checking}
          style={{
            width: "100%",
            padding: "15px 0",
            borderRadius: 16,
            border: "none",
            background: canSave ? "linear-gradient(135deg,#FFB6C9,#F4C95D)" : "#e5edf1",
            color: canSave ? "#fff" : "#aab8c0",
            fontWeight: 900,
            fontSize: 17,
            cursor: canSave ? "pointer" : "default",
            fontFamily: "inherit",
          }}
        >
          {checking ? "確認しています…" : isNew ? "スタンプ帳をはじめる" : "保存する"}
        </button>

        {onRequestDelete && (
          <button
            onClick={onRequestDelete}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 16,
              border: "2px solid #FBD4DB",
              background: "#fff",
              color: "#E0526B",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "inherit",
              marginTop: 14,
            }}
          >
            🗑 このスタンプ帳を削除する
          </button>
        )}
      </div>
    </div>
  );
}

function RewardsEditor({ rewards, onSave, onCancel }) {
  const [list, setList] = useState(rewards.length ? rewards : []);

  function addReward() {
    setList((prev) => [...prev, { id: generateScheduleId(6), name: "", cost: 10 }]);
  }
  function update(id, patch) {
    setList((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function remove(id) {
    setList((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "28px 16px", display: "flex", justifyContent: "center" }}>
      <div style={{ background: "linear-gradient(180deg,#FFFBF3,#FFF7EC)", borderRadius: 24, padding: 26, maxWidth: 420, width: "100%", height: "fit-content", boxShadow: "0 20px 50px rgba(11,61,98,0.35)" }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "#14588C", fontWeight: 700, marginBottom: 10, cursor: "pointer", fontSize: 15, fontFamily: "inherit" }}>
          ← もどる
        </button>
        <h1 style={{ fontFamily: "'Kaisei Decol', serif", fontSize: 24, color: "#0B3D62", margin: "0 0 16px" }}>景品リストを編集</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          {list.map((r) => (
            <div key={r.id} style={{ background: "#fff", border: "2px solid #EAF7FB", borderRadius: 14, padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={r.name}
                onChange={(e) => update(r.id, { name: e.target.value })}
                placeholder="景品名（例：ガチャ1回）"
                style={{ flex: 1, border: "none", borderBottom: "2px solid #EAF7FB", padding: "6px 2px", fontSize: 15, fontFamily: "inherit", outline: "none" }}
              />
              <input
                type="number"
                min={1}
                value={r.cost}
                onChange={(e) => update(r.id, { cost: Math.max(1, Number(e.target.value) || 1) })}
                style={{ width: 60, padding: "6px 6px", borderRadius: 8, border: "2px solid #BFE3F0", fontSize: 14, textAlign: "center", fontFamily: "inherit" }}
              />
              <span style={{ fontSize: 13, color: "#7c98aa" }}>個</span>
              <button onClick={() => remove(r.id)} style={{ border: "none", background: "rgba(224,82,107,0.12)", color: "#E0526B", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14 }}>
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addReward}
          style={{ display: "block", width: "100%", padding: "12px 0", borderRadius: 14, border: "none", background: "#14588C", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 16 }}
        >
          ＋ 景品を追加
        </button>

        <button
          onClick={() => onSave(list.filter((r) => r.name.trim()))}
          style={{ width: "100%", padding: "15px 0", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#FFB6C9,#F4C95D)", color: "#fff", fontWeight: 900, fontSize: 17, cursor: "pointer", fontFamily: "inherit" }}
        >
          保存する
        </button>
      </div>
    </div>
  );
}
