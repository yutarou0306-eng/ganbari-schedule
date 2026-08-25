import React, { useEffect, useState } from "react";
import { getKnownSchedules, upsertKnownSchedule } from "./registry.js";
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

  function handleCreate() {
    const id = generateScheduleId();
    window.location.href = `${window.location.pathname}?id=${id}`;
  }

  function handleOpen(id) {
    window.location.href = `${window.location.pathname}?id=${id}`;
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
            fontSize: 26,
            textShadow: "0 2px 10px rgba(11,61,98,0.5)",
            margin: "0 0 4px",
          }}
        >
          🐚 がんばりスケジュール
        </h1>
        <p style={{ textAlign: "center", color: "#EAF7FB", fontSize: 12.5, marginBottom: 20 }}>
          作る・見る・ふりかえる、ぜんぶここから
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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
                padding: "10px 0",
                borderRadius: 999,
                border: "none",
                fontWeight: 900,
                fontSize: 13,
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
              padding: 24,
              textAlign: "center",
              boxShadow: "0 16px 34px rgba(11,61,98,0.3)",
            }}
          >
            <p style={{ color: "#4a6c85", fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
              新しいスケジュールを作ります。作ったあとに出てくる「共有リンク」を、いっしょに使うご家族に送ってください。
            </p>
            <button
              onClick={handleCreate}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 16,
                border: "none",
                background: "linear-gradient(135deg,#FFB6C9,#F4C95D)",
                color: "#fff",
                fontWeight: 900,
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "0 10px 20px rgba(255,143,163,0.4)",
                fontFamily: "inherit",
              }}
            >
              ＋ 新しいスケジュールを作る
            </button>
          </div>
        )}

        {tab === "active" && (
          <ScheduleList
            items={active}
            emptyText='まだ進行中のスケジュールはありません。「① 作る」から作ってみましょう。'
            onOpen={handleOpen}
            refreshing={refreshing}
          />
        )}

        {tab === "done" && (
          <ScheduleList
            items={done}
            emptyText="完了したスケジュールはまだありません。"
            onOpen={handleOpen}
            refreshing={refreshing}
          />
        )}

        <p style={{ textAlign: "center", color: "#EAF7FB", fontSize: 11, marginTop: 20, lineHeight: 1.7 }}>
          ※「見る」「完了」の一覧は、この端末で開いたことのあるスケジュールだけが表示されます。
          <br />
          共有リンクを開いたことがあるスケジュールは、ここにも自動で並びます。
        </p>
      </div>
    </div>
  );
}

function ScheduleList({ items, emptyText, onOpen, refreshing }) {
  if (items.length === 0) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.92)",
          borderRadius: 18,
          padding: 22,
          textAlign: "center",
          color: "#5a7d94",
          fontSize: 13,
          lineHeight: 1.7,
        }}
      >
        {emptyText}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {refreshing && (
        <div style={{ color: "#EAF7FB", fontSize: 11.5, textAlign: "center" }}>さいしんの状態を確認中…</div>
      )}
      {items.map((s) => (
        <button
          key={s.id}
          onClick={() => onOpen(s.id)}
          style={{
            textAlign: "left",
            background: "#fff",
            borderRadius: 16,
            padding: "14px 16px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 8px 18px rgba(11,61,98,0.25)",
            fontFamily: "inherit",
          }}
        >
          <div style={{ fontWeight: 900, color: "#0B3D62", fontSize: 15 }}>{s.title || "無題のスケジュール"}</div>
          <div style={{ fontSize: 12, color: "#7c98aa", marginTop: 2 }}>{formatRange(s.startDate, s.endDate)}</div>
          <div style={{ marginTop: 8, height: 8, borderRadius: 999, background: "#EAF7FB", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${s.pct || 0}%`,
                borderRadius: 999,
                background: "linear-gradient(90deg,#FFD6E0,#F4C95D)",
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: "#14588C", fontWeight: 700, marginTop: 4, textAlign: "right" }}>
            達成度 {s.pct || 0}%
          </div>
        </button>
      ))}
    </div>
  );
}
