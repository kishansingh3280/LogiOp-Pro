// Domain types matching the live backend at logistics-hub-1349.emergent.host
export type Direction = "IN_TO_TH" | "TH_TO_IN";
export type ShipmentMode = "air" | "sea" | "land" | "hand_carry";
export type ShipmentStatus = "pending" | "in_transit" | "warehouse_arrived" | "delivered";
export type PartyRole = "customer" | "end_customer" | "supplier" | "carrier" | "vendor" | "other";
export type Currency = "INR" | "THB";

export interface RateCardEntry {
  rate_per_kg: number;
  currency: Currency;
}

export interface Party {
  id: string;
  name: string;
  role: PartyRole;
  country: string;
  default_currency: Currency;
  parent_party_id?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  lat?: string | null;
  lng?: string | null;
  gstin?: string | null;
  opening_balance_inr: number;
  opening_balance_thb: number;
  last_quoted_rate?: number | null;
  rate_card?: Record<string, RateCardEntry>;
  default_charge?: number;
  default_charge_type?: string;
  default_charge_currency?: Currency;
  /**
   * ISO date. Every ledger entry with `date <= verified_up_to` is treated
   * as reconciled — the statement stamps a ✅ badge next to those rows.
   */
  verified_up_to?: string | null;
  created_at: string;
}

export interface Shipment {
  id: string;
  consignment_no: string;
  party_id: string;
  direction: Direction;
  mode: ShipmentMode;
  origin: string;
  destination: string;
  goods?: string | null;
  bag_count: number;
  weight_kg: number;
  freight: number;
  freight_currency: Currency;
  forex_rate: number;
  carrier_party_id?: string | null;
  carrier_charge?: number;
  carrier_charge_type?: string;
  carrier_currency?: Currency;
  status: ShipmentStatus;
  dispatch_date?: string | null;
  dispatched_at?: string | null;
  in_transit_at?: string | null;
  warehouse_arrived_at?: string | null;
  delivered_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  rate: number;
  unit?: string;
  item_id?: string | null;
  buying_price?: number | null;
}

export interface Invoice {
  id: string;
  number: string;
  party_id: string;
  shipment_id?: string | null;
  date: string;
  due_date?: string | null;
  currency: Currency;
  items: InvoiceLine[];
  tax_percent: number;
  notes?: string | null;
  status: "draft" | "sent" | "paid" | "cancelled";
  subtotal: number;
  tax_amount: number;
  total: number;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  party_id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  /** ISO currency — defaults to INR when omitted on legacy rows. */
  currency?: Currency;
  ref_type?: string | null;
  ref_id?: string | null;
  created_at: string;
}

export interface Item {
  id: string;
  name: string;
  unit: string;
  buying_price: number;
  selling_price: number;
  category?: string | null;
  hs_code?: string | null;
  default_weight_kg?: number | null;
  notes?: string | null;
  // Catalog extensions — used by the AI Product Catalog module and
  // Wingman assistant. `photo_url` accepts data-uri (base64) or remote
  // URL; `tags` is a free-text list for fuzzy AI search; `supplier_party_id`
  // ties the item back to a Party in the "supplier" role.
  photo_url?: string | null;
  description?: string | null;
  supplier_party_id?: string | null;
  tags?: string[] | null;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  city: string;
  lat?: string | null;
  lng?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  is_default_pickup: boolean;
  notes?: string | null;
  created_at: string;
}

export interface DashboardStats {
  shipments: {
    total: number;
    in_transit: number;
    delivered: number;
    pending: number;
    warehouse_arrived: number;
  };
  revenue: { inr: number; thb: number };
  outstanding: { inr: number; thb: number };
  forex_volume: { thb: number; inr: number };
  revenue_trend: { month: string; revenue: number }[];
  modes: { mode: string; count: number }[];
}

export interface WarehouseSummary {
  current_kg: number;
  capacity_kg: number;
  current_bags: number;
  undelivered_bags: number;
  by_end_customer: { name: string; bags: number }[];
  booked_deliveries: number;
  pending_deliveries: number;
  pct: number;
}

export interface LedgerSummary {
  receivable: { inr: number; thb: number };
  payable: { inr: number; thb: number };
  top_get: { id: string; name: string; inr: number; thb: number }[];
  top_give: { id: string; name: string; inr: number; thb: number }[];
}

export interface ShipmentBag {
  id: string;
  bag_no: string;
  shipment_id: string;
  end_customer_id?: string | null;
  items: {
    description: string;
    item_id?: string | null;
    quantity: number;
    unit?: string;
  }[];
  weight_kg: number;
  charge: number;
  notes?: string | null;
  status?: string;
  created_at?: string;
}

export interface LalamoveOrder {
  id: string;
  order_id?: string;
  status?: string;
  shipment_id?: string;
  created_at?: string;
  [k: string]: unknown;
}
