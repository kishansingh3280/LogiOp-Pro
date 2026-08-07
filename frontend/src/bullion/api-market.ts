/**
 * Live market data for the reference ticker widget.
 *
 * FX rates come from exchangerate.host (free, no key required).
 * Gold spot prices come from goldapi.io. Both are aggressively cached
 * (5 min TTL) since the free GoldAPI tier is only 100 req/day.
 *
 * Every fetcher returns a `mocked: true` snapshot when the network / key
 * fails, so the ticker never breaks the UI.
 */

const GOLD_KEY = process.env.EXPO_PUBLIC_GOLDAPI_KEY;
const FX_BASE = "https://open.er-api.com/v6";
const GOLD_BASE = "https://www.goldapi.io/api";
const TTL_MS = 5 * 60 * 1000; // 5 min
const OZ_PER_GRAM = 1 / 31.1035;

export interface MarketSnapshot {
  usd_inr: number;
  usd_thb: number;
  gold_usd_per_oz: number;
  gold_inr_per_gram: number;
  gold_thb_per_gram: number;
  fetched_at: string;
  fx_mocked: boolean;
  gold_mocked: boolean;
}

let cache: { data: MarketSnapshot; expires: number } | null = null;
let inflight: Promise<MarketSnapshot> | null = null;

const MOCK_FX = { usd_inr: 84.15, usd_thb: 34.65 };
const MOCK_GOLD_OZ = 2680;

async function fetchFx(): Promise<{ usd_inr: number; usd_thb: number; mocked: boolean }> {
  try {
    const res = await fetch(`${FX_BASE}/latest/USD`);
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
    const json = await res.json();
    const rates = json?.rates || {};
    const inr = Number(rates.INR);
    const thb = Number(rates.THB);
    if (!Number.isFinite(inr) || !Number.isFinite(thb)) throw new Error("Bad FX payload");
    return { usd_inr: inr, usd_thb: thb, mocked: false };
  } catch (e) {
    console.warn("FX fetch failed, using mock:", (e as Error).message);
    return { ...MOCK_FX, mocked: true };
  }
}

async function fetchGoldOz(): Promise<{ oz: number; mocked: boolean }> {
  try {
    if (!GOLD_KEY) throw new Error("Missing GOLDAPI key");
    const res = await fetch(`${GOLD_BASE}/XAU/USD`, {
      method: "GET",
      headers: { "x-access-token": GOLD_KEY, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`GoldAPI HTTP ${res.status}`);
    const json = await res.json();
    const oz = Number(json?.price);
    if (!Number.isFinite(oz)) throw new Error("Bad gold payload");
    return { oz, mocked: false };
  } catch (e) {
    console.warn("Gold fetch failed, using mock:", (e as Error).message);
    return { oz: MOCK_GOLD_OZ, mocked: true };
  }
}

/**
 * Fetch a fresh market snapshot (or return the cached one if still valid).
 * Concurrent callers all share the same underlying promise.
 */
export async function fetchMarket(force = false): Promise<MarketSnapshot> {
  const now = Date.now();
  if (!force && cache && cache.expires > now) return cache.data;
  if (inflight) return inflight;

  inflight = (async () => {
    const [fx, gold] = await Promise.all([fetchFx(), fetchGoldOz()]);
    const gramInUsd = gold.oz * OZ_PER_GRAM;
    const snap: MarketSnapshot = {
      usd_inr: fx.usd_inr,
      usd_thb: fx.usd_thb,
      gold_usd_per_oz: gold.oz,
      gold_inr_per_gram: gramInUsd * fx.usd_inr,
      gold_thb_per_gram: gramInUsd * fx.usd_thb,
      fetched_at: new Date().toISOString(),
      fx_mocked: fx.mocked,
      gold_mocked: gold.mocked,
    };
    cache = { data: snap, expires: Date.now() + TTL_MS };
    return snap;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
