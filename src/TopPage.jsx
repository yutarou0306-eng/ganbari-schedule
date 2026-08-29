import React, { useEffect, useState } from "react";
import { getKnownSchedules, upsertKnownSchedule, removeKnownSchedule } from "./registry.js";
import { generateScheduleId } from "./scheduleId.js";
import { supabase } from "./db.js";
import { computeOverallStats } from "./progress.js";

const oceanBg = "linear-gradient(180deg, #0B3D62 0%, #14588C 42%, #2E9BC7 78%, #6FCFEB 100%)";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title } | null
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [appCopied, setAppCopied] = useState(false);

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

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from("schedules").delete().eq("id", deleteTarget.id);
    } catch (e) {
      // even if the network call fails, still drop it from this device's local list
    }
    removeKnownSchedule(deleteTarget.id);
    setSchedules(getKnownSchedules());
    setDeleting(false);
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
        <p style={{ textAlign: "center", color: "#EAF7FB", fontSize: 15, marginBottom: 14 }}>
          作る・見る・振り返る、全部ここから
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              onClick={handleShareApp}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "inherit",
                background: "#5A4FCF",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
              }}
            >
              {appCopied ? "✅ コピーしました！" : "📤 アプリを共有（AirDropなど）"}
            </button>
          )}
          <button
            onClick={handleLineShareApp}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              background: "#06C755",
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
            }}
          >
            LINEでシェア
          </button>
          {!(typeof navigator !== "undefined" && navigator.share) && (
            <button
              onClick={handleShareApp}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "inherit",
                background: "#14588C",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
              }}
            >
              {appCopied ? "✅ コピーしました！" : "🔗 アプリのリンクをコピー"}
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
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
                padding: "12px 0",
                borderRadius: 999,
                border: "none",
                fontWeight: 900,
                fontSize: 16,
                cursor: "pointer",
                fontFamily: "inherit",
                background: tab === key ? "#fff" : "rgba(255,255,255,0.25)",
                color: tab === key ? "#14588C" : "#fff",
              }}
            >
              {label}
            </button>
          ))}
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

        {tab === "active" && (
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
              このスケジュールを削除しますか？
            </h3>
            <p style={{ fontSize: 15.5, color: "#4a6c85", lineHeight: 1.6, marginBottom: 20 }}>
              「{deleteTarget.title || "無題のスケジュール"}」を削除します。これまでの記録もすべて消え、元に戻せません。
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
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
                disabled={deleting}
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
                {deleting ? "削除中…" : "削除する"}
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
