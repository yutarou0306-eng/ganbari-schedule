import React, { useEffect, useState } from "react";
import { getKnownSchedules, upsertKnownSchedule, removeKnownSchedule } from "./registry.js";
import { generateScheduleId } from "./scheduleId.js";
import { generateProfileId } from "./profileId.js";
import { getKnownProfiles } from "./profileRegistry.js";
import { supabase } from "./db.js";
import { computeOverallStats } from "./progress.js";

const oceanBg = "linear-gradient(180deg, #0B3D62 0%, #14588C 42%, #2E9BC7 78%, #6FCFEB 100%)";

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

export default function TopPage() {
  const [tab, setTab] = useState("create"); // create | active | done
  const [schedules, setSchedules] = useState(getKnownSchedules());
  const [profiles, setProfiles] = useState(getKnownProfiles());
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title } | null
  const [copiedId, setCopiedId] = useState(null);
  const [appCopied, setAppCopied] = useState(false);
  const [findName, setFindName] = useState("");
  const [findBirthdate, setFindBirthdate] = useState("2015-01-01");
  const [findStatus, setFindStatus] = useState("idle"); // idle | searching | notfound
  const [findSchedName, setFindSchedName] = useState("");
  const [findSchedBirthdate, setFindSchedBirthdate] = useState("2015-01-01");
  const [findSchedStatus, setFindSchedStatus] = useState("idle"); // idle | searching | notfound | found
  const [foundSchedules, setFoundSchedules] = useState([]);

  // Refresh cached progress numbers from Supabase in one batched query.
  useEffect(() => {
    const ids = schedules.map((s) => s.id);
    if (ids.length === 0) return;
    setRefreshing(true);
    supabase
      .from("schedules")
      .select("id, blob")
      .in("id", ids)
      .then(({ data, error }) => {
        if (!error && data) {
          data.forEach((row) => {
            const cfg = row.blob && row.blob.config;
            if (!cfg) return;
            const stats = computeOverallStats(cfg, row.blob.completions);
            upsertKnownSchedule({
              id: row.id,
              title: cfg.title,
              startDate: cfg.startDate,
              endDate: cfg.endDate,
              pct: stats.pct,
            });
          });
          setSchedules(getKnownSchedules());
        }
        setRefreshing(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCreate(themeKey) {
    const id = generateScheduleId();
    window.location.href = `${window.location.pathname}?id=${id}&theme=${themeKey}`;
  }

  function handleOpen(id) {
    window.location.href = `${window.location.pathname}?id=${id}`;
  }

  function handleEdit(id) {
    window.location.href = `${window.location.pathname}?id=${id}&edit=1`;
  }

  async function handleShare(id, title) {
    const url = `${window.location.origin}${window.location.pathname}?id=${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "がんばりスケジュール", url });
      } catch (e) {
        // user cancelled the share sheet — nothing to do
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (e) {}
    }
  }

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
      window.location.href = `${window.location.pathname}?profile=${data[0].id}`;
    } catch (e) {
      setFindStatus("notfound");
    }
  }

  async function handleFindSchedules() {
    const name = findSchedName.trim();
    if (!name) return;
    setFindSchedStatus("searching");
    try {
      let profQuery = supabase.from("profiles").select("id, blob").eq("blob->>name", name);
      if (findSchedBirthdate) profQuery = profQuery.eq("blob->>birthdate", findSchedBirthdate);
      const { data: profData, error: profErr } = await profQuery;
      if (profErr || !profData || profData.length === 0) {
        setFindSchedStatus("notfound");
        setFoundSchedules([]);
        return;
      }
      const profileId = profData[0].id;
      const { data: schedData } = await supabase
        .from("schedules")
        .select("id, blob")
        .eq("blob->config->>profileId", profileId);
      const list = (schedData || [])
        .filter((row) => row.blob && row.blob.config)
        .map((row) => {
          const cfg = row.blob.config;
          const stats = computeOverallStats(cfg, row.blob.completions);
          return { id: row.id, title: cfg.title, startDate: cfg.startDate, endDate: cfg.endDate, pct: stats.pct };
        });
      if (list.length === 0) {
        setFindSchedStatus("notfound");
        setFoundSchedules([]);
        return;
      }
      list.forEach((item) => upsertKnownSchedule(item));
      setSchedules(getKnownSchedules());
      setFoundSchedules(list);
      setFindSchedStatus("found");
    } catch (e) {
      setFindSchedStatus("notfound");
      setFoundSchedules([]);
    }
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    // This only removes the schedule from this device's "見る"/"完了"
    // list — it does NOT delete the schedule itself. Actual deletion only
    // happens from the delete button inside the schedule itself.
    removeKnownSchedule(deleteTarget.id);
    setSchedules(getKnownSchedules());
    setDeleteTarget(null);
  }

  const today = todayStr();
  const active = schedules
    .filter((s) => !s.endDate || s.endDate >= today)
    .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
  const done = schedules
    .filter((s) => s.endDate && s.endDate < today)
    .sort((a, b) => (b.endDate || "").localeCompare(a.endDate || ""));

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
        <p style={{ textAlign: "center", color: "#EAF7FB", fontSize: 15, marginBottom: 22 }}>
          作る・見る・振り返る、全部ここから
          <a
            href={`${window.location.pathname}?guide=1`}
            style={{ color: "#FFE9A8", textDecoration: "underline", marginLeft: 4 }}
          >
            （使い方ガイド）
          </a>
        </p>

        <button
          onClick={handleCreateProfile}
          style={{
            display: "block",
            width: "100%",
            border: "none",
            borderRadius: 16,
            padding: "15px 0",
            marginBottom: profiles.length > 0 ? 10 : 20,
            fontWeight: 900,
            fontSize: 15.5,
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
            background: "rgba(11,61,98,0.35)",
            borderRadius: 20,
            padding: 10,
            marginBottom: 18,
          }}
        >
          <div style={{ color: "#EAF7FB", fontSize: 11.5, fontWeight: 700, marginBottom: 6, paddingLeft: 4 }}>
            メニュー
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              ["create", "① 作る"],
              ["active", "② 見る"],
              ["done", "③ 完了"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  borderRadius: 14,
                  border: "none",
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: tab === key ? "#fff" : "transparent",
                  color: tab === key ? "#14588C" : "#EAF7FB",
                  boxShadow: tab === key ? "0 4px 10px rgba(0,0,0,0.2)" : "none",
                  transition: "background 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "create" && (
          <div
            style={{
              background: "linear-gradient(180deg,#FFFBF3,#FFF7EC)",
              borderRadius: 22,
              padding: 26,
              textAlign: "center",
              boxShadow: "0 16px 34px rgba(11,61,98,0.3)",
            }}
          >
            <p style={{ color: "#4a6c85", fontSize: 15.5, marginBottom: 18, lineHeight: 1.7 }}>
              新しいスケジュールを作ります。作ったあとに出てくる「共有リンク」を、一緒に使うご家族に送ってください。
            </p>
            <button
              onClick={() => handleCreate("girl")}
              style={{
                width: "100%",
                padding: "16px 0",
                borderRadius: 16,
                border: "none",
                background: "linear-gradient(135deg,#FFB6C9,#F4C95D)",
                color: "#fff",
                fontWeight: 900,
                fontSize: 17,
                cursor: "pointer",
                boxShadow: "0 10px 20px rgba(255,143,163,0.4)",
                fontFamily: "inherit",
                marginBottom: 12,
              }}
            >
              🎀 新しいスケジュールを作る（女の子用）
            </button>
            <button
              onClick={() => handleCreate("boy")}
              style={{
                width: "100%",
                padding: "16px 0",
                borderRadius: 16,
                border: "none",
                background: "linear-gradient(135deg,#8B5E34,#C89B3C)",
                color: "#fff",
                fontWeight: 900,
                fontSize: 17,
                cursor: "pointer",
                boxShadow: "0 10px 20px rgba(139,94,52,0.4)",
                fontFamily: "inherit",
              }}
            >
              🐉 新しいスケジュールを作る（男の子用）
            </button>
          </div>
        )}

        {tab === "create" && (
          <div
            style={{
              background: "rgba(255,255,255,0.9)",
              borderRadius: 16,
              padding: 16,
              marginTop: 16,
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
              disabled={!findName.trim() || findStatus === "searching"}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 12,
                padding: "11px 0",
                fontWeight: 800,
                fontSize: 14,
                color: "#fff",
                cursor: findName.trim() ? "pointer" : "default",
                fontFamily: "inherit",
                background: findName.trim() ? "#14588C" : "#c7d8e0",
              }}
            >
              {findStatus === "searching" ? "さがしています…" : "さがす"}
            </button>
            {findStatus === "notfound" && (
              <p style={{ color: "#E0526B", fontSize: 13, marginTop: 8, marginBottom: 0 }}>
                見つかりませんでした。なまえ・生年月日が正しいか確認してください。
              </p>
            )}
            <p style={{ color: "#7c98aa", fontSize: 11.5, marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
              ※ かんたんな確認のためのものなので、パスワードのような強いセキュリティではありません。
            </p>
          </div>
        )}

        {tab === "active" && (
          <>
            <ScheduleList
              items={active}
              emptyText='まだ進行中のスケジュールはありません。「① 作る」から作ってみましょう。'
              onOpen={handleOpen}
              onEdit={handleEdit}
              onDelete={(s) => setDeleteTarget(s)}
              onShare={handleShare}
              copiedId={copiedId}
              refreshing={refreshing}
            />

            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 16, marginTop: 16 }}>
              <div style={{ fontWeight: 900, color: "#0B3D62", fontSize: 14, marginBottom: 10 }}>🔍 スケジュールをさがす</div>
              <input
                value={findSchedName}
                onChange={(e) => {
                  setFindSchedName(e.target.value);
                  setFindSchedStatus("idle");
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
                value={findSchedBirthdate}
                onChange={(v) => {
                  setFindSchedBirthdate(v);
                  setFindSchedStatus("idle");
                }}
              />
              <button
                onClick={handleFindSchedules}
                disabled={!findSchedName.trim() || findSchedStatus === "searching"}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 12,
                  padding: "11px 0",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#fff",
                  cursor: findSchedName.trim() ? "pointer" : "default",
                  fontFamily: "inherit",
                  background: findSchedName.trim() ? "#14588C" : "#c7d8e0",
                }}
              >
                {findSchedStatus === "searching" ? "さがしています…" : "さがす"}
              </button>
              {findSchedStatus === "notfound" && (
                <p style={{ color: "#E0526B", fontSize: 13, marginTop: 8, marginBottom: 0 }}>
                  見つかりませんでした。なまえ・生年月日が正しいか、スタンプ帳にスケジュールが紐づいているか確認してください。
                </p>
              )}
              {findSchedStatus === "found" && (
                <p style={{ color: "#3F8A5C", fontSize: 13, marginTop: 8, marginBottom: 0, fontWeight: 700 }}>
                  見つかりました！上の一覧に追加されました。
                </p>
              )}
              <p style={{ color: "#7c98aa", fontSize: 11.5, marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
                ※「🌟 スタンプ帳」から作った・紐づけたスケジュールのみ見つかります。
              </p>
            </div>
          </>
        )}

        {tab === "done" && (
          <ScheduleList
            items={done}
            emptyText="完了したスケジュールはまだありません。"
            onOpen={handleOpen}
            onEdit={handleEdit}
            onDelete={(s) => setDeleteTarget(s)}
            onShare={handleShare}
            copiedId={copiedId}
            refreshing={refreshing}
          />
        )}

        <p style={{ textAlign: "center", color: "#EAF7FB", fontSize: 13, marginTop: 22, lineHeight: 1.7 }}>
          ※「見る」「完了」の一覧は、この端末で開いたことのあるスケジュールだけが表示されます。
          <br />
          共有リンクを開いたことがあるスケジュールは、ここにも自動で並びます。
        </p>
      </div>

      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,61,98,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 26,
              maxWidth: 340,
              width: "100%",
              textAlign: "center",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 20, color: "#0B3D62", fontFamily: "inherit" }}>
              この一覧から削除しますか？
            </h3>
            <p style={{ fontSize: 15.5, color: "#4a6c85", lineHeight: 1.6, marginBottom: 20 }}>
              「{deleteTarget.title || "無題のスケジュール"}」をこの端末の「見る」「完了」の一覧から消します。スケジュール自体や記録は消えません。もう一度リンクを開けば元通り一覧に出てきます。
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "2px solid #d7ecf3",
                  background: "#fff",
                  color: "#5a7d94",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 16,
                }}
              >
                やめる
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  background: "#E0526B",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 16,
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleList({ items, emptyText, onOpen, onEdit, onDelete, onShare, copiedId, refreshing }) {
  if (items.length === 0) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.92)",
          borderRadius: 18,
          padding: 24,
          textAlign: "center",
          color: "#5a7d94",
          fontSize: 15,
          lineHeight: 1.7,
        }}
      >
        {emptyText}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {refreshing && (
        <div style={{ color: "#EAF7FB", fontSize: 13, textAlign: "center" }}>さいしんの状態を確認中…</div>
      )}
      {items.map((s) => (
        <div
          key={s.id}
          style={{
            position: "relative",
            background: "#fff",
            borderRadius: 16,
            padding: "16px 18px",
            boxShadow: "0 8px 18px rgba(11,61,98,0.25)",
          }}
        >
          {/* share / edit / delete — top-right corner */}
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6, zIndex: 2 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(s.id, s.title);
              }}
              aria-label="共有する"
              title="共有する"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "2px solid #BFE3F0",
                background: copiedId === s.id ? "#DCEEF7" : "#fff",
                color: "#14588C",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {copiedId === s.id ? "✅" : "📤"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(s.id);
              }}
              aria-label="修正する"
              title="修正する"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "2px solid #BFE3F0",
                background: "#fff",
                color: "#14588C",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✏️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s);
              }}
              aria-label="削除する"
              title="削除する"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "2px solid #FBD4DB",
                background: "#fff",
                color: "#E0526B",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              🗑
            </button>
          </div>

          <button
            onClick={() => onOpen(s.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              padding: 0,
              paddingRight: 148,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <div style={{ fontWeight: 900, color: "#0B3D62", fontSize: 19, lineHeight: 1.3 }}>
              {s.title || "無題のスケジュール"}
            </div>
            <div style={{ fontSize: 14, color: "#7c98aa", marginTop: 4 }}>{formatRange(s.startDate, s.endDate)}</div>
            <div style={{ marginTop: 10, height: 10, borderRadius: 999, background: "#EAF7FB", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${s.pct || 0}%`,
                  borderRadius: 999,
                  background: "linear-gradient(90deg,#FFD6E0,#F4C95D)",
                }}
              />
            </div>
            <div style={{ fontSize: 13, color: "#14588C", fontWeight: 700, marginTop: 6, textAlign: "right" }}>
              達成度 {s.pct || 0}%
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
