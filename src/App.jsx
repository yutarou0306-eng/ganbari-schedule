import React, { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Unlock, Settings, ChevronLeft, ChevronRight, Plus, X, ArrowLeft } from "lucide-react";

const STORAGE_KEY = "pearl-sea-schedule-v2";
const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"]; // index 0=Mon ... 6=Sun

const PASTELS = [
  { name: "さくら", hex: "#FFD6E0" },
  { name: "もも", hex: "#FFC9DE" },
  { name: "ぴーち", hex: "#FFE3C2" },
  { name: "れもん", hex: "#FFF3B0" },
  { name: "みんと", hex: "#CFF3DE" },
  { name: "そら", hex: "#C6E9F9" },
  { name: "らべんだー", hex: "#DCCBF7" },
  { name: "らいらっく", hex: "#F3C9EA" },
];

const SHAPES = [
  // seal
  (c) => (
    <>
      <circle cx="7.2" cy="6.2" r="2.1" fill={c} />
      <circle cx="16.8" cy="6.2" r="2.1" fill={c} />
      <circle cx="12" cy="13.3" r="9" fill={c} />
    </>
  ),
  // star
  (c) => <path d="M12 2.5l2.6 6.2 6.7.5-5.1 4.4 1.6 6.6L12 16.8 6.2 20.2l1.6-6.6-5.1-4.4 6.7-.5L12 2.5z" fill={c} />,
  // ghost / pearl
  (c) => (
    <path
      d="M12 3c5 0 8 3.7 8 8.6v8.4l-2.1-1.8-2 1.8-1.9-1.8-2 1.8-2-1.8-2 1.8V11.6C4 6.7 7 3 12 3z"
      fill={c}
    />
  ),
  // heart
  (c) => (
    <path
      d="M12 20.5S3 14.8 3 8.9C3 5.9 5.3 3.7 8 3.7c1.7 0 3.2.9 4 2.3.8-1.4 2.3-2.3 4-2.3 2.7 0 5 2.2 5 5.2 0 5.9-9 11.6-9 11.6z"
      fill={c}
    />
  ),
  // cloud
  (c) => (
    <path
      d="M6.5 17a3.8 3.8 0 01-.4-7.6A4.6 4.6 0 0114.6 8a4 4 0 015.4 3.8 3.6 3.6 0 01-.6 7.2H7c-.2 0-.3 0-.5 0z"
      fill={c}
    />
  ),
  // flower
  (c) => (
    <>
      <circle cx="12" cy="6.6" r="3.1" fill={c} />
      <circle cx="17.4" cy="12" r="3.1" fill={c} />
      <circle cx="12" cy="17.4" r="3.1" fill={c} />
      <circle cx="6.6" cy="12" r="3.1" fill={c} />
      <circle cx="12" cy="12" r="3.3" fill={c} />
    </>
  ),
];

function Face() {
  return (
    <>
      <circle cx="9.2" cy="12.7" r="1.15" fill="#2b2b2b" />
      <circle cx="14.8" cy="12.7" r="1.15" fill="#2b2b2b" />
      <path d="M9.4 15.4 Q12 17.4 14.6 15.4" stroke="#2b2b2b" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <ellipse cx="7" cy="14.2" rx="1.3" ry="0.85" fill="#FF8FA3" opacity="0.6" />
      <ellipse cx="17" cy="14.2" rx="1.3" ry="0.85" fill="#FF8FA3" opacity="0.6" />
    </>
  );
}

function StampIcon({ index, color, size = 30, withFace = true }) {
  const draw = SHAPES[index % SHAPES.length];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {draw(color)}
      {withFace && <Face />}
    </svg>
  );
}

const CHEERS = ["やったね！", "すごいね！", "よくできました！", "ピカピカ★", "えらいね！", "ナイス！", "かんぺき！"];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d, n) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayIndexMon0(d) {
  return (d.getDay() + 6) % 7;
}

