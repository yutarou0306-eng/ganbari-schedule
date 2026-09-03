function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
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

function subjectApplies(subject, date, startDate, endDate) {
  if (!isBetween(date, startDate, endDate)) return false;
  if (subject.freqType === "weekday") {
    return (subject.weekdays || []).includes(dayIndexMon0(date));
  }
  if (subject.freqType === "interval") {
    const diffDays = Math.round((date.getTime() - startDate.getTime()) / 86400000);
    const n = Math.max(1, subject.intervalDays || 2);
    return diffDays >= 0 && diffDays % n === 0;
  }
  return true;
}

// Overall completion across the whole schedule period (not just one week),
// used to show a "達成度" percentage on the top page's schedule lists.
//
// Counted by total stamp VALUE, not by how many individual days show at
// least one stamp — a missed day can be caught up later by double-tapping
// a different day (worth 2 toward the total instead of 1), so a day-by-day
// "is every day marked" check would understate progress for anyone who
// used that catch-up path. `done` can therefore exceed `need` if there
// was more catching-up than there were gaps; pct is clamped at 100.
export function computeOverallStats(config, completions) {
  if (!config || !config.subjects || !config.startDate || !config.endDate) {
    return { done: 0, need: 0, pct: 0 };
  }
  const start = parseDate(config.startDate);
  const end = parseDate(config.endDate);
  if (!start || !end) return { done: 0, need: 0, pct: 0 };

  let done = 0;
  let need = 0;
  for (let d = new Date(start); d.getTime() <= end.getTime(); d = addDays(d, 1)) {
    const dKey = dateKey(d);
    const rec = (completions && completions[dKey]) || {};
    config.subjects.forEach((s) => {
      if (subjectApplies(s, d, start, end)) {
        need++;
        done += Math.min(2, Math.max(0, rec[s.id] || 0));
      }
    });
  }
  const pct = need > 0 ? Math.min(100, Math.round((done / need) * 100)) : 0;
  return { done, need, pct };
}

// This schedule's subjects that are due TODAY but haven't been stamped yet
// — used by the stamp book (ProfileRoot) to show a "today's not-yet-done
// stamps" reminder across every linked schedule.
export function todayPendingSubjects(config, completions) {
  if (!config || !config.subjects || !config.startDate || !config.endDate) return [];
  const start = parseDate(config.startDate);
  const end = parseDate(config.endDate);
  if (!start || !end) return [];
  const today = addDays(new Date(), 0);
  if (!isBetween(today, start, end)) return [];
  const rec = (completions && completions[dateKey(today)]) || {};
  return config.subjects.filter((s) => subjectApplies(s, today, start, end) && (rec[s.id] || 0) < 1);
}
