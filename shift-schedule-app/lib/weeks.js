// حساب أسبوع "الحالي" و"الجاي" بناءً على تاريخ إسرائيل الفعلي،
// بحيث يشتغل نفس الحساب بالسيرفر وبالمتصفح بدون فرق توقيت.

const TIME_ZONE = "Asia/Jerusalem";
const WEEKDAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
export const DAYS = ["שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "ראשון"];

function getIsraelToday() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const map = {};
  fmt.formatToParts(new Date()).forEach((p) => (map[p.type] = p.value));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekdayShort: map.weekday.replace(",", ""),
  };
}

function getWeekStartDate(offsetWeeks = 0) {
  const { year, month, day, weekdayShort } = getIsraelToday();
  const mondayOffset = WEEKDAY_INDEX[weekdayShort] ?? 0;
  const base = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() - mondayOffset + offsetWeeks * 7);
  return base;
}

export function formatDateKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getCurrentWeekStartKey() {
  return formatDateKey(getWeekStartDate(0));
}

export function getNextWeekStartKey() {
  return formatDateKey(getWeekStartDate(1));
}

export function getWeekDateLabels(weekStartKey) {
  const [y, m, d] = weekStartKey.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const labels = {};
  DAYS.forEach((day, i) => {
    const dt = new Date(base);
    dt.setUTCDate(base.getUTCDate() + i);
    labels[day] = `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}`;
  });
  return labels;
}
