import React, { useEffect, useState } from "react";
import { getKnownSchedules, upsertKnownSchedule, removeKnownSchedule } from "./registry.js";
import { generateProfileId } from "./profileId.js";
import { getKnownProfiles } from "./profileRegistry.js";
import { supabase } from "./db.js";
import { computeOverallStats } from "./progress.js";

const oceanBg = "linear-gradient(180deg, #0B3D62 0%, #14588C 42%, #2E9BC7 78%, #6FCFEB 100%)";
// Backup PIN — always accepted alongside whatever PIN the profile's owner
// set. Not a secret kept from parents; same master code used elsewhere in
// the app (schedule creation gate, per-schedule lock).
const MASTER_PIN = "5963";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const BIRTH_YEAR_OPTIONS = Array.from({ length: 57 }, (_, i) => 2026 - i); // 2026 down to 1970
const BIRTH_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const BIRTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

const dateSelectStyle = {
  flex: 1,
  minWidth: 0,
  padding: "9px 4px",
  borderRadius: 10,
  border: "2px solid #BFE3F0",
  fontSize: 13.5,
  fontFamily: "inherit",
  background: "#fff",
  color: "#0B3D62",
  fontWeight: 700,
};
const dateSelectYearStyle = { ...dateSelectStyle, flex: 1.6, minWidth: 66, padding: "9px 2px" };

