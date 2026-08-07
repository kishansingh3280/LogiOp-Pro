export type BullionRoute = "IN_TO_TH" | "TH_TO_IN";
export type CarryType = "currency" | "gold";
export type TxnStatus = "open" | "in_transit" | "completed";
export type GoldUnit = "baht" | "grams";

// 1 Thai baht of gold = 15.244 g (industry standard).
export const GRAMS_PER_BAHT = 15.244;
/** @deprecated Legacy defaults — real values now come from `src/bullion/rates.ts`. */
export const CARRIER_RATE_CURRENCY = 500;   // INR per $1000 foreign
/** @deprecated Legacy defaults — real values now come from `src/bullion/rates.ts`. */
export const CARRIER_RATE_GOLD = 2500;      // INR per baht of gold

export interface CarrierTrip {
  id: string;
  date: string;                       // YYYY-MM-DD
  route: BullionRoute;
  carrier_party_id?: string | null;
  carrier_name?: string;
  airline_code?: string | null;       // IATA 2-letter code (e.g. "TG")
  flight_number?: string | null;      // free-text, e.g. "TG-317"
  available_weight_kg: number;        // Total capacity in kilograms
  /** @deprecated Legacy field – kept for backward compat with older stored trips. */
  available_slots?: number;
  notes?: string;
  created_at: string;
}

export interface BullionTxn {
  id: string;
  txn_no: string;                     // TXN-001
  type: CarryType;
  status: TxnStatus;
  trip_id?: string | null;            // Carrier trip link — fully optional
  notes?: string;
  created_at: string;

  // Physical weight this txn consumes from a carrier trip's capacity (kg).
  // Optional — currency carries usually leave this blank / 0.
  weight_kg?: number;

  // ---- Ledger sync tracking ----
  /** ID of the ledger entry we auto-posted for the carrier fee (once). */
  ledger_entry_id?: string | null;
  /** ISO date the carrier fee was posted to the ledger. */
  ledger_posted_at?: string | null;

  // ---- Rate-snapshot lock ----
  // Snapshots the carrier rate that applied at the moment the txn was
  // created. When present we compute the carrier fee off THIS number, not
  // the live rate, so historical entries never move because someone
  // updated the global rate later. Undefined for legacy rows created
  // before rate-history was introduced — those fall back to live rates.
  rate_snapshot_currency_per_1000?: number;
  rate_snapshot_gold_per_baht?: number;
  /**
   * When the snapshot was taken (ISO). Purely informational — the numbers
   * above are what drives the math. Also stamped into the ledger entry
   * note so downstream auditors can trace what rate was in effect.
   */
  rate_snapshot_at?: string;

  // ---- Currency carry ----
  currency?: string;                  // USD, AED, SGD, OTHER — free text allowed
  currency_amount?: number;           // foreign units bought
  purchase_rate_inr?: number;         // INR per foreign unit (buy price in India)
  exchange_rate_thb?: number;         // THB per foreign unit (BKK exchanger)
  transfer_rate_inr_per_thb?: number; // INR per THB (only when returning INR w/o gold)

  // ---- Gold carry ----
  gold_amount?: number;               // in gold_unit
  gold_unit?: GoldUnit;
  gold_purchase_thb?: number;         // total THB paid in BKK
  gold_cost_inr?: number;             // INR equivalent of the THB cost
                                      // (from source-currency-carry or manual)
  gold_sale_inr?: number;             // total INR received selling in India
}

export interface TxnCalc {
  // Common
  carrier_charge_inr: number;
  // Currency
  inr_spent?: number;
  thb_received?: number;
  inr_returned?: number;              // when transferring back w/o gold
  // Gold
  baht_equiv?: number;                // gold weight in baht units
  inr_cost?: number;                  // cost in INR (from gold_cost_inr)
  // Profit
  profit_inr: number | null;          // null when insufficient inputs
  can_settle: boolean;                // enough fields present to close
}

