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
        if ((rec[s.id] || 0) >= 1) done++;
      }
    });
  }
  const pct = need > 0 ? Math.round((done / need) * 100) : 0;
  return { done, need, pct };
}
