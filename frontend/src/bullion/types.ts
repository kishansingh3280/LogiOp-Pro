export type BullionRoute = "IN_TO_TH" | "TH_TO_IN";
export type CarryType = "currency" | "gold";
export type TxnStatus = "open" | "in_transit" | "completed";
export type GoldUnit = "baht" | "grams";

// 1 Thai baht of gold = 15.244 g (industry standard).
export const GRAMS_PER_BAHT = 15.244;
export const CARRIER_RATE_CURRENCY = 500;   // INR per $1000 foreign
export const CARRIER_RATE_GOLD = 2500;      // INR per baht of gold

export interface CarrierTrip {
  id: string;
  date: string;                       // YYYY-MM-DD
  route: BullionRoute;
  carrier_party_id?: string | null;
  carrier_name?: string;
  available_slots: number;
  notes?: string;
  created_at: string;
}

export interface BullionTxn {
  id: string;
  txn_no: string;                     // TXN-001
  type: CarryType;
  status: TxnStatus;
  trip_id?: string | null;            // Carrier trip link
  notes?: string;
  created_at: string;

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

export function computeCarrierCharge(t: BullionTxn): number {
  if (t.type === "currency") {
    const amt = t.currency_amount || 0;
    return Math.round(CARRIER_RATE_CURRENCY * (amt / 1000));
  }
  // gold
  const amt = t.gold_amount || 0;
  const baht = t.gold_unit === "grams" ? amt / GRAMS_PER_BAHT : amt;
  return Math.round(CARRIER_RATE_GOLD * baht);
}

export function computeTxn(t: BullionTxn): TxnCalc {
  const carrier_charge_inr = computeCarrierCharge(t);

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
