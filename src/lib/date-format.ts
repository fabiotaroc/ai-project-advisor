const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

function parseDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date) {
  const date = parseDate(value);
  return date ? DATE_FORMATTER.format(date) : String(value);
}

export function formatDateTime(value: string | Date) {
  const date = parseDate(value);
  return date ? DATE_TIME_FORMATTER.format(date) : String(value);
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
