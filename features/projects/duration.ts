/**
 * Work durations as people type them: "1w 2d 4h 30m", "2h", "90m", "1.5h". A working day is 8 hours and a week
 * 5 days (same as the API). Values are whole minutes.
 */
const UNIT_MINUTES: Record<string, number> = { w: 5 * 8 * 60, d: 8 * 60, h: 60, m: 1 };

/** "1d 4h" → 720. A bare number means hours ("2" → 120). Returns null when the text isn't a duration. */
export function parseDuration(text: string): number | null {
  const s = text.trim().toLowerCase().replace(/,/g, ".");
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 60) || null;
  const re = /(\d+(?:\.\d+)?)\s*([wdhm])/g;
  let total = 0;
  let consumed = "";
  for (const m of s.matchAll(re)) {
    total += Number(m[1]) * UNIT_MINUTES[m[2]!]!;
    consumed += m[0];
  }
  // Everything typed must be understood (so "2 hours" or "abc" is rejected rather than half-read).
  if (consumed.replace(/\s/g, "") !== s.replace(/\s/g, "")) return null;
  return Math.round(total) || null;
}

/** 750 → "1d 4h 30m"; 0 or null → "". */
export function formatMinutes(total: number | null | undefined): string {
  if (!total || total <= 0) return "";
  let rest = Math.round(total);
  const parts: string[] = [];
  for (const [unit, size] of Object.entries(UNIT_MINUTES)) {
    const n = Math.floor(rest / size);
    if (n > 0) {
      parts.push(`${n}${unit}`);
      rest -= n * size;
    }
  }
  return parts.join(" ");
}

export const DURATION_HINT = "e.g. 2h, 1d 4h or 30m (1d = 8h, 1w = 5d)";