// Year / month / day as three drum-roll <select> wheels instead of a native
// date input — some browsers only let year+month scroll and make day a
// separate calendar tap, so this keeps all three consistently quick.
function BirthdateSelects({ value, onChange }) {
  const [y, m, d] = (value || "").split("-");
  function update(ny, nm, nd) {
    if (ny && nm && nd) onChange(`${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`);
    else onChange("");
  }
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
      <select value={y || ""} onChange={(e) => update(e.target.value, m, d)} style={dateSelectYearStyle}>
        <option value="">年</option>
        {BIRTH_YEAR_OPTIONS.map((yy) => (
          <option key={yy} value={yy}>
            {yy}
          </option>
        ))}
      </select>
      <select value={m ? Number(m) : ""} onChange={(e) => update(y, e.target.value, d)} style={dateSelectStyle}>
        <option value="">月</option>
        {BIRTH_MONTH_OPTIONS.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
      <select value={d ? Number(d) : ""} onChange={(e) => update(y, m, e.target.value)} style={dateSelectStyle}>
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

function formatRange(s, e) {
  if (!s || !e) return "";
  const fmt = (str) => {
    const [, m, d] = str.split("-");
    return `${Number(m)}/${Number(d)}`;
  };
  return `${fmt(s)}〜${fmt(e)}`;
}

// Gate shown after "スタンプ帳を探す" finds a match, before actually opening
// it — requires the profile's own PIN or the master PIN. An empty typed
// value never matches, even if the profile itself has no PIN set (in that
// case only the master PIN opens it), so name+birthdate alone can never be
// enough to see someone else's stamp book.
function FindProfilePinModal({ correctPin, onSuccess, onCancel }) {
  const [val, setVal] = useState("");
  const [failed, setFailed] = useState(false);

  function submit() {
    if (val && (val === correctPin || val === MASTER_PIN)) {
      onSuccess();
    } else {
      setFailed(true);
      setVal("");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(11,61,98,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 20, padding: 24, maxWidth: 340, width: "100%", textAlign: "center" }}>
        <h3 style={{ margin: "0 0 8px", color: "#0B3D62", fontSize: 18 }}>保護者の方へ</h3>
        <p style={{ margin: "0 0 16px", color: "#4a6c85", fontSize: 14 }}>
          このスタンプ帳を開くには、暗証番号を入力してください
        </p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={val}
          onChange={(e) => {
            setVal(e.target.value.replace(/[^0-9]/g, "").slice(0, 6));
            setFailed(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="••••"
          style={{
            width: "100%",
            boxSizing: "border-box",
            textAlign: "center",
            letterSpacing: 6,
            fontSize: 20,
            padding: "12px 14px",
            borderRadius: 12,
            border: failed ? "2px solid #E0526B" : "2px solid #BFE3F0",
            fontFamily: "inherit",
            marginBottom: failed ? 8 : 16,
          }}
        />
        {failed && <p style={{ color: "#E0526B", fontSize: 13, margin: "0 0 16px" }}>暗証番号が違います</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              border: "none",
              background: "#EAF4F9",
              color: "#14588C",
              fontWeight: 800,
              fontSize: 14,
              borderRadius: 12,
              padding: "12px 0",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            やめる
          </button>
          <button
            onClick={submit}
            style={{
              flex: 1,
              border: "none",
              background: "#14588C",
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              borderRadius: 12,
              padding: "12px 0",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            開ける
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TopPage() {
  const [profiles, setProfiles] = useState(getKnownProfiles());
  const [appCopied, setAppCopied] = useState(false);
  const [findName, setFindName] = useState("");
  const [findBirthdate, setFindBirthdate] = useState("2015-01-01");
  const [findStatus, setFindStatus] = useState("idle"); // idle | searching | notfound
  const [pendingProfile, setPendingProfile] = useState(null); // { id, pin } | null — awaiting PIN before opening

  const appUrl = `${window.location.origin}${window.location.pathname}`;

  async function handleShareApp() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "頑張りスケジュール", url: appUrl });
      } catch (e) {
        // user cancelled the share sheet — nothing to do
      }
    } else {
      try {
        await navigator.clipboard.writeText(appUrl);
        setAppCopied(true);
        setTimeout(() => setAppCopied(false), 2000);
      } catch (e) {}
    }
  }

  function handleLineShareApp() {
    const encoded = encodeURIComponent(appUrl);
    window.open(`https://social-plugins.line.me/lineit/share?url=${encoded}`, "_blank", "noopener,noreferrer");
  }

  function handleCreateProfile() {
    const id = generateProfileId();
    window.location.href = `${window.location.pathname}?profile=${id}`;
  }

  async function handleFindProfile() {
    const name = findName.trim();
    if (!name) return;
    setFindStatus("searching");
    try {
      let query = supabase.from("profiles").select("id, blob").eq("blob->>name", name);
      if (findBirthdate) query = query.eq("blob->>birthdate", findBirthdate);
      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        setFindStatus("notfound");
        return;
      }
      setFindStatus("idle");
      // Found it — but don't navigate straight in. Require the profile's own
      // PIN (or the master PIN) first, so name+birthdate alone isn't enough
      // to open someone else's stamp book.
      setPendingProfile({ id: data[0].id, pin: (data[0].blob && data[0].blob.pin) || "" });
    } catch (e) {
      setFindStatus("notfound");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: oceanBg,
        fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif",
        padding: "36px 16px",
        boxSizing: "border-box",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Kaisei+Decol:wght@700&family=Zen+Maru+Gothic:wght@500;700;900&display=swap');`}</style>

      <div style={{ position: "fixed", top: 8, right: 8, zIndex: 999, display: "flex", gap: 6 }}>
        {typeof navigator !== "undefined" && navigator.share ? (
          <button
            onClick={handleShareApp}
            title="アプリを共有（AirDropなど）"
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "none",
              background: "#5A4FCF",
              color: "#fff",
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "0 6px 14px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {appCopied ? "✅" : "📤"}
          </button>
        ) : (
          <button
            onClick={handleShareApp}
            title="アプリのリンクをコピー"
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "none",
              background: "#14588C",
              color: "#fff",
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "0 6px 14px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {appCopied ? "✅" : "🔗"}
          </button>
        )}
        <button
          onClick={handleLineShareApp}
          title="LINEでシェア"
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            border: "none",
            background: "#06C755",
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
            boxShadow: "0 6px 14px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          💬
        </button>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <h1
          style={{
            fontFamily: "'Kaisei Decol', serif",
            color: "#fff",
            textAlign: "center",
            fontSize: 32,
            textShadow: "0 2px 10px rgba(11,61,98,0.5)",
            margin: "0 0 6px",
          }}
        >
          🐚 がんばりスケジュール
        </h1>
        <p style={{ textAlign: "center", color: "#EAF7FB", fontSize: 13, marginBottom: 4 }}>
          <a href={`${window.location.pathname}?guide=1`} style={{ color: "#FFE9A8", textDecoration: "underline" }}>
            使い方ガイド
          </a>
        </p>
        <h2
          style={{
            fontFamily: "'Kaisei Decol', serif",
            color: "#fff",
            textAlign: "center",
            fontSize: 21,
            textShadow: "0 2px 8px rgba(11,61,98,0.5)",
            margin: "18px 0 14px",
          }}
        >
          まずはスタンプ帳を作ろう！
        </h2>

        <button
          onClick={handleCreateProfile}
          style={{
            display: "block",
            width: "100%",
            border: "none",
            borderRadius: 16,
            padding: "17px 0",
            marginBottom: profiles.length > 0 ? 10 : 20,
            fontWeight: 900,
            fontSize: 17,
            color: "#5C3A21",
            cursor: "pointer",
            fontFamily: "inherit",
            background: "linear-gradient(135deg,#F4E2B8,#E5C878)",
            boxShadow: "0 10px 20px rgba(0,0,0,0.25)",
          }}
        >
          🌟 スタンプ帳をつくる
        </button>

        {profiles.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: "#EAF7FB", fontSize: 12, fontWeight: 700, marginBottom: 6, paddingLeft: 4 }}>
              作成ずみのスタンプ帳
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {profiles.map((p) => (
                <a key={p.id} href={`${window.location.pathname}?profile=${p.id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.55)",
                      border: "1.5px solid rgba(255,255,255,0.7)",
                      borderRadius: 10,
                      padding: "7px 12px",
                      fontWeight: 700,
                      color: "#fff",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 12 }}>🌟</span>
                    <span style={{ flex: 1 }}>{p.name || "スタンプ帳"}</span>
                    <span style={{ opacity: 0.8 }}>›</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            background: "rgba(255,255,255,0.9)",
            borderRadius: 16,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <div style={{ fontWeight: 900, color: "#0B3D62", fontSize: 14, marginBottom: 10 }}>🔍 スタンプ帳を探す</div>
          <input
            value={findName}
            onChange={(e) => {
              setFindName(e.target.value);
              setFindStatus("idle");
            }}
            placeholder="なまえ（例：美月）"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "2px solid #BFE3F0",
              fontSize: 14,
              fontFamily: "inherit",
              marginBottom: 8,
              boxSizing: "border-box",
            }}
          />
          <BirthdateSelects
            value={findBirthdate}
            onChange={(v) => {
              setFindBirthdate(v);
              setFindStatus("idle");
            }}
          />
          <button
            onClick={handleFindProfile}
            disabled={!findName.trim() || !findBirthdate || findStatus === "searching"}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 12,
              padding: "11px 0",
              fontWeight: 800,
              fontSize: 14,
              color: "#fff",
              cursor: findName.trim() && findBirthdate ? "pointer" : "default",
              fontFamily: "inherit",
              background: findName.trim() && findBirthdate ? "#14588C" : "#c7d8e0",
            }}
          >
            {findStatus === "searching" ? "さがしています…" : "さがす"}
          </button>
          {findStatus === "notfound" && (
            <p style={{ color: "#E0526B", fontSize: 13, marginTop: 8, marginBottom: 0 }}>
              見つかりませんでした。なまえ・生年月日が正しいか確認してください。
            </p>
          )}
        </div>
      </div>

      {pendingProfile && (
        <FindProfilePinModal
          correctPin={pendingProfile.pin}
          onSuccess={() => {
            window.location.href = `${window.location.pathname}?profile=${pendingProfile.id}`;
          }}
          onCancel={() => setPendingProfile(null)}
        />
      )}
    </div>
  );
}