export function computeCarrierCharge(
  t: BullionTxn,
  rates?: { currency_rate_per_1000: number; gold_rate_per_baht: number },
): number {
  // Prefer the per-txn snapshot when present — this keeps historical
  // entries locked at the rate that applied on the day they were
  // created, even if the global rate has since changed. Legacy rows
  // (no snapshot) fall back to the live rate for backward-compat.
  const currencyRate =
    typeof t.rate_snapshot_currency_per_1000 === "number"
      ? t.rate_snapshot_currency_per_1000
      : rates?.currency_rate_per_1000 ?? CARRIER_RATE_CURRENCY;
  const goldRate =
    typeof t.rate_snapshot_gold_per_baht === "number"
      ? t.rate_snapshot_gold_per_baht
      : rates?.gold_rate_per_baht ?? CARRIER_RATE_GOLD;
  if (t.type === "currency") {
    const amt = t.currency_amount || 0;
    return Math.round(currencyRate * (amt / 1000));
  }
  // gold
  const amt = t.gold_amount || 0;
  const baht = t.gold_unit === "grams" ? amt / GRAMS_PER_BAHT : amt;
  return Math.round(goldRate * baht);
}

export function computeTxn(
  t: BullionTxn,
  rates?: { currency_rate_per_1000: number; gold_rate_per_baht: number },
): TxnCalc {
  const carrier_charge_inr = computeCarrierCharge(t, rates);

  if (t.type === "currency") {
    const amt = t.currency_amount || 0;
    const inr_spent = amt * (t.purchase_rate_inr || 0);
    const thb_received = amt * (t.exchange_rate_thb || 0);
    const has_transfer = !!t.transfer_rate_inr_per_thb;
    const inr_returned = has_transfer
      ? thb_received * (t.transfer_rate_inr_per_thb || 0)
      : undefined;
    const profit_inr =
      has_transfer && inr_returned !== undefined
        ? inr_returned - inr_spent - carrier_charge_inr
        : null;
    return {
      carrier_charge_inr,
      inr_spent: inr_spent || undefined,
      thb_received: thb_received || undefined,
      inr_returned,
      profit_inr,
      can_settle: has_transfer && amt > 0,
    };
  }

  // gold
  const amt = t.gold_amount || 0;
  const baht_equiv = t.gold_unit === "grams" ? amt / GRAMS_PER_BAHT : amt;
  const inr_cost = t.gold_cost_inr ?? 0;
  const sale = t.gold_sale_inr ?? 0;
  const has_sale = !!t.gold_sale_inr;
  const has_cost = !!t.gold_cost_inr;
  const profit_inr =
    has_sale && has_cost ? sale - inr_cost - carrier_charge_inr : null;
  return {
    carrier_charge_inr,
    baht_equiv: baht_equiv || undefined,
    inr_cost: inr_cost || undefined,
    profit_inr,
    can_settle: has_sale && has_cost,
  };
}

export const STATUS_LABEL: Record<TxnStatus, string> = {
  open: "Open",
  in_transit: "In transit",
  completed: "Completed",
};

export const STATUS_COLOR: Record<TxnStatus, "warn" | "info" | "ok"> = {
  open: "warn",
  in_transit: "info",
  completed: "ok",
};

/**
 * Backwards-compatible capacity reader.
 * Older stored trips only had `available_slots` (a count). New trips use
 * `available_weight_kg`. This helper prefers the new field and falls back
 * to the legacy value so persisted data keeps working after the rename.
 */
export function tripCapacityKg(t: Pick<CarrierTrip, "available_weight_kg" | "available_slots">): number {
  if (typeof t.available_weight_kg === "number" && !Number.isNaN(t.available_weight_kg)) {
    return t.available_weight_kg;
  }
  if (typeof t.available_slots === "number" && !Number.isNaN(t.available_slots)) {
    return t.available_slots;
  }
  return 0;
}
