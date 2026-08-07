// Indian Financial Year utilities — every FY runs April 1 → March 31.
// Records are bucketed by their authoritative date (dispatch_date for
// shipments, `date` for ledger entries, trip.date / txn.created_at for
// bullion). Labels use the `FY 2026-27` short form.
//
// A single place to answer "what FY does this date belong to?" so the
// dashboard, ledger, and bullion pages all agree.

export type FYKey = string; // "2026-27"

const FY_START_MONTH = 4; // April (1-indexed)

function parseDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  // Accept ISO date (yyyy-mm-dd) OR full ISO datetime.
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/** Returns the FY key (e.g., "2026-27") for the given date. */
export function getFYKey(input: string | Date | null | undefined): FYKey | null {
  const d = parseDate(input);
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1; // 1-12
  const start = m >= FY_START_MONTH ? y : y - 1;
  const end = (start + 1) % 100;
  return `${start}-${end.toString().padStart(2, "0")}`;
}

/** Pretty label — `FY 2026-27`. */
export function fyLabel(key: FYKey): string {
  return `FY ${key}`;
}

/** Inclusive-start, exclusive-end date bounds for a FY key. */
export function fyBounds(key: FYKey): { start: Date; end: Date } {
  const [startYearStr] = key.split("-");
  const startYear = parseInt(startYearStr, 10);
  const start = new Date(Date.UTC(startYear, FY_START_MONTH - 1, 1));
  const end = new Date(Date.UTC(startYear + 1, FY_START_MONTH - 1, 1));
  return { start, end };
}

/** Does a given record-date fall inside a FY? */
export function isInFY(input: string | Date | null | undefined, key: FYKey): boolean {
  const d = parseDate(input);
  if (!d) return false;
  const { start, end } = fyBounds(key);
  return d >= start && d < end;
}

/** Current FY based on today. */
export function currentFYKey(now: Date = new Date()): FYKey {
  return getFYKey(now) as FYKey;
}

/**
 * Returns FY keys covering `min` up to the current FY (inclusive), newest
 * first. When `min` is nullish, defaults to (currentYear - 3).
 */
export function listFYKeys(min?: string | Date | null): FYKey[] {
  const now = new Date();
  const currentKey = currentFYKey(now);
  const currentStart = parseInt(currentKey.split("-")[0], 10);

  let earliestStart = currentStart - 3;
  const minDate = parseDate(min);
  if (minDate) {
    const key = getFYKey(minDate);
    if (key) earliestStart = Math.min(earliestStart, parseInt(key.split("-")[0], 10));
  }
  const keys: FYKey[] = [];
  for (let y = currentStart; y >= earliestStart; y--) {
    const end = (y + 1) % 100;
    keys.push(`${y}-${end.toString().padStart(2, "0")}`);
  }
  return keys;
}