function isBetween(d, start, end) {
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function subjectAppliesOnDate(subject, date, startDate, endDate) {
  if (!isBetween(date, startDate, endDate)) return false;
  if (subject.freqType === "weekday") {
    return (subject.weekdays || []).includes(dayIndexMon0(date));
  }
  if (subject.freqType === "interval") {
    const diffDays = Math.round((date.getTime() - startDate.getTime()) / 86400000);
    const n = Math.max(1, subject.intervalDays || 2);
    return diffDays >= 0 && diffDays % n === 0;
  }
  return true; // daily
}

function todayStr() {
  return dateKey(new Date());
}

function clampDuration(v) {
  let n = Math.round(Number(v) / 10) * 10;
  if (!Number.isFinite(n) || n <= 0) n = 10;
  return Math.max(10, Math.min(100, n));
}

function defaultEndDate() {
  const d = new Date();
  d.setDate(d.getDate() + 27);
  return dateKey(d);
}

const DEFAULT_SUBJECTS = () => [
  { id: uid(), name: "こくご", color: PASTELS[0].hex, freqType: "daily", intervalDays: 2, weekdays: [0, 2, 4], durationMinutes: 10 },
  { id: uid(), name: "さんすう", color: PASTELS[5].hex, freqType: "daily", intervalDays: 2, weekdays: [0, 2, 4], durationMinutes: 10 },
  { id: uid(), name: "ピアノ", color: PASTELS[6].hex, freqType: "weekday", intervalDays: 2, weekdays: [1, 3], durationMinutes: 20 },
];

function freshConfig() {
  return {
    title: "",
    startDate: todayStr(),
    endDate: defaultEndDate(),
    subjects: DEFAULT_SUBJECTS(),
    pin: "",
  };
}

export default function KidsScheduleApp() {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("loading");
  const [config, setConfig] = useState(freshConfig());
  const [completions, setCompletions] = useState({});
  const [recoveries, setRecoveries] = useState({});
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [locked, setLocked] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [celebrateDay, setCelebrateDay] = useState(null);
  const [celebrateWeek, setCelebrateWeek] = useState(false);
  const [toast, setToast] = useState("");
  const skipSave = useRef(true);
  const unlockTimer = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const data = JSON.parse(res.value);
          if (data.config && data.config.subjects && data.config.subjects.length > 0) {
            setConfig(data.config);
            setCompletions(data.completions || {});
            setRecoveries(data.recoveries || {});
            const sd = parseDate(data.config.startDate);
            const today = new Date();
            const anchor = sd && today < sd ? sd : today;
            setWeekStart(getMonday(anchor));
            // A "?edit=1" URL flag (used by the top-page's edit button) jumps
            // straight into the setup/edit screen instead of the main view.
            let wantsEdit = false;
            try {
              wantsEdit = new URLSearchParams(window.location.search).get("edit") === "1";
            } catch (e) {}
            setView(wantsEdit ? "setup" : "main");
          } else {
            setView("setup");
          }
        } else {
          setView("setup");
        }
      } catch (e) {
        setView("setup");
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const t = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({ config, completions, recoveries }), false);
      } catch (e) {}
    }, 350);
    return () => clearTimeout(t);
  }, [config, completions, recoveries, loaded]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const startDate = parseDate(config.startDate) || new Date();
  const endDate = parseDate(config.endDate) || addDays(startDate, 27);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dateKey(today);

  function daySubjectsFor(date) {
    return config.subjects.filter((s) => subjectAppliesOnDate(s, date, startDate, endDate));
  }

  function countFor(dKey, subjId) {
    return (completions[dKey] && completions[dKey][subjId]) || 0;
  }

  function isStamped(dKey, subjId) {
    return countFor(dKey, subjId) >= 1;
  }

  // how many past required occurrences of this subject were never done, minus what's already been recovered
  function missedBacklog(subject) {
    let missed = 0;
    for (let d = new Date(startDate); d.getTime() < today.getTime(); d = addDays(d, 1)) {
      if (subjectAppliesOnDate(subject, d, startDate, endDate) && countFor(dateKey(d), subject.id) === 0) {
        missed++;
      }
    }
    return Math.max(0, missed - (recoveries[subject.id] || 0));
  }

  function handleTapStamp(date, subjId) {
    if (dateKey(date) !== todayKey) {
      showToast("スタンプは今日の分だけ押せるよ");
      return;
    }
    if (locked) {
      if (config.pin && config.pin.length > 0) setShowPinModal(true);
      else setShowConfirmModal(true);
      return;
    }
    const subject = config.subjects.find((s) => s.id === subjId);
    if (!subject) return;
    const dKey = dateKey(date);
    const cur = countFor(dKey, subjId);

    let next;
    let recoveryDelta = 0;
    if (cur === 0) {
      next = 1;
    } else if (cur === 1) {
      const backlog = missedBacklog(subject);
      if (backlog <= 0) {
        showToast("すでに1かい押してあるよ。取り消すときは×ボタンをおしてね");
        return;
      }
      next = 2;
      recoveryDelta = 1;
    } else {
      next = 0;
      recoveryDelta = -1;
    }

    setCompletions((prev) => {
      const day = { ...(prev[dKey] || {}) };
      if (next === 0) delete day[subjId];
      else day[subjId] = next;
      const updated = { ...prev, [dKey]: day };

      const need = daySubjectsFor(date).map((s) => s.id);
      const allDone = need.length > 0 && need.every((id) => (day[id] || 0) >= 1);
      if (allDone) setTimeout(() => setCelebrateDay(dKey), 50);

      const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter((d) =>
        isBetween(d, startDate, endDate)
      );
      if (weekDates.length > 0) {
        const weekAllDone = weekDates.every((d) => {
          const req = daySubjectsFor(d).map((s) => s.id);
          if (req.length === 0) return true;
          const rec = updated[dateKey(d)] || {};
          return req.every((id) => (rec[id] || 0) >= 1);
        });
        if (weekAllDone) setTimeout(() => setCelebrateWeek(true), 400);
      }
      return updated;
    });

    if (recoveryDelta !== 0) {
      setRecoveries((prev) => ({ ...prev, [subjId]: Math.max(0, (prev[subjId] || 0) + recoveryDelta) }));
    }

    if (next === 2) showToast("すごい！2日ぶん取り戻したね！");
  }

  function handleClearStamp(date, subjId) {
    if (dateKey(date) !== todayKey) {
      showToast("スタンプは今日の分だけ操作できるよ");
      return;
    }
    if (locked) {
      if (config.pin && config.pin.length > 0) setShowPinModal(true);
      else setShowConfirmModal(true);
      return;
    }
    const dKey = dateKey(date);
    const cur = countFor(dKey, subjId);
    if (cur === 0) return;
    const recoveryDelta = cur === 2 ? -1 : 0;

    setCompletions((prev) => {
      const day = { ...(prev[dKey] || {}) };
      delete day[subjId];
      return { ...prev, [dKey]: day };
    });

    if (recoveryDelta !== 0) {
      setRecoveries((prev) => ({ ...prev, [subjId]: Math.max(0, (prev[subjId] || 0) + recoveryDelta) }));
    }

    showToast("スタンプを取り消したよ");
  }

  function doUnlock() {
    setLocked(false);
    setShowConfirmModal(false);
    setShowPinModal(false);
    showToast("スタンプが押せるようになったよ！3分後に自動でロックします");
    clearTimeout(unlockTimer.current);
    unlockTimer.current = setTimeout(() => {
      setLocked(true);
      showToast("自動的にロックしました");
    }, 3 * 60 * 1000);
  }

  function handleRelock() {
    clearTimeout(unlockTimer.current);
    setLocked(true);
  }

  function totalStats() {
    let done = 0,
      need = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      if (!isBetween(d, startDate, endDate)) continue;
      const req = daySubjectsFor(d).map((s) => s.id);
      need += req.length;
      const rec = completions[dateKey(d)] || {};
      done += req.filter((id) => (rec[id] || 0) >= 1).length;
    }
    return { done, need };
  }

  function todayStats() {
    if (!isBetween(today, startDate, endDate)) return { done: 0, need: 0 };
    const req = daySubjectsFor(today).map((s) => s.id);
    const rec = completions[todayKey] || {};
    const done = req.filter((id) => (rec[id] || 0) >= 1).length;
    return { done, need: req.length };
  }

  function streakDays() {
    const t = todayStats();
    const todayComplete = isBetween(today, startDate, endDate) && t.need > 0 && t.done === t.need;
    let streak = 0;
    let cursor = addDays(today, todayComplete ? 0 : -1);
    while (isBetween(cursor, startDate, endDate)) {
      const req = daySubjectsFor(cursor).map((s) => s.id);
      if (req.length === 0) {
        cursor = addDays(cursor, -1);
        continue;
      }
      const rec = completions[dateKey(cursor)] || {};
      const complete = req.every((id) => (rec[id] || 0) >= 1);
      if (!complete) break;
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  if (view === "loading") {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingBubble} />
      </div>
    );
  }

  return (
    <div style={styles.appRoot}>
      <GlobalStyle />
      {view === "setup" && (
        <SetupScreen
          initial={config}
          hasExisting={!!config.title}
          onCancel={config.title ? () => setView("main") : null}
          onSave={(cfg) => {
            setConfig(cfg);
            setWeekStart(getMonday(parseDate(cfg.startDate) || new Date()));
            setView("main");
            // Clear the ?edit=1 flag so a later refresh lands on the main view.
            try {
              const url = new URL(window.location.href);
              if (url.searchParams.has("edit")) {
                url.searchParams.delete("edit");
                window.history.replaceState(null, "", url.toString());
              }
            } catch (e) {}
          }}
        />
      )}
      {view === "main" && (
        <MainScreen
          config={config}
          completions={completions}
          weekStart={weekStart}
          setWeekStart={setWeekStart}
          startDate={startDate}
          endDate={endDate}
          todayKey={todayKey}
          locked={locked}
          onLockToggle={() =>
            locked
              ? config.pin && config.pin.length > 0
                ? setShowPinModal(true)
                : setShowConfirmModal(true)
              : handleRelock()
          }
          onTapStamp={handleTapStamp}
          onClearStamp={handleClearStamp}
          daySubjectsFor={daySubjectsFor}
          isStamped={isStamped}
          countFor={countFor}
          missedBacklog={missedBacklog}
          onOpenSettings={() => setView("setup")}
          stats={totalStats()}
          todayStats={todayStats()}
          streak={streakDays()}
        />
      )}

      {showConfirmModal && (
        <ConfirmModal
          title="保護者の方へ"
          message="ここから先はスタンプを押せるようになります。保護者の方が操作していますか？"
          confirmLabel="はい、開けます"
          cancelLabel="やめる"
          onConfirm={doUnlock}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {showPinModal && (
        <PinModal
          correctPin={config.pin}
          onSuccess={doUnlock}
          onFail={() => showToast("あんしょう番号がちがいます")}
          onCancel={() => setShowPinModal(false)}
        />
      )}

      {celebrateDay && <DayCelebration onClose={() => setCelebrateDay(null)} />}
      {celebrateWeek && <WeekCelebration onClose={() => setCelebrateWeek(false)} title={config.title} />}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

/* ---------------- Setup Screen ---------------- */

function SubjectCard({ subject, onChange, onRemove }) {
  function set(patch) {
    onChange({ ...subject, ...patch });
  }
  function toggleWeekday(i) {
    const cur = subject.weekdays || [];
    const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort();
    set({ weekdays: next });
  }
  return (
    <div style={styles.subjCard}>
      <div style={styles.subjCardTop}>
        <input
          value={subject.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="やることの名前（例：ピアノ）"
          style={styles.subjNameInput}
        />
        <button style={styles.chipX} onClick={onRemove} aria-label="削除">
          <X size={14} />
        </button>
      </div>

      <div style={styles.swatchRow}>
        {PASTELS.map((p) => (
          <button
            key={p.hex}
            title={p.name}
            onClick={() => set({ color: p.hex })}
            style={{
              ...styles.swatch,
              background: p.hex,
              boxShadow: subject.color === p.hex ? "0 0 0 3px #fff, 0 0 0 5px #14588C" : "none",
            }}
          />
        ))}
      </div>

      <div style={styles.durationRow}>
        <input
          type="number"
          step={10}
          min={10}
          max={100}
          value={subject.durationMinutes ?? 10}
          onChange={(e) => set({ durationMinutes: Number(e.target.value) })}
          onBlur={(e) => set({ durationMinutes: clampDuration(e.target.value) })}
          style={styles.intervalInput}
        />
        <span style={{ fontSize: 13, color: "#4a6c85", fontWeight: 700 }}>分 とりくむ（10分きざみ・最大100分）</span>
      </div>

      <div style={styles.freqRow}>
        {[
          { k: "daily", label: "毎日" },
          { k: "interval", label: "〇日に1回" },
          { k: "weekday", label: "曜日をえらぶ" },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => set({ freqType: f.k })}
            style={{
              ...styles.freqBtn,
              background: subject.freqType === f.k ? "#14588C" : "#fff",
              color: subject.freqType === f.k ? "#fff" : "#14588C",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {subject.freqType === "interval" && (
        <div style={styles.intervalRow}>
          <input
            type="number"
            min={1}
            max={14}
            value={subject.intervalDays || 2}
            onChange={(e) => set({ intervalDays: Math.max(1, Number(e.target.value) || 1) })}
            style={styles.intervalInput}
          />
          <span style={{ fontSize: 13, color: "#4a6c85", fontWeight: 700 }}>日に1回のペース</span>
        </div>
      )}

      {subject.freqType === "weekday" && (
        <div style={styles.weekdayPicker}>
          {DAY_LABELS.map((label, i) => {
            const on = (subject.weekdays || []).includes(i);
            return (
              <button
                key={i}
                onClick={() => toggleWeekday(i)}
                style={{
                  ...styles.weekdayToggle,
                  background: on ? subject.color : "#fff",
                  borderColor: subject.color,
                  fontWeight: on ? 900 : 600,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SetupScreen({ initial, onSave, onCancel, hasExisting }) {
  const [title, setTitle] = useState(initial.title || "");
  const [startDate, setStartDate] = useState(initial.startDate || todayStr());
  const [endDate, setEndDate] = useState(initial.endDate || defaultEndDate());
  const [pin, setPin] = useState(initial.pin || "");
  const [subjects, setSubjects] = useState(
    initial.subjects && initial.subjects.length ? initial.subjects : DEFAULT_SUBJECTS()
  );

  function addSubject() {
    setSubjects((prev) => [
      ...prev,
      {
        id: uid(),
        name: "",
        color: PASTELS[prev.length % PASTELS.length].hex,
        freqType: "daily",
        intervalDays: 2,
        weekdays: [0, 1, 2, 3, 4],
        durationMinutes: 10,
      },
    ]);
  }

  function updateSubject(id, next) {
    setSubjects((prev) => prev.map((s) => (s.id === id ? next : s)));
  }

  function removeSubject(id) {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }

  function handleSave() {
    const t = title.trim() || "がんばりスケジュール";
    const cleanSubjects = subjects.filter((s) => s.name.trim().length > 0).map((s) => ({ ...s, name: s.name.trim() }));
    if (cleanSubjects.length === 0) return;
    let sd = startDate,
      ed = endDate;
    if (parseDate(ed) < parseDate(sd)) ed = sd;
    onSave({ title: t, startDate: sd, endDate: ed, subjects: cleanSubjects, pin: pin.trim() });
  }

  return (
    <div style={styles.setupWrap}>
      <div style={styles.setupCard}>
        {onCancel && (
          <button onClick={onCancel} style={styles.backBtn}>
            <ArrowLeft size={16} /> もどる
          </button>
        )}
        <h1 style={styles.setupHeading}>{hasExisting ? "スケジュールを編集する" : "スケジュールをつくろう"}</h1>
        <p style={styles.setupSub}>だれの、なんのためのスケジュールか、まず名前をつけてね</p>

        <label style={styles.label}>タイトル</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例）ゆうたろうの夏休みチャレンジ"
          style={styles.input}
        />

        <label style={{ ...styles.label, marginTop: 20 }}>期間（いつから、いつまで）</label>
        <div style={styles.dateRow}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.dateInput} />
          <span style={{ color: "#4a6c85", fontWeight: 700 }}>〜</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.dateInput} />
        </div>

        <label style={{ ...styles.label, marginTop: 20 }}>保護者用 あんしょう番号（にんい・数字4〜6桁）</label>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder="設定しない場合は空欄でOK"
          inputMode="numeric"
          style={styles.input}
        />
        <p style={styles.tinyNote}>あんしょう番号を入れると、スタンプを押すときに保護者の確認が必要になります。</p>

        <label style={{ ...styles.label, marginTop: 20 }}>やること（教科・習い事）</label>
        <div style={styles.subjList}>
          {subjects.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              onChange={(next) => updateSubject(s.id, next)}
              onRemove={() => removeSubject(s.id)}
            />
          ))}
        </div>
        <button style={styles.addBtn} onClick={addSubject}>
          <Plus size={16} /> やることを追加
        </button>

        <button style={styles.saveBtn} onClick={handleSave}>
          このスケジュールではじめる
        </button>
      </div>
    </div>
  );
}

/* ---------------- Main Screen ---------------- */

function MainScreen({
  config,
  completions,
  weekStart,
  setWeekStart,
  startDate,
  endDate,
  todayKey,
  locked,
  onLockToggle,
  onTapStamp,
  onClearStamp,
  daySubjectsFor,
  isStamped,
  countFor,
  missedBacklog,
  onOpenSettings,
  stats,
  todayStats,
  streak,
}) {
  const weekMonday = getMonday(startDate);
  const lastMonday = getMonday(endDate);
  const canPrev = weekStart.getTime() > weekMonday.getTime();
  const canNext = weekStart.getTime() < lastMonday.getTime();

  const weekEnd = addDays(weekStart, 6);
  const rangeLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} 〜 ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
  const pct = stats.need > 0 ? Math.round((stats.done / stats.need) * 100) : 0;
  const pearlCount = 10;
  const filledPearls = stats.need > 0 ? Math.round((stats.done / stats.need) * pearlCount) : 0;

  const todayPct = todayStats.need > 0 ? Math.round((todayStats.done / todayStats.need) * 100) : 0;
  const mascotMsg =
    todayStats.need === 0
      ? "今日はおやすみの日だよ〜"
      : todayStats.done === 0
      ? "今日もいっしょに がんばろう！"
      : todayStats.done < todayStats.need
      ? "いいちょうし！ あと すこし！"
      : "きょうも パーフェクト！すごいね！";

  const visibleDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter((d) =>
    isBetween(d, startDate, endDate)
  );

  const allSubjectsInWeek = [];
  const seen = new Set();
  visibleDays.forEach((d) => {
    daySubjectsFor(d).forEach((s) => {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        allSubjectsInWeek.push(s);
      }
    });
  });
  const columns = allSubjectsInWeek.length > 0 ? allSubjectsInWeek : config.subjects;

  return (
    <div style={styles.mainWrap}>
      <CornerArt />
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.titleBanner}>
            <span style={styles.titleText}>{config.title}</span>
          </div>
          <div style={styles.headerBtns}>
            <button style={styles.iconBtn} onClick={onLockToggle} title={locked ? "保護者用に開ける" : "ロックする"}>
              {locked ? <Lock size={18} /> : <Unlock size={18} />}
            </button>
            <button style={styles.iconBtn} onClick={onOpenSettings} title="設定">
              <Settings size={18} />
            </button>
          </div>
        </div>
        <div style={styles.lockNote}>
          {locked ? "🔒 スタンプは保護者の方がロックを開けてから押せます" : "🔓 スタンプが押せます（3分後に自動ロック）"}
        </div>

        <div style={styles.mascotRow}>
          <div style={styles.mascotFace}>
            <StampIcon index={0} color="#FFD6E0" size={44} />
          </div>
          <div style={styles.mascotBubbleWrap}>
            <div style={styles.mascotBubble}>{mascotMsg}</div>
            <div style={styles.todayProgressLine}>
              <span style={styles.todayProgressNum}>
                きょう {todayStats.done}／{todayStats.need}
              </span>
              {streak > 0 && <span style={styles.streakBadge}>🔥 れんぞく{streak}日</span>}
            </div>
            {todayStats.need > 0 && (
              <div style={styles.todayBarTrack}>
                <div style={{ ...styles.todayBarFill, width: `${todayPct}%` }} />
              </div>
            )}
          </div>
        </div>

        <div style={styles.necklaceRow}>
          {Array.from({ length: pearlCount }).map((_, i) => (
            <span
              key={i}
              style={{
                ...styles.pearl,
                background: i < filledPearls ? "radial-gradient(circle at 35% 30%, #fff, #F4C95D 70%)" : "#ffffff55",
                boxShadow: i < filledPearls ? "0 0 8px #F4C95Daa" : "none",
              }}
            />
          ))}
          <span style={styles.pearlPct}>{pct}%（こんしゅう）</span>
        </div>
      </header>

      <div style={styles.weekNav}>
        <button style={{ ...styles.navBtn, opacity: canPrev ? 1 : 0.4 }} disabled={!canPrev} onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft size={18} /> 前の週
        </button>
        <div style={styles.weekLabel}>{rangeLabel}</div>
        <button style={{ ...styles.navBtn, opacity: canNext ? 1 : 0.4 }} disabled={!canNext} onClick={() => setWeekStart(addDays(weekStart, 7))}>
          次の週 <ChevronRight size={18} />
        </button>
      </div>

      <div style={styles.tablePanel}>
        <p style={styles.tableHint}>💡 スタンプは「今日」だけ押せるよ。できなかった日は、今日2かいタップで取り戻せる！</p>
        <div style={styles.tableScroll}>
          <table style={styles.scheduleTable}>
            <thead>
              <tr>
                <th style={styles.cornerHeadCell}>
                  <span style={{ fontSize: 20 }}>🐚</span>
                </th>
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = addDays(weekStart, i);
                  const inRange = isBetween(d, startDate, endDate);
                  const dKey = dateKey(d);
                  const isToday = todayKey === dKey;
                  const dayReq = inRange ? daySubjectsFor(d) : [];
                  const doneCount = dayReq.filter((s) => isStamped(dKey, s.id)).length;
                  const dayComplete = dayReq.length > 0 && doneCount === dayReq.length;
                  return (
                    <th
                      key={i}
                      style={{
                        ...styles.dayHeadCell,
                        ...(isToday ? styles.dayHeadToday : {}),
                        ...(dayComplete ? styles.dayHeadComplete : {}),
                      }}
                    >
                      <div style={styles.dayHeadDow}>{DAY_LABELS[i]}</div>
                      <div style={styles.dayHeadDate}>{inRange ? `${d.getMonth() + 1}/${d.getDate()}` : "―"}</div>
                      {isToday && <div style={styles.dayHeadTodayTag}>きょう</div>}
                      {dayComplete && <div style={styles.dayHeadTrophy}>🏆</div>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {columns.map((s, idx) => {
                const backlog = missedBacklog(s);
                return (
                  <tr key={s.id}>
                    <td style={styles.rowHeadCell}>
                      <div style={{ ...styles.headBubble, background: s.color }}>
                        <StampIcon index={idx} color="#ffffff" size={18} />
                      </div>
                      <div style={styles.headLabel}>
                        {s.name}
                        <span style={styles.durationBadge}>⏱{s.durationMinutes || 10}分</span>
                        {backlog > 0 && <div style={styles.backlogBadge}>🔁 のこり{backlog}</div>}
                      </div>
                    </td>
                    {Array.from({ length: 7 }).map((_, i) => {
                      const d = addDays(weekStart, i);
                      const inRange = isBetween(d, startDate, endDate);
                      if (!inRange) {
                        return (
                          <td key={i} style={styles.dashCell}>
                            <span style={styles.dashMark}>―</span>
                          </td>
                        );
                      }
                      const dKey = dateKey(d);
                      const applies = daySubjectsFor(d).some((x) => x.id === s.id);
                      if (!applies) {
                        return (
                          <td key={i} style={styles.dashCell}>
                            <span style={styles.dashMark}>ー</span>
                          </td>
                        );
                      }
                      const count = countFor(dKey, s.id);
                      const isToday = dKey === todayKey;
                      const isPastMiss = !isToday && dKey < todayKey && count === 0;

                      if (isToday) {
                        return (
                          <td key={i} style={styles.stampCell}>
                            <StampCell count={count} color={s.color} iconIndex={idx} label={s.name} onTap={() => onTapStamp(d, s.id)} onClear={() => onClearStamp(d, s.id)} />
                          </td>
                        );
                      }
                      return (
                        <td key={i} style={styles.stampCell}>
                          <ReadOnlyCell count={count} color={s.color} iconIndex={idx} missed={isPastMiss} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyCell({ count, color, iconIndex, missed }) {
  return (
    <div
      style={{
        ...styles.stampCircle,
        cursor: "default",
        borderColor: count >= 1 ? color : missed ? "#F4C95D" : "#dbe8ee",
        background: count >= 1 ? color + "22" : "#fff",
        opacity: count >= 1 ? 1 : 0.75,
      }}
    >
      {count >= 1 && <StampIcon index={iconIndex} color={color} size={24} />}
      {count === 2 && <span style={styles.x2Badge}>×2</span>}
    </div>
  );
}

function StampCell({ count, color, iconIndex, label, onTap, onClear }) {
  const [popKey, setPopKey] = useState(0);
  const [comment, setComment] = useState(null);
  const prevCount = useRef(count);
  const timerRef = useRef(null);

  useEffect(() => {
    if (count > prevCount.current) {
      setPopKey((k) => k + 1);
      setComment(count === 2 ? "2日ぶん とりもどした！" : CHEERS[Math.floor(Math.random() * CHEERS.length)]);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setComment(null), 1300);
    }
    prevCount.current = count;
  }, [count]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div style={styles.stampCellWrap}>
      <button
        onClick={onTap}
        style={{
          ...styles.stampCircle,
          borderColor: color,
          background: count >= 1 ? color + "22" : "#ffffff",
        }}
        aria-label={`${label} スタンプ`}
      >
        {count >= 1 && (
          <span key={popKey} style={styles.stampPopWrap}>
            <StampIcon index={iconIndex} color={color} size={26} />
          </span>
        )}
        {count === 2 && <span style={styles.x2Badge}>×2</span>}
        {comment && <span style={styles.commentBubble}>{comment}</span>}
      </button>
      {count >= 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          style={styles.undoBadge}
          aria-label={`${label} スタンプを取り消す`}
          title="取り消す"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ---------------- Overlays ---------------- */

function ConfirmModal({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <h3 style={styles.modalTitle}>{title}</h3>
        <p style={styles.modalMsg}>{message}</p>
        <div style={styles.modalBtns}>
          <button style={styles.modalCancel} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button style={styles.modalConfirm} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PinModal({ correctPin, onSuccess, onFail, onCancel }) {
  const [val, setVal] = useState("");
  function submit() {
    if (val === correctPin) {
      onSuccess();
    } else {
      onFail();
      setVal("");
    }
  }
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <h3 style={styles.modalTitle}>保護者の方へ</h3>
        <p style={styles.modalMsg}>あんしょう番号を入力してください</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ ...styles.input, textAlign: "center", letterSpacing: 6, fontSize: 20, marginBottom: 16 }}
          placeholder="••••"
        />
        <div style={styles.modalBtns}>
          <button style={styles.modalCancel} onClick={onCancel}>
            やめる
          </button>
          <button style={styles.modalConfirm} onClick={submit}>
            開ける
          </button>
        </div>
      </div>
    </div>
  );
}

function DayCelebration({ onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 1800);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={styles.dayCelebrateOverlay} onClick={onClose}>
      <div style={styles.dayCelebrateBadge}>
        <span style={{ fontSize: 46 }}>🐚</span>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0B3D62", marginTop: 4 }}>今日はぜんぶ できたね！</div>
      </div>
    </div>
  );
}

function WeekCelebration({ onClose, title }) {
  return (
    <div style={styles.weekCelebrateOverlay}>
      <Confetti />
      <div style={styles.weekCelebrateCard}>
        <div style={styles.chestEmoji}>🏆✨</div>
        <h2 style={styles.weekCelebrateTitle}>今週のミッション達成！</h2>
        <p style={styles.weekCelebrateSub}>{title} がんばったね。おおきなスタンプをプレゼント！</p>
        <div style={styles.bigStamp}>GREAT!</div>
        <button style={styles.weekCelebrateBtn} onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 26 });
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const dur = 2.2 + Math.random() * 1.4;
        const color = PASTELS[i % PASTELS.length].hex;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              top: -20,
              left: `${left}%`,
              width: 9,
              height: 9,
              borderRadius: i % 2 === 0 ? "50%" : 2,
              background: color,
              animation: `confettiFall ${dur}s ease-in ${delay}s forwards`,
              opacity: 0.95,
            }}
          />
        );
      })}
    </div>
  );
}

function CornerArt() {
  return (
    <>
      <svg style={{ position: "absolute", top: 6, right: -10, opacity: 0.5 }} width="150" height="90" viewBox="0 0 150 90">
        <path d="M10 45c20-30 60-38 100-25 15 5 25 13 30 22-8 6-20 10-32 8 3 6 3 12 0 17-10-2-18-8-22-16-20 10-52 8-76-6z" fill="#EAF7FB" />
        <circle cx="45" cy="42" r="2.4" fill="#0B3D62" />
      </svg>
      <svg style={{ position: "absolute", bottom: 10, right: -6, opacity: 0.55 }} width="110" height="90" viewBox="0 0 110 90">
        <ellipse cx="55" cy="45" rx="40" ry="30" fill="#CFF3DE" />
        <path d="M20 45c-8 0-14 6-14 6s8 4 16 2M90 45c8 0 14 6 14 6s-8 4-16 2" stroke="#CFF3DE" strokeWidth="6" fill="none" strokeLinecap="round" />
      </svg>
      <svg style={{ position: "absolute", bottom: 4, left: -6, opacity: 0.55 }} width="90" height="80" viewBox="0 0 90 80">
        <path d="M15 65h60l-6-28c-3-14-16-24-30-24S12 23 9 37z" fill="#F4C95D" />
        <rect x="14" y="60" width="62" height="10" rx="4" fill="#E0A83E" />
      </svg>
      <svg style={{ position: "absolute", top: "38%", left: -14, opacity: 0.35 }} width="70" height="140" viewBox="0 0 70 140">
        <path d="M35 0c15 20 15 40 0 60s-15 40 0 60" stroke="#fff" strokeWidth="3" fill="none" />
      </svg>
    </>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Kaisei+Decol:wght@400;700&family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap');
      @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(520px) rotate(340deg); opacity: 0; }
      }
      @keyframes popIn {
        0% { transform: scale(0.4); opacity: 0; }
        70% { transform: scale(1.08); opacity: 1; }
        100% { transform: scale(1); }
      }
      @keyframes bob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes stampPop {
        0% { transform: scale(0) rotate(-25deg); opacity: 0; }
        55% { transform: scale(1.35) rotate(8deg); opacity: 1; }
        75% { transform: scale(0.9) rotate(-4deg); }
        100% { transform: scale(1) rotate(0deg); }
      }
      @keyframes floatComment {
        0% { transform: translate(-50%, 4px) scale(0.6); opacity: 0; }
        15% { transform: translate(-50%, -6px) scale(1.05); opacity: 1; }
        30% { transform: translate(-50%, -10px) scale(1); opacity: 1; }
        80% { transform: translate(-50%, -22px) scale(1); opacity: 1; }
        100% { transform: translate(-50%, -34px) scale(0.9); opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; transition: none !important; }
      }
    `}</style>
  );
}

/* ---------------- styles ---------------- */

const oceanBg = "linear-gradient(180deg, #0B3D62 0%, #14588C 42%, #2E9BC7 78%, #6FCFEB 100%)";

const styles = {
  appRoot: {
    fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif",
    minHeight: 560,
    width: "100%",
    color: "#0B3D62",
    background: "#EAF7FB",
  },
  loadingWrap: { minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", background: oceanBg },
  loadingBubble: { width: 40, height: 40, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #fff, #6FCFEB 70%)", animation: "bob 1.2s ease-in-out infinite" },

  setupWrap: { background: oceanBg, minHeight: 560, padding: "28px 16px", display: "flex", justifyContent: "center" },
  setupCard: { background: "linear-gradient(180deg, #FFFBF3, #FFF7EC)", borderRadius: 24, padding: 24, maxWidth: 680, width: "100%", boxShadow: "0 20px 50px rgba(11,61,98,0.35)", position: "relative" },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#14588C", fontWeight: 700, cursor: "pointer", marginBottom: 8, fontFamily: "inherit", fontSize: 14 },
  setupHeading: { fontFamily: "'Kaisei Decol', serif", fontSize: 26, margin: "4px 0 2px", color: "#0B3D62" },
  setupSub: { fontSize: 13, color: "#4a6c85", marginBottom: 18 },
  label: { display: "block", fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#14588C" },
  tinyNote: { fontSize: 11.5, color: "#7c98aa", marginTop: 6 },
  input: { width: "100%", padding: "12px 14px", borderRadius: 14, border: "2px solid #BFE3F0", fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#fff" },
  dateRow: { display: "flex", alignItems: "center", gap: 10 },
  dateInput: { flex: 1, padding: "10px 12px", borderRadius: 14, border: "2px solid #BFE3F0", fontSize: 14, fontFamily: "inherit", background: "#fff" },

  subjList: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 },
  subjCard: { background: "#fff", border: "2px solid #EAF7FB", borderRadius: 16, padding: 12 },
  subjCardTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  subjNameInput: { flex: 1, border: "none", borderBottom: "2px solid #EAF7FB", padding: "4px 2px", fontSize: 15, fontWeight: 700, fontFamily: "inherit", outline: "none", color: "#0B3D62" },
  chipX: { border: "none", background: "rgba(11,61,98,0.12)", borderRadius: "50%", width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#0B3D62", flexShrink: 0 },
  swatchRow: { display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  swatch: { width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer" },
  freqRow: { display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  freqBtn: { border: "2px solid #14588C", borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  intervalRow: { display: "flex", alignItems: "center", gap: 8 },
  durationRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  intervalInput: { width: 56, padding: "6px 8px", borderRadius: 10, border: "2px solid #BFE3F0", fontSize: 14, fontFamily: "inherit", textAlign: "center" },
  weekdayPicker: { display: "flex", gap: 5, flexWrap: "wrap" },
  weekdayToggle: { width: 32, height: 32, borderRadius: 10, border: "2px solid", cursor: "pointer", fontSize: 12.5, color: "#0B3D62", fontFamily: "inherit" },

  addBtn: { display: "inline-flex", alignItems: "center", gap: 4, background: "#14588C", color: "#fff", border: "none", borderRadius: 14, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14, marginBottom: 20 },
  saveBtn: { width: "100%", padding: "14px 0", borderRadius: 16, border: "none", background: "linear-gradient(135deg, #FFB6C9, #F4C95D)", color: "#fff", fontWeight: 900, fontSize: 16, cursor: "pointer", boxShadow: "0 10px 20px rgba(255,143,163,0.4)", fontFamily: "inherit" },

  mainWrap: { position: "relative", background: oceanBg, minHeight: 560, overflow: "hidden", paddingBottom: 30 },
  header: { position: "relative", padding: "24px 18px 16px", zIndex: 2 },
  headerTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  titleBanner: { background: "#fff", borderRadius: 999, padding: "8px 18px", boxShadow: "0 8px 18px rgba(11,61,98,0.3)", maxWidth: "78%" },
  titleText: { fontFamily: "'Kaisei Decol', serif", color: "#0B3D62", fontSize: 18, fontWeight: 700 },
  headerBtns: { display: "flex", gap: 8, flexShrink: 0 },
  iconBtn: { width: 38, height: 38, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.3)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" },
  lockNote: { color: "#EAF7FB", fontSize: 12.5, marginTop: 10, fontWeight: 700 },

  mascotRow: { display: "flex", alignItems: "flex-start", gap: 10, marginTop: 14 },
  mascotFace: { width: 52, height: 52, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 6px 14px rgba(11,61,98,0.3)", animation: "bob 2.4s ease-in-out infinite" },
  mascotBubbleWrap: { flex: 1, minWidth: 0 },
  mascotBubble: { background: "#fff", borderRadius: 14, padding: "8px 12px", fontSize: 13, fontWeight: 800, color: "#0B3D62", display: "inline-block", boxShadow: "0 6px 14px rgba(11,61,98,0.25)" },
  todayProgressLine: { display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  todayProgressNum: { color: "#fff", fontWeight: 900, fontSize: 14, textShadow: "0 2px 6px rgba(11,61,98,0.5)" },
  streakBadge: { background: "linear-gradient(135deg,#FFB347,#FF8FA3)", color: "#fff", fontWeight: 900, fontSize: 11.5, padding: "3px 9px", borderRadius: 999, boxShadow: "0 3px 8px rgba(0,0,0,0.25)" },
  todayBarTrack: { marginTop: 6, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.3)", overflow: "hidden", maxWidth: 280 },
  todayBarFill: { height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#FFD6E0,#F4C95D)", transition: "width 0.5s ease" },

  necklaceRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 14, background: "rgba(255,255,255,0.15)", padding: "10px 12px", borderRadius: 999, backdropFilter: "blur(4px)" },
  pearl: { width: 16, height: 16, borderRadius: "50%", flexShrink: 0, transition: "all 0.4s" },
  pearlPct: { marginLeft: "auto", color: "#fff", fontWeight: 900, fontSize: 13 },

  weekNav: { position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", marginTop: 4 },
  navBtn: { display: "inline-flex", alignItems: "center", gap: 2, background: "rgba(255,255,255,0.85)", border: "none", borderRadius: 999, padding: "8px 12px", fontWeight: 700, fontSize: 12.5, color: "#14588C", cursor: "pointer", fontFamily: "inherit" },
  weekLabel: { color: "#fff", fontWeight: 800, fontSize: 14 },

  tablePanel: { position: "relative", zIndex: 2, margin: "16px 18px 0", background: "linear-gradient(180deg,#FFFDF8,#FFF3E4)", borderRadius: 22, padding: 12, boxShadow: "0 16px 34px rgba(11,61,98,0.3)" },
  tableHint: { fontSize: 11.5, color: "#5a7d94", fontWeight: 700, margin: "0 4px 8px" },
  tableScroll: { overflowX: "auto" },
  scheduleTable: { borderCollapse: "separate", borderSpacing: "6px", width: "100%" },
  cornerHeadCell: { width: 92 },

  dayHeadCell: { background: "#fff", borderRadius: 14, padding: "6px 4px", textAlign: "center", boxShadow: "inset 0 0 0 2px #EAF7FB", minWidth: 52 },
  dayHeadToday: { boxShadow: "inset 0 0 0 2px #14588C" },
  dayHeadComplete: { boxShadow: "inset 0 0 0 2px #F4C95D", background: "#FFF7DA" },
  dayHeadDow: { fontSize: 13, fontWeight: 900, color: "#0B3D62" },
  dayHeadDate: { fontSize: 10.5, color: "#7c98aa" },
  dayHeadTodayTag: { fontSize: 9, color: "#fff", background: "#14588C", borderRadius: 999, padding: "1px 6px", display: "inline-block", marginTop: 2, fontWeight: 900 },
  dayHeadTrophy: { fontSize: 12, marginTop: 1 },

  headBubble: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 3px 6px rgba(0,0,0,0.15)" },
  headLabel: { fontSize: 12, fontWeight: 800, color: "#0B3D62", lineHeight: 1.2 },
  backlogBadge: { fontSize: 9.5, color: "#B5651D", background: "#FFE9B3", borderRadius: 999, padding: "1px 6px", display: "inline-block", marginTop: 2, fontWeight: 800 },
  durationBadge: { fontSize: 9.5, color: "#14588C", background: "#DCEEF7", borderRadius: 999, padding: "1px 6px", display: "inline-block", marginTop: 2, marginLeft: 4, fontWeight: 800 },
  rowHeadCell: { background: "#fff", borderRadius: 14, padding: "8px 10px", textAlign: "left", boxShadow: "inset 0 0 0 2px #EAF7FB", display: "flex", alignItems: "center", gap: 8, minWidth: 92, whiteSpace: "nowrap" },

  stampCell: { textAlign: "center", padding: 2 },
  stampCellWrap: { position: "relative", display: "inline-block" },
  stampCircle: { width: 42, height: 42, borderRadius: "50%", border: "2px dashed", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", overflow: "visible" },
  stampPopWrap: { display: "flex", alignItems: "center", justifyContent: "center", animation: "stampPop 0.45s cubic-bezier(.34,1.56,.64,1)" },
  x2Badge: { position: "absolute", top: -6, right: -6, background: "#FF6B8A", color: "#fff", fontSize: 9.5, fontWeight: 900, borderRadius: 999, padding: "1px 5px", boxShadow: "0 2px 5px rgba(0,0,0,0.3)" },
  undoBadge: { position: "absolute", top: -6, left: -6, width: 18, height: 18, borderRadius: "50%", background: "#8aa4b4", color: "#fff", fontSize: 12, fontWeight: 900, border: "2px solid #fff", boxShadow: "0 2px 5px rgba(0,0,0,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 },
  commentBubble: { position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", background: "#fff", color: "#FF6B8A", fontSize: 10.5, fontWeight: 900, padding: "3px 8px", borderRadius: 999, boxShadow: "0 4px 10px rgba(0,0,0,0.2)", animation: "floatComment 1.3s ease-out forwards", pointerEvents: "none" },
  dashCell: { textAlign: "center" },
  dashMark: { color: "#c9d8e0", fontSize: 14, fontWeight: 700 },

  toast: { position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)", background: "#0B3D62", color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700, boxShadow: "0 10px 24px rgba(0,0,0,0.3)", zIndex: 50, maxWidth: "90%", textAlign: "center" },

  modalOverlay: { position: "absolute", inset: 0, background: "rgba(11,61,98,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 20 },
  modalCard: { background: "#fff", borderRadius: 20, padding: 22, maxWidth: 320, width: "100%", textAlign: "center", animation: "popIn 0.25s ease-out" },
  modalTitle: { margin: "0 0 8px", fontSize: 17, color: "#0B3D62" },
  modalMsg: { fontSize: 13.5, color: "#4a6c85", lineHeight: 1.6, marginBottom: 18 },
  modalBtns: { display: "flex", gap: 10 },
  modalCancel: { flex: 1, padding: "10px 0", borderRadius: 12, border: "2px solid #d7ecf3", background: "#fff", color: "#5a7d94", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  modalConfirm: { flex: 1, padding: "10px 0", borderRadius: 12, border: "none", background: "#14588C", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  dayCelebrateOverlay: { position: "absolute", inset: 0, background: "rgba(11,61,98,0.25)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 45 },
  dayCelebrateBadge: { background: "#fff", borderRadius: 20, padding: "20px 30px", textAlign: "center", animation: "popIn 0.3s ease-out", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" },

  weekCelebrateOverlay: { position: "absolute", inset: 0, background: "rgba(11,61,98,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 46 },
  weekCelebrateCard: { position: "relative", background: "linear-gradient(180deg, #FFFBF3, #FFF3D6)", borderRadius: 24, padding: "30px 26px", textAlign: "center", maxWidth: 320, animation: "popIn 0.35s ease-out", boxShadow: "0 30px 60px rgba(0,0,0,0.4)" },
  chestEmoji: { fontSize: 48, marginBottom: 6 },
  weekCelebrateTitle: { fontFamily: "'Kaisei Decol', serif", color: "#0B3D62", fontSize: 21, margin: "4px 0" },
  weekCelebrateSub: { fontSize: 13, color: "#5a7d94", marginBottom: 16, lineHeight: 1.6 },
  bigStamp: { display: "inline-block", border: "4px solid #FF8FA3", color: "#FF8FA3", fontWeight: 900, fontSize: 22, padding: "8px 22px", borderRadius: 14, transform: "rotate(-8deg)", marginBottom: 18, fontFamily: "'Kaisei Decol', serif" },
  weekCelebrateBtn: { display: "block", margin: "0 auto", padding: "10px 28px", borderRadius: 999, border: "none", background: "#14588C", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
};
