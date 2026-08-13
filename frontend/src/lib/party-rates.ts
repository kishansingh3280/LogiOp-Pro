/**
 * fetchPartyRates — Fix I (Phase 7).
 *
 * Small shared helper used by every form that references a party
 * (shipments, trips, invoices). When a party is picked we hit its
 * /meta overlay + party doc and normalise every known rate field
 * into a single canonical shape so callers can auto-fill their
 * inputs without knowing where each number lives.
 *
 * The helper NEVER throws — a missing/empty response is returned
 * as an empty rate object so the caller falls back to blank inputs
 * (user can then type manually).
 */
import { apiGet } from "@/src/lib/api";

export type PartyRates = {
  // Carrier per-kg freight rate (INR unless per_kg_ccy says otherwise).
  per_kg?: number;
  per_kg_ccy?: "INR" | "THB";
  // Freight flat charge (customer-facing).
  freight?: number;
  freight_ccy?: "INR" | "THB";
  // Bullion / trip-specific carry rates.
  gold_per_baht?: number;    // INR paid per baht-weight of gold carried
  currency_per_1000?: number; // INR paid per $1,000 carried
  // Last invoice line rate we quoted this party (from party doc).
  last_quoted_rate?: number;
  last_quoted_ccy?: "INR" | "THB";
};

type PartyDoc = {
  id?: string;
  name?: string;
  role?: string;
  default_currency?: "INR" | "THB";
  last_quoted_rate?: number | string;
  last_quoted_currency?: "INR" | "THB";
};

type PartyMeta = {
  party_id?: string;
  carrier_rates?: Record<string, unknown>;
  freight_rates?: Record<string, unknown>;
};

const _num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const _ccy = (v: unknown, fallback: "INR" | "THB" = "INR"): "INR" | "THB" =>
  (v === "THB" ? "THB" : v === "INR" ? "INR" : fallback);

export async function fetchPartyRates(partyId: string): Promise<PartyRates> {
  if (!partyId) return {};
  const [party, meta] = await Promise.all([
    apiGet<PartyDoc>(`/api/parties/${partyId}`).catch(() => null as PartyDoc | null),
    apiGet<PartyMeta>(`/api/parties/${partyId}/meta`).catch(() => null as PartyMeta | null),
  ]);

  const out: PartyRates = {};
  const defCcy = _ccy(party?.default_currency);

  // 1) Carrier rates overlay (freight per_kg, gold, currency).
  const cr = (meta?.carrier_rates || {}) as Record<string, unknown>;
  const per_kg = _num(cr.per_kg);
  if (per_kg !== undefined) {
    out.per_kg = per_kg;
    out.per_kg_ccy = _ccy(cr.per_kg_ccy || cr.currency, defCcy);
  }
  const goldPerBaht = _num(cr.per_baht ?? cr.gold_per_baht);
  if (goldPerBaht !== undefined) out.gold_per_baht = goldPerBaht;
  const currencyPer1000 = _num(cr.per_1000_usd ?? cr.currency_per_1000);
  if (currencyPer1000 !== undefined) out.currency_per_1000 = currencyPer1000;

  // 2) Freight rates overlay (customer-facing freight flat / per-kg).
  const fr = (meta?.freight_rates || {}) as Record<string, unknown>;
  const freight = _num(fr.freight ?? fr.amount);
  if (freight !== undefined) {
    out.freight = freight;
    out.freight_ccy = _ccy(fr.currency || fr.freight_ccy, defCcy);
  } else if (per_kg !== undefined) {
    // Fallback: customer-facing rate mirrors carrier per-kg unless
    // an explicit freight_rates block overrode it.
    out.freight = per_kg;
    out.freight_ccy = out.per_kg_ccy;
  }

  // 3) Last quoted rate from the party doc (invoice history).
  const lqr = _num(party?.last_quoted_rate);
  if (lqr !== undefined) {
    out.last_quoted_rate = lqr;
    out.last_quoted_ccy = _ccy(party?.last_quoted_currency, defCcy);
  }

  return out;
}

/**
 * computeCarrierCharge — Convenience used by shipment bags:
 *   charge = per_kg × weight_kg
 * Returns undefined when per_kg is missing so the caller can leave
 * the input blank (no misleading zero).
 */
export function computeCarrierCharge(
  rates: PartyRates | null | undefined,
  weightKg: number,
): { amount: number; currency: "INR" | "THB" } | null {
  if (!rates || rates.per_kg === undefined) return null;
  const w = Number(weightKg) || 0;
  if (w <= 0) return null;
  return { amount: rates.per_kg * w, currency: rates.per_kg_ccy || "INR" };
}
