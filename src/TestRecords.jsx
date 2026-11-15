import React, { useEffect, useMemo, useRef, useState } from "react";

// ─────────────────────────────────────────────
// 📈 テストの記録（スタンプ帳ごと）
// ・テストのたびに、科目ごとの点数・満点・偏差値、合計点・総合偏差値を入れる
// ・「前回のテストから今回まで」の勉強時間（スケジュールの記録）を棒、偏差値を線で重ねる
// ・科目とスケジュールの「やること」をつなぐと、科目ごとの勉強時間と偏差値も比べられる
// 入力・修正・削除・つなぐ設定は保護者のみ（askParent で暗証番号）
// ─────────────────────────────────────────────

const bg = "linear-gradient(180deg, #0B3D62 0%, #14588C 42%, #2E9BC7 78%, #6FCFEB 100%)";
const INK = "#0B3D62";
const SUB = "#7c98aa";
const BAR = "#9FD3EC";
const LINE = "#E0763A";
const UP = "#2E8B57";
const DOWN = "#D0642C";
const SUBJECT_COLORS = ["#E0763A", "#3A86C8", "#2E8B57", "#B05FC9", "#D4A21A", "#D14A6E", "#4A9FA5", "#7A6A58"];
const DEFAULT_SUBJECTS = [
  { name: "国語", max: 100 },
  { name: "算数", max: 100 },
  { name: "理科", max: 100 },
  { name: "社会", max: 100 },
];
const FIRST_WINDOW_DAYS = 30; // 最初のテストは「その前の30日間」の勉強時間を数える

