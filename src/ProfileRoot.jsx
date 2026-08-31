import React, { useEffect, useState } from "react";
import { supabase } from "./db.js";
import { getProfileIdFromUrl, generateProfileId } from "./profileId.js";
import { upsertKnownProfile, removeKnownProfile } from "./profileRegistry.js";
import { generateScheduleId } from "./scheduleId.js";
import { getVariant, finalFormImage } from "./mascots.js";

const bg = "linear-gradient(180deg, #0B3D62 0%, #14588C 42%, #2E9BC7 78%, #6FCFEB 100%)";
// Backup PIN — always accepted alongside whatever PIN the parent set, in case
// they forget their own. Intentionally not a secret kept from the parent.
const MASTER_PIN = "5963";

function countStampsInBlob(blob) {
  const completions = (blob && blob.completions) || {};
  let n = 0;
  Object.values(completions).forEach((day) => {
    Object.values(day || {}).forEach((v) => {
      if (v >= 1) n++;
    });
  });
  return n;
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
        .map((row) => ({
          id: row.id,
          title: row.blob.config.title,
          theme: row.blob.config.theme || "girl",
          stamps: countStampsInBlob(row.blob),
          awardedCard: row.blob.config.awardedCard || null,
        }));
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

  // Cards earned across every schedule linked to this stamp book, grouped
  // by theme+color so getting the same dragon/pegasus twice shows as
  // "ブルードラゴン ×2" instead of two separate entries.
  const cardGroups = (() => {
    const map = new Map();
    schedules.forEach((s) => {
      if (!s.awardedCard) return;
      const cardTheme = s.awardedCard.theme || s.theme || "girl";
      const variant = getVariant(cardTheme, s.awardedCard.variant);
      const groupKey = `${cardTheme}:${variant.key}`;
      const existing = map.get(groupKey);
      if (existing) existing.count += 1;
      else map.set(groupKey, { theme: cardTheme, variant, count: 1 });
    });
    return Array.from(map.values());
  })();
  const totalSpent = (profile.redemptions || []).reduce((sum, r) => sum + r.cost, 0);
  const available = totalEarned - totalSpent;

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

        <SectionTitle>📅 つながっているスケジュール</SectionTitle>
        <div style={{ marginBottom: 18 }}>
          {schedules.length === 0 ? (
            <div style={emptyCardStyle}>まだスケジュールがありません。下のボタンから作ってみましょう。</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {schedules.map((s) => (
                <a key={s.id} href={`${window.location.pathname}?id=${s.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "#fff", borderRadius: 14, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 10px rgba(11,61,98,0.15)" }}>
                    <span style={{ fontWeight: 800, color: "#0B3D62", fontSize: 14.5 }}>
                      {s.theme === "boy" ? "🐉" : "🎀"} {s.title || "無題のスケジュール"}
                    </span>
                    <span style={{ color: "#B5651D", fontWeight: 800, fontSize: 13.5 }}>⭐️ {s.stamps}</span>
                  </div>
                </a>
              ))}
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

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button onClick={handleShare} style={{ ...actionBtnStyle, background: "#5A4FCF" }}>
            {copied ? "✅ コピーしました！" : "📤 プロフィールを共有"}
          </button>
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

        <SectionTitle>🎴 集めたカード</SectionTitle>
        <div style={{ marginBottom: 18 }}>
          {cardGroups.length === 0 ? (
            <div style={emptyCardStyle}>まだカードがありません。スケジュールを最後まで達成するとカードがもらえます。</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 10 }}>
              {cardGroups.map((g) => (
                <div key={`${g.theme}:${g.variant.key}`} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: 14,
                      background: g.variant.cardBg,
                      boxShadow: "0 6px 14px rgba(11,61,98,0.25), inset 0 0 0 2px rgba(255,255,255,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 8,
                      position: "relative",
                    }}
                  >
                    <img
                      src={finalFormImage(g.theme, g.variant.key)}
                      alt={g.variant.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        filter: g.variant.filter === "none" ? "none" : g.variant.filter,
                      }}
                    />
                    {g.count > 1 && (
                      <span
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(11,61,98,0.85)",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 900,
                          borderRadius: 999,
                          padding: "2px 6px",
                        }}
                      >
                        ×{g.count}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.4)", marginTop: 4, textAlign: "center" }}>
                    {g.variant.name}
                    {g.count > 1 ? ` ×${g.count}` : ""}
                  </div>
                </div>
              ))}
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

  async function handleSaveClick() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setDupProfile(null);

    if (isNew) {
      setChecking(true);
      try {
        let query = supabase.from("profiles").select("id, blob").eq("blob->>name", trimmedName);
        if (birthdate) query = query.eq("blob->>birthdate", birthdate);
        const { data } = await query;
        if (data && data.length > 0) {
          setDupProfile({ id: data[0].id, name: (data[0].blob && data[0].blob.name) || trimmedName });
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

        <label style={{ display: "block", fontWeight: 700, fontSize: 15, marginBottom: 6, color: "#14588C" }}>生年月日（任意）</label>
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
          保護者用 暗証番号（任意・数字4〜6桁）
        </label>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder="設定しない場合は空欄でOK"
          style={{ width: "100%", padding: "11px 12px", borderRadius: 12, border: "2px solid #BFE3F0", fontSize: 15, fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box" }}
        />
        <p style={{ color: "#7c98aa", fontSize: 12.5, marginTop: 0, marginBottom: 22, lineHeight: 1.5 }}>
          設定すると、「景品を編集する」を開くときにこの番号の入力が必要になります（お子さんが誤って変更しないためです）。
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
          disabled={!name.trim() || checking}
          style={{
            width: "100%",
            padding: "15px 0",
            borderRadius: 16,
            border: "none",
            background: name.trim() ? "linear-gradient(135deg,#FFB6C9,#F4C95D)" : "#e5edf1",
            color: name.trim() ? "#fff" : "#aab8c0",
            fontWeight: 900,
            fontSize: 17,
            cursor: name.trim() ? "pointer" : "default",
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
