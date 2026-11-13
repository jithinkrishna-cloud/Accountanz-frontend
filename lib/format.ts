const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

export const formatINR = (n: number | null | undefined, exact = false) => (n == null ? "—" : (exact ? inrExact : inr).format(n));

/** API dates are 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS' (UTC). Displayed as DD-MM-YYYY like the existing app. */
export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  const [date, time] = value.replace("T", " ").split(" ");
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}${withTime && time ? ` ${time.slice(0, 5)}` : ""}`;
}

/** '2026-11' → 'Nov 2026' */
export function formatPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export const humanize = (value: string) => value.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());

/** API datetimes are UTC 'YYYY-MM-DD HH:MM:SS' without a zone marker. */
export const parseUtc = (value: string) => new Date(`${value.replace(" ", "T")}Z`);

/** A UTC datetime in the viewer's own timezone (IST for users in India). */
export const formatLocalDateTime = (utc: string) => parseUtc(utc).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

/** A meeting's start and end in the viewer's own timezone. */
export const formatMeetingTime = (startUtc: string, endUtc: string) =>
  `${formatLocalDateTime(startUtc)} – ${parseUtc(endUtc).toLocaleTimeString("en-IN", { timeStyle: "short" })}`;