function num(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function md(dateKey) {
  const [, m, d] = (dateKey || "").split("-").map(Number);
  return m && d ? `${m}/${d}` : "";
}
function addDays(dateKey, n) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function hoursText(min) {
  const m = Math.round(min || 0);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}分`;
  return r === 0 ? `${h}時間` : `${h}時間${r}分`;
}
function fmtDev(v) {
  return v === null || v === undefined ? "—" : Number(v).toFixed(1);
}
function genId() {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// スケジュールの記録から「日付・やること名・分」の一覧を作る（ProfileRoot から呼ぶ）
// ・メモで調整した時間（achievements.minutes）があればそれを使う
// ・時間の記録がない本スタンプは、そのやることの目標時間を数える
// ・お休みスタンプの日は数えない
export function studyLogInBlob(blob) {
  const out = [];
  if (!blob || !blob.config || blob.config.theme === "diet") return out;
  const subjects = blob.config.subjects || [];
  const comps = blob.completions || {};
  const achv = blob.achievements || {};
  const excused = blob.excused || {};
  const days = new Set([...Object.keys(comps), ...Object.keys(achv)]);
  days.forEach((d) => {
    subjects.forEach((s) => {
      if (excused[d] && excused[d][s.id]) return;
      const a = achv[d] && achv[d][s.id];
      let min = a && Number(a.minutes) > 0 ? Number(a.minutes) : 0;
      if (!min && comps[d] && (comps[d][s.id] || 0) >= 1 && s.measureTime !== false) {
        min = Number(s.targetMinutes || s.durationMinutes || 0);
      }
      if (min > 0) out.push([d, (s.name || "").trim(), min]);
    });
  });
  return out;
}

// テストごとに「前回のテストの翌日〜今回のテストの日」の勉強時間を足す
function studyBetween(log, from, to, names) {
  let sum = 0;
  log.forEach(([d, n, m]) => {
    if (d >= from && d <= to && (!names || names.includes(n))) sum += m;
  });
  return sum;
}

// ── 幅に合わせて描くための小さなフック
function useWidth(min = 260) {
  const ref = useRef(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(Math.max(min, Math.round(el.clientWidth)));
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, w];
}

function devRange(values) {
  const v = values.filter((x) => x !== null && x !== undefined);
  if (!v.length) return [40, 60];
  let lo = Math.floor((Math.min(...v) - 3) / 5) * 5;
  let hi = Math.ceil((Math.max(...v) + 3) / 5) * 5;
  if (hi - lo < 10) {
    const mid = (hi + lo) / 2;
    lo = Math.floor((mid - 5) / 5) * 5;
    hi = lo + 10;
  }
  return [lo, hi];
}

// ── グラフ①：棒（勉強時間）＋ 線（偏差値）
function ComboChart({ points }) {
  const [ref, W] = useWidth();
  const H = 220, L = 36, R = 36, T = 22, B = 34;
  const n = points.length;
  const slot = (W - L - R) / Math.max(1, n);
  const xOf = (i) => L + slot * (i + 0.5);
  const maxBar = Math.max(60, ...points.map((p) => p.bar || 0));
  const barMaxH = Math.ceil(maxBar / 60) * 60; // 1時間きざみで切り上げ
  const yBar = (m) => T + (H - T - B) * (1 - m / barMaxH);
  const [lo, hi] = devRange(points.map((p) => p.line));
  const yDev = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const bw = Math.min(38, slot * 0.55);
  const linePts = points.map((p, i) => (p.line === null ? null : [xOf(i), yDev(p.line)])).filter(Boolean);
  const devTicks = [lo, (lo + hi) / 2, hi];
  const hTicks = [0, barMaxH / 2, barMaxH];
  // 日付ラベルが重なるときは間引く
  const every = slot < 34 ? Math.ceil(34 / slot) : 1;
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: H }}>
        {devTicks.map((t) => (
          <g key={`d${t}`}>
            <line x1={L} x2={W - R} y1={yDev(t)} y2={yDev(t)} stroke="#E6EEF3" strokeDasharray="3 4" />
            <text x={W - R + 4} y={yDev(t) + 4} fontSize="10.5" fill={LINE}>{Number.isInteger(t) ? t : t.toFixed(1)}</text>
          </g>
        ))}
        {hTicks.map((t) => (
          <text key={`h${t}`} x={L - 4} y={yBar(t) + 4} fontSize="10.5" textAnchor="end" fill="#5a9cc0">{Number.isInteger(t / 60) ? t / 60 : (t / 60).toFixed(1)}h</text>
        ))}
        {points.map((p, i) => (
          <g key={`b${i}`}>
            <rect x={xOf(i) - bw / 2} y={yBar(p.bar || 0)} width={bw} height={Math.max(0, H - B - yBar(p.bar || 0))} rx="4" fill={BAR} />
            {i % every === 0 || i === n - 1 ? (
              <text x={xOf(i)} y={H - B + 14} fontSize="10.5" textAnchor="middle" fill={SUB}>{p.label}</text>
            ) : null}
          </g>
        ))}
        {linePts.length >= 2 && <polyline points={linePts.map((q) => q.join(",")).join(" ")} fill="none" stroke={LINE} strokeWidth="2.5" strokeLinejoin="round" />}
        {points.map((p, i) =>
          p.line === null ? null : (
            <g key={`p${i}`}>
              <circle cx={xOf(i)} cy={yDev(p.line)} r="4.5" fill="#fff" stroke={LINE} strokeWidth="2.5" />
              <text x={xOf(i)} y={yDev(p.line) - 9} fontSize="11" fontWeight="800" textAnchor="middle" fill={LINE}>{fmtDev(p.line)}</text>
            </g>
          )
        )}
        <text x={L} y={12} fontSize="10.5" fill="#5a9cc0">■ 勉強時間</text>
        <text x={W - R + 30} y={12} fontSize="10.5" textAnchor="end" fill={LINE}>● 偏差値</text>
      </svg>
    </div>
  );
}

// ── グラフ②：科目ごとの偏差値（折れ線を重ねる）
function MultiLineChart({ labels, series }) {
  const [ref, W] = useWidth();
  const H = 200, L = 32, R = 14, T = 12, B = 30;
  const n = labels.length;
  const slot = (W - L - R) / Math.max(1, n);
  const xOf = (i) => L + slot * (i + 0.5);
  const [lo, hi] = devRange(series.flatMap((s) => s.values));
  const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const ticks = [lo, (lo + hi) / 2, hi];
  const every = slot < 34 ? Math.ceil(34 / slot) : 1;
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: H }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#E6EEF3" strokeDasharray="3 4" />
            <text x={L - 4} y={y(t) + 4} fontSize="10.5" textAnchor="end" fill={SUB}>{Number.isInteger(t) ? t : t.toFixed(1)}</text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % every === 0 || i === n - 1 ? (
            <text key={i} x={xOf(i)} y={H - B + 16} fontSize="10.5" textAnchor="middle" fill={SUB}>{l}</text>
          ) : null
        )}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === null ? null : [xOf(i), y(v)])).filter(Boolean);
          return (
            <g key={s.name}>
              {pts.length >= 2 && <polyline points={pts.map((q) => q.join(",")).join(" ")} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" />}
              {pts.map(([px, py], k) => (
                <circle key={k} cx={px} cy={py} r="3.6" fill="#fff" stroke={s.color} strokeWidth="2.2" />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const card = { background: "#fff", borderRadius: 18, padding: "14px 14px", boxShadow: "0 10px 24px rgba(11,61,98,0.18)", marginBottom: 14, boxSizing: "border-box" };
const chip = (on, color) => ({
  border: "none",
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
  background: on ? color || "#14588C" : "#EAF4F9",
  color: on ? "#fff" : "#14588C",
});
const btn = (bgc, fg = "#fff") => ({ border: "none", borderRadius: 12, padding: "11px 14px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", background: bgc, color: fg });
const inputStyle = { width: "100%", boxSizing: "border-box", border: "1.5px solid #D6E6EE", borderRadius: 10, padding: "8px 8px", fontSize: 15, fontFamily: "inherit", color: INK, background: "#fff" };

function Delta({ now, prev, digits = 1, unit = "" }) {
  if (now === null || prev === null || now === undefined || prev === undefined) return null;
  const d = now - prev;
  if (Math.abs(d) < 1e-9) return <span style={{ fontSize: 11.5, color: SUB, marginLeft: 4 }}>±0</span>;
  return (
    <span style={{ fontSize: 11.5, fontWeight: 800, color: d > 0 ? UP : DOWN, marginLeft: 4 }}>
      {d > 0 ? "▲" : "▼"}
      {Math.abs(d).toFixed(digits)}
      {unit}
    </span>
  );
}

export default function TestRecordsPage({ profile, studyLog, doNames, askParent, onSave, onClose }) {
  const tests = useMemo(() => [...(profile.tests || [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)), [profile.tests]);
  const links = profile.testLinks || {};
  const [focus, setFocus] = useState("__total"); // グラフ①で見る科目（"__total" = 総合）
  const [hidden, setHidden] = useState({}); // グラフ②で非表示にした科目
  const [openId, setOpenId] = useState(null); // 一覧で開いているテスト
  const [editing, setEditing] = useState(null); // 入力中のテスト（新規は id なし）
  const [linking, setLinking] = useState(false);

  // これまでに出てきた科目（入力順を保つ）
  const subjectNames = useMemo(() => {
    const seen = [];
    tests.forEach((t) => (t.subjects || []).forEach((s) => s.name && !seen.includes(s.name) && seen.push(s.name)));
    return seen;
  }, [tests]);
  const colorOf = (name) => SUBJECT_COLORS[Math.max(0, subjectNames.indexOf(name)) % SUBJECT_COLORS.length];

  // テストごとの勉強時間（期間）
  const windows = tests.map((t, i) => ({ from: i === 0 ? addDays(t.date, -FIRST_WINDOW_DAYS + 1) : addDays(tests[i - 1].date, 1), to: t.date }));
  const subjOf = (t, name) => (t.subjects || []).find((s) => s.name === name) || null;

  const focusLinked = focus === "__total" ? null : links[focus] || [];
  const comboPoints = tests.map((t, i) => {
    const w = windows[i];
    const bar = focus === "__total" ? studyBetween(studyLog, w.from, w.to, null) : focusLinked.length ? studyBetween(studyLog, w.from, w.to, focusLinked) : 0;
    const line = focus === "__total" ? num(t.totalDev) : num((subjOf(t, focus) || {}).dev);
    return { label: md(t.date), bar, line };
  });

  // いちばん新しいテストと、その前のテストの比較（ひとこと）
  let summary = null;
  if (comboPoints.length >= 2) {
    const a = comboPoints[comboPoints.length - 2];
    const b = comboPoints[comboPoints.length - 1];
    const dBar = b.bar - a.bar;
    const dLine = a.line !== null && b.line !== null ? b.line - a.line : null;
    summary = (
      <div style={{ fontSize: 13, color: INK, background: "#F5F9FB", borderRadius: 10, padding: "8px 10px", marginTop: 8, lineHeight: 1.7 }}>
        前回とくらべて：勉強時間{" "}
        <b style={{ color: dBar >= 0 ? UP : DOWN }}>
          {dBar >= 0 ? "+" : "−"}
          {hoursText(Math.abs(dBar))}
        </b>
        {dLine !== null && (
          <>
            <span style={{ marginLeft: 12 }}>偏差値</span>{" "}
            <b style={{ color: dLine >= 0 ? UP : DOWN }}>
              {dLine >= 0 ? "+" : "−"}
              {Math.abs(dLine).toFixed(1)}
            </b>
          </>
        )}
      </div>
    );
  }

  function startNew() {
    askParent("テストの結果を入力する", () => {
      const last = tests[tests.length - 1];
      const base = last && last.subjects && last.subjects.length ? last.subjects.map((s) => ({ name: s.name, max: s.max ?? "" })) : DEFAULT_SUBJECTS;
      setEditing({ date: todayKey(), name: "", subjects: base.map((s) => ({ name: s.name, score: "", max: s.max === null || s.max === undefined ? "" : String(s.max), dev: "" })), total: "", totalMax: "", totalDev: "" });
    });
  }
  function startEdit(t) {
    askParent("テストの結果を修正する", () => {
      setEditing({
        ...t,
        subjects: (t.subjects || []).map((s) => ({ name: s.name, score: s.score ?? "", max: s.max ?? "", dev: s.dev ?? "" })),
        total: t.total ?? "",
        totalMax: t.totalMax ?? "",
        totalDev: t.totalDev ?? "",
      });
    });
  }
  function remove(t) {
    askParent(`「${t.name || md(t.date)}」の記録を削除する`, () => onSave({ tests: (profile.tests || []).filter((x) => x.id !== t.id), testLinks: links }));
  }
  function openLinks() {
    askParent("科目とやることをつなぐ", () => setLinking(true));
  }

  const listDesc = [...tests].reverse();

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "20px 12px 60px", fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap');`}</style>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#EAF7FB", fontWeight: 800, cursor: "pointer", fontSize: 15, fontFamily: "inherit", padding: 0, marginBottom: 8 }}>
          ← もどる
        </button>
        <h2 style={{ margin: "0 0 12px", color: "#fff", fontSize: 22 }}>📈 テストの記録</h2>

        <button onClick={startNew} style={{ ...btn("linear-gradient(135deg,#F6B94A,#E0763A)"), width: "100%", fontSize: 15.5, padding: "13px 0", marginBottom: 14, boxShadow: "0 8px 18px rgba(0,0,0,0.2)" }}>
          ＋ テストの結果を入力する（保護者のみ）
        </button>

        {tests.length === 0 ? (
          <div style={{ ...card, color: SUB, fontSize: 14, lineHeight: 1.7 }}>
            まだテストの記録がありません。テストが返ってきたら「＋ テストの結果を入力する」から、点数と偏差値を入れてください。
            <br />
            テストの間にスケジュールで勉強した時間と、偏差値の動きを並べてグラフにします。
          </div>
        ) : (
          <>
            {/* グラフ① がんばりと偏差値 */}
            <div style={card}>
              <div style={{ fontWeight: 900, color: INK, fontSize: 15.5, marginBottom: 8 }}>💪 がんばり（勉強時間）と偏差値</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                <button onClick={() => setFocus("__total")} style={chip(focus === "__total")}>総合</button>
                {subjectNames.map((n) => (
                  <button key={n} onClick={() => setFocus(n)} style={chip(focus === n, colorOf(n))}>
                    {n}
                  </button>
                ))}
              </div>
              {focus !== "__total" && focusLinked.length === 0 ? (
                <div style={{ fontSize: 12.5, color: DOWN, marginBottom: 6 }}>
                  「{focus}」につながったやることがないので、勉強時間は0になります。下の「🔗 科目とやることをつなぐ」から設定してください。
                </div>
              ) : focus !== "__total" ? (
                <div style={{ fontSize: 12, color: SUB, marginBottom: 6 }}>勉強時間に数えるやること：{focusLinked.join("・")}</div>
              ) : (
                <div style={{ fontSize: 12, color: SUB, marginBottom: 6 }}>棒は「前回のテストの翌日〜その日」に、すべてのスケジュールで勉強した時間です。</div>
              )}
              <ComboChart points={comboPoints} />
              {summary}
            </div>

            {/* グラフ② 科目ごとの偏差値 */}
            {subjectNames.length > 0 && (
              <div style={card}>
                <div style={{ fontWeight: 900, color: INK, fontSize: 15.5, marginBottom: 8 }}>📊 科目ごとの偏差値</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  {subjectNames.map((n) => (
                    <button key={n} onClick={() => setHidden((h) => ({ ...h, [n]: !h[n] }))} style={{ ...chip(!hidden[n], colorOf(n)), opacity: hidden[n] ? 0.6 : 1 }}>
                      {n}
                    </button>
                  ))}
                </div>
                <MultiLineChart
                  labels={tests.map((t) => md(t.date))}
                  series={subjectNames.filter((n) => !hidden[n]).map((n) => ({ name: n, color: colorOf(n), values: tests.map((t) => num((subjOf(t, n) || {}).dev)) }))}
                />
              </div>
            )}

            {/* 一覧 */}
            <div style={card}>
              <div style={{ fontWeight: 900, color: INK, fontSize: 15.5, marginBottom: 8 }}>🗂 これまでのテスト</div>
              {listDesc.map((t) => {
                const idx = tests.findIndex((x) => x.id === t.id);
                const prev = idx > 0 ? tests[idx - 1] : null;
                const open = openId === t.id;
                const w = windows[idx];
                return (
                  <div key={t.id} style={{ borderTop: "1px solid #EEF3F6", padding: "10px 2px" }}>
                    <div onClick={() => setOpenId(open ? null : t.id)} style={{ cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <div style={{ fontWeight: 800, color: INK, fontSize: 14.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.name || "テスト"} <span style={{ fontSize: 12, color: SUB, fontWeight: 700 }}>{t.date.replace(/-/g, "/")}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#8aa1b0", whiteSpace: "nowrap" }}>{open ? "▾ とじる" : "▸ くわしく"}</span>
                      </div>
                      <div style={{ fontSize: 13.5, color: INK, marginTop: 3 }}>
                        合計 <b>{t.total ?? "—"}</b>
                        {t.totalMax ? <span style={{ color: SUB }}> / {t.totalMax}</span> : null}
                        <Delta now={num(t.total)} prev={prev ? num(prev.total) : null} digits={0} unit="点" />
                        <span style={{ marginLeft: 12 }}>総合偏差値</span> <b>{fmtDev(num(t.totalDev))}</b>
                        <Delta now={num(t.totalDev)} prev={prev ? num(prev.totalDev) : null} />
                      </div>
                    </div>
                    {open && (
                      <div style={{ marginTop: 8, background: "#F7FAFC", borderRadius: 10, padding: "8px 10px" }}>
                        <div style={{ fontSize: 12, color: SUB, marginBottom: 6 }}>
                          この回までの勉強時間：<b style={{ color: INK }}>{hoursText(studyBetween(studyLog, w.from, w.to, null))}</b>（{md(w.from)}〜{md(w.to)}）
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ color: SUB, fontSize: 11.5 }}>
                              <th style={{ textAlign: "left", fontWeight: 700, padding: "2px 0" }}>科目</th>
                              <th style={{ textAlign: "right", fontWeight: 700 }}>点数</th>
                              <th style={{ textAlign: "right", fontWeight: 700 }}>偏差値</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(t.subjects || []).map((s) => {
                              const ps = prev ? subjOf(prev, s.name) : null;
                              return (
                                <tr key={s.name} style={{ borderTop: "1px solid #EAF0F4" }}>
                                  <td style={{ padding: "5px 0", fontWeight: 800, color: colorOf(s.name) }}>{s.name}</td>
                                  <td style={{ textAlign: "right", color: INK }}>
                                    {s.score ?? "—"}
                                    {s.max ? <span style={{ color: SUB }}>/{s.max}</span> : null}
                                    <Delta now={num(s.score)} prev={ps ? num(ps.score) : null} digits={0} />
                                  </td>
                                  <td style={{ textAlign: "right", color: INK, fontWeight: 800 }}>
                                    {fmtDev(num(s.dev))}
                                    <Delta now={num(s.dev)} prev={ps ? num(ps.dev) : null} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button onClick={() => startEdit(t)} style={{ ...btn("#EAF4F9", "#14588C"), flex: 1, padding: "8px 0", fontSize: 13 }}>✏️ 修正する</button>
                          <button onClick={() => remove(t)} style={{ ...btn("#FDECEC", "#B4432F"), flex: 1, padding: "8px 0", fontSize: 13 }}>🗑 削除する</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* 科目とやることをつなぐ */}
        <div style={card}>
          <div style={{ fontWeight: 900, color: INK, fontSize: 15.5, marginBottom: 6 }}>🔗 科目とやることのつながり</div>
          {subjectNames.length === 0 ? (
            <div style={{ fontSize: 13, color: SUB }}>テストを1回入力すると、科目ごとにスケジュールのやることをつなげられます。</div>
          ) : (
            <>
              {subjectNames.map((n) => (
                <div key={n} style={{ fontSize: 13, color: INK, padding: "3px 0" }}>
                  <b style={{ color: colorOf(n) }}>{n}</b>：{(links[n] || []).length ? links[n].join("・") : <span style={{ color: SUB }}>まだつないでいません</span>}
                </div>
              ))}
              <button onClick={openLinks} style={{ ...btn("#EAF4F9", "#14588C"), width: "100%", marginTop: 8, fontSize: 13.5 }}>
                🔗 科目とやることをつなぐ（保護者のみ）
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <TestForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSubmit={async (t) => {
            const list = profile.tests || [];
            const next = t.id ? list.map((x) => (x.id === t.id ? t : x)) : [...list, { ...t, id: genId() }];
            await onSave({ tests: next, testLinks: links });
            setEditing(null);
          }}
        />
      )}
      {linking && (
        <LinkEditor
          subjectNames={subjectNames}
          doNames={doNames}
          initial={links}
          colorOf={colorOf}
          onCancel={() => setLinking(false)}
          onSubmit={async (next) => {
            await onSave({ tests: profile.tests || [], testLinks: next });
            setLinking(false);
          }}
        />
      )}
    </div>
  );
}

const overlay = { position: "fixed", inset: 0, background: "rgba(11,61,98,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1500, padding: "24px 12px", overflowY: "auto" };
const sheet = { background: "#fff", borderRadius: 20, padding: 18, maxWidth: 460, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 12.5, fontWeight: 800, color: "#4a6c85", marginBottom: 4 };

// ── テストの入力フォーム
function TestForm({ initial, onSubmit, onCancel }) {
  const [t, setT] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setT((p) => ({ ...p, [k]: v }));
  const setSub = (i, k, v) => setT((p) => ({ ...p, subjects: p.subjects.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const addSub = () => setT((p) => ({ ...p, subjects: [...p.subjects, { name: "", score: "", max: "", dev: "" }] }));
  const delSub = (i) => setT((p) => ({ ...p, subjects: p.subjects.filter((_, j) => j !== i) }));

  // 合計点・満点の合計は、空欄なら科目の合計を自動で使う
  const autoTotal = t.subjects.reduce((a, s) => a + (num(s.score) || 0), 0);
  const autoMax = t.subjects.reduce((a, s) => a + (num(s.max) || 0), 0);
  const anyScore = t.subjects.some((s) => num(s.score) !== null);

  async function submit() {
    const subjects = t.subjects
      .filter((s) => (s.name || "").trim())
      .map((s) => ({ name: s.name.trim(), score: num(s.score), max: num(s.max), dev: num(s.dev) }));
    if (!t.date) return setErr("テストの日付を入れてください");
    if (!subjects.length) return setErr("科目を1つ以上入れてください");
    const names = subjects.map((s) => s.name);
    if (new Set(names).size !== names.length) return setErr("同じ名前の科目があります");
    setSaving(true);
    try {
      await onSubmit({
        ...(t.id ? { id: t.id } : {}),
        date: t.date,
        name: (t.name || "").trim(),
        subjects,
        total: num(t.total) ?? (anyScore ? autoTotal : null),
        totalMax: num(t.totalMax) ?? (autoMax > 0 ? autoMax : null),
        totalDev: num(t.totalDev),
      });
    } catch (e) {
      setErr("保存できませんでした。もう一度お試しください");
      setSaving(false);
    }
  }

  const cellInput = { ...inputStyle, padding: "7px 4px", textAlign: "right", fontSize: 14 };
  return (
    <div style={overlay}>
      <div style={sheet}>
        <h3 style={{ margin: "0 0 12px", color: INK, fontSize: 19 }}>{t.id ? "✏️ テストの結果を修正" : "📝 テストの結果を入力"}</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={label}>日付</div>
            <input type="date" value={t.date} onChange={(e) => set("date", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1.3 }}>
            <div style={label}>テスト名</div>
            <input value={t.name} onChange={(e) => set("name", e.target.value)} placeholder="例：11月 公開テスト" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 24px", gap: 5, alignItems: "center", fontSize: 11.5, color: SUB, fontWeight: 800, marginBottom: 4 }}>
          <span>科目</span>
          <span style={{ textAlign: "right" }}>点数</span>
          <span style={{ textAlign: "right" }}>満点</span>
          <span style={{ textAlign: "right" }}>偏差値</span>
          <span />
        </div>
        {t.subjects.map((s, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 24px", gap: 5, alignItems: "center", marginBottom: 6 }}>
            <input value={s.name} onChange={(e) => setSub(i, "name", e.target.value)} placeholder="科目" style={{ ...inputStyle, padding: "7px 6px", fontSize: 14 }} />
            <input value={s.score} onChange={(e) => setSub(i, "score", e.target.value)} inputMode="decimal" placeholder="85" style={cellInput} />
            <input value={s.max} onChange={(e) => setSub(i, "max", e.target.value)} inputMode="decimal" placeholder="100" style={cellInput} />
            <input value={s.dev} onChange={(e) => setSub(i, "dev", e.target.value)} inputMode="decimal" placeholder="55.0" style={cellInput} />
            <button onClick={() => delSub(i)} aria-label="この科目を消す" style={{ border: "none", background: "none", color: "#b9c7cf", fontSize: 18, cursor: "pointer", padding: 0 }}>
              ✕
            </button>
          </div>
        ))}
        <button onClick={addSub} style={{ ...btn("#EAF4F9", "#14588C"), width: "100%", padding: "7px 0", fontSize: 13, marginBottom: 12 }}>＋ 科目を追加</button>

        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={label}>合計点</div>
            <input value={t.total} onChange={(e) => set("total", e.target.value)} inputMode="decimal" placeholder={anyScore ? String(autoTotal) : "自動"} style={{ ...inputStyle, textAlign: "right" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>満点の合計</div>
            <input value={t.totalMax} onChange={(e) => set("totalMax", e.target.value)} inputMode="decimal" placeholder={autoMax > 0 ? String(autoMax) : "自動"} style={{ ...inputStyle, textAlign: "right" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>総合偏差値</div>
            <input value={t.totalDev} onChange={(e) => set("totalDev", e.target.value)} inputMode="decimal" placeholder="55.0" style={{ ...inputStyle, textAlign: "right" }} />
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: SUB, marginBottom: 12 }}>合計点と満点の合計は、空欄なら科目の合計を自動で入れます。</div>

        {err && <div style={{ color: DOWN, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ ...btn("#EEF3F6", "#4a6c85"), flex: 1 }}>キャンセル</button>
          <button onClick={submit} disabled={saving} style={{ ...btn("#14588C"), flex: 1.4, opacity: saving ? 0.6 : 1 }}>{saving ? "保存中…" : "保存する"}</button>
        </div>
      </div>
    </div>
  );
}

// ── 科目とやることをつなぐ
function LinkEditor({ subjectNames, doNames, initial, colorOf, onSubmit, onCancel }) {
  const [map, setMap] = useState(() => {
    const m = {};
    subjectNames.forEach((n) => (m[n] = [...(initial[n] || [])]));
    return m;
  });
  const [saving, setSaving] = useState(false);
  const toggle = (subj, d) =>
    setMap((m) => {
      const cur = m[subj] || [];
      return { ...m, [subj]: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d] };
    });
  return (
    <div style={overlay}>
      <div style={sheet}>
        <h3 style={{ margin: "0 0 6px", color: INK, fontSize: 19 }}>🔗 科目とやることをつなぐ</h3>
        <div style={{ fontSize: 12.5, color: SUB, marginBottom: 12, lineHeight: 1.6 }}>
          科目ごとに、その勉強にあたるやることを選んでください。やることの名前でつなぐので、同じ名前のやることなら新しいスケジュールでもそのまま数えます。
        </div>
        {doNames.length === 0 && <div style={{ fontSize: 13, color: DOWN, marginBottom: 10 }}>スケジュールにやることがまだありません。</div>}
        {subjectNames.map((n) => (
          <div key={n} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 900, color: colorOf(n), marginBottom: 6 }}>{n}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {doNames.map((d) => {
                const on = (map[n] || []).includes(d);
                return (
                  <button key={d} onClick={() => toggle(n, d)} style={{ ...chip(on, colorOf(n)), fontSize: 12.5 }}>
                    {on ? "✓ " : ""}
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={onCancel} style={{ ...btn("#EEF3F6", "#4a6c85"), flex: 1 }}>キャンセル</button>
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const clean = {};
              Object.entries(map).forEach(([k, v]) => v.length && (clean[k] = v));
              try {
                await onSubmit({ ...initial, ...clean, ...Object.fromEntries(subjectNames.filter((n) => !(map[n] || []).length).map((n) => [n, []])) });
              } catch (e) {
                setSaving(false);
              }
            }}
            style={{ ...btn("#14588C"), flex: 1.4, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "保存中…" : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
