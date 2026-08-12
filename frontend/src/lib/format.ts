/**
 * Tiny formatting helpers shared across screens.
 *
 * We keep these dependency-free (no date-fns / dayjs imports) so the
 * bundle stays lean during the reconstruction phase. If we need
 * richer formatting later we can graduate to a library then.
 */

const RUPEE = "\u20B9";
const BAHT = "\u0E3F";

export function fmtCurrency(value: number | null | undefined, currency?: string | null): string {
  const n = typeof value === "number" ? value : 0;
  const symbol = currency === "THB" ? BAHT : currency === "INR" ? RUPEE : "";
  const abs = Math.abs(n);
  // Custom-format with 2 decimals + Indian grouping for INR-ish feel; fall
  // back to en-US grouping otherwise.
  const grouped = abs.toLocaleString(currency === "THB" ? "en-US" : "en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const sign = n < 0 ? "-" : "";
  return `${sign}${symbol}${grouped}`;
}

export function shortDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function longDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function titleCase(s?: string | null): string {
  if (!s) return "";
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
