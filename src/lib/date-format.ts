const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date) {
  const date = parseDate(value);
  return date
    ? `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
    : String(value);
}

export function formatDateTime(value: string | Date) {
  const date = parseDate(value);
  if (!date) return String(value);

  const hours = date.getUTCHours();
  const hour12 = hours % 12 || 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const meridiem = hours >= 12 ? "PM" : "AM";

  return `${formatDate(date)}, ${hour12}:${minutes} ${meridiem} UTC`;
}

const RELATIVE_UNITS: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { limit: 60, divisor: 1, unit: "second" },
  { limit: 60 * 60, divisor: 60, unit: "minute" },
  { limit: 60 * 60 * 24, divisor: 60 * 60, unit: "hour" },
  { limit: 60 * 60 * 24 * 7, divisor: 60 * 60 * 24, unit: "day" },
  { limit: 60 * 60 * 24 * 30, divisor: 60 * 60 * 24 * 7, unit: "week" },
  { limit: 60 * 60 * 24 * 365, divisor: 60 * 60 * 24 * 30, unit: "month" },
];

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Calendar days from `date` to `now` (0 = same local day, 1 = previous day). */
function localDayDiffFromNow(date: Date, now: Date) {
  return Math.floor(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / 86400000,
  );
}

/**
 * Short labels for chat list rows (e.g. 2:14 PM, Yesterday, Tue, Apr 18).
 * Uses the viewer's local timezone.
 */
export function formatChatListTime(iso: string, now: Date = new Date()) {
  const date = parseDate(iso);
  if (!date) return String(iso);

  const diff = localDayDiffFromNow(date, now);
  if (diff < 0) {
    return date.getFullYear() === now.getFullYear()
      ? `${MONTHS[date.getMonth()]} ${date.getDate()}`
      : `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
  if (diff === 0) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  if (diff === 1) {
    return "Yesterday";
  }
  if (diff >= 2 && diff <= 6) {
    return WEEKDAY_SHORT[date.getDay()];
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  }
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatRelative(value: string | Date, reference: Date = new Date()) {
  const date = parseDate(value);
  if (!date) return String(value);

  const deltaSeconds = Math.round((date.getTime() - reference.getTime()) / 1000);
  const absSeconds = Math.abs(deltaSeconds);

  for (const { limit, divisor, unit } of RELATIVE_UNITS) {
    if (absSeconds < limit) {
      return RELATIVE_FORMATTER.format(Math.round(deltaSeconds / divisor), unit);
    }
  }

  return RELATIVE_FORMATTER.format(Math.round(deltaSeconds / (60 * 60 * 24 * 365)), "year");
}
