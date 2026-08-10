/**
 * forex — thin client for the frankfurter.app FX-rates API.
 *
 * frankfurter is a free, no-auth, ECB-backed FX API. We use two endpoints:
 *   • /latest?from={base}&to={quote}   → current spot rate
 *   • /{from_date}..{to_date}?from=…&to=…  → daily timeseries for sparkline
 *
 * Values are cached in-memory for 15 min so the dashboard doesn't hammer
 * the API on every visit. Historical timeseries is cached for 24 h.
 */
export type FxPair = { base: string; quote: string };
export type FxSpot = { rate: number; date: string };
export type FxSeries = {
  base: string;
  quote: string;
  points: { date: string; rate: number }[]; // oldest → newest
  start: number;
  end: number;
  min: number;
  max: number;
  change_pct: number; // (end-start)/start * 100
};

const SPOT_TTL_MS = 15 * 60 * 1000;
const SERIES_TTL_MS = 24 * 60 * 60 * 1000;

type SpotCacheEntry = { at: number; data: FxSpot };
type SeriesCacheEntry = { at: number; data: FxSeries };

const spotCache = new Map<string, SpotCacheEntry>();
const seriesCache = new Map<string, SeriesCacheEntry>();

const spotKey = (p: FxPair) => `${p.base}_${p.quote}`;
const seriesKey = (p: FxPair, days: number) => `${p.base}_${p.quote}_${days}`;

/** Fetch the latest spot rate for a currency pair. */
export async function fetchSpot(pair: FxPair): Promise<FxSpot> {
  const k = spotKey(pair);
  const hit = spotCache.get(k);
  if (hit && Date.now() - hit.at < SPOT_TTL_MS) return hit.data;

  const url = `https://api.frankfurter.dev/v1/latest?base=${pair.base}&symbols=${pair.quote}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  const json = (await res.json()) as { date: string; rates: Record<string, number> };
  const rate = json?.rates?.[pair.quote];
  if (typeof rate !== "number") throw new Error("Missing rate in FX response");
  const data: FxSpot = { rate, date: json.date };
  spotCache.set(k, { at: Date.now(), data });
  return data;
}

/** Fetch the last `days` business days of daily rates (excl. weekends). */
export async function fetchSeries(pair: FxPair, days = 30): Promise<FxSeries> {
  const k = seriesKey(pair, days);
  const hit = seriesCache.get(k);
  if (hit && Date.now() - hit.at < SERIES_TTL_MS) return hit.data;

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `https://api.frankfurter.dev/v1/${fmt(start)}..${fmt(end)}?base=${pair.base}&symbols=${pair.quote}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Frankfurter series ${res.status}`);
  const json = (await res.json()) as { rates: Record<string, Record<string, number>> };

  const points = Object.entries(json.rates || {})
    .map(([date, obj]) => ({ date, rate: obj[pair.quote] }))
    .filter((p) => typeof p.rate === "number")
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (!points.length) throw new Error("Empty FX timeseries");

  const rates = points.map((p) => p.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const first = points[0].rate;
  const last = points[points.length - 1].rate;
  const data: FxSeries = {
    base: pair.base,
    quote: pair.quote,
    points,
    start: first,
    end: last,
    min,
    max,
    change_pct: first ? ((last - first) / first) * 100 : 0,
  };
  seriesCache.set(k, { at: Date.now(), data });
  return data;
}

/** Convenience: fetch both spot + series in parallel. */
export async function fetchFxCard(pair: FxPair, days = 30) {
  const [spot, series] = await Promise.all([fetchSpot(pair), fetchSeries(pair, days)]);
  return { spot, series };
}
