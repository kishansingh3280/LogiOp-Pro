export type BullionRoute = "IN_TO_TH" | "TH_TO_IN";

export type BullionStatus =
  | "purchased_in"       // Phase 1: currency bought in India, not yet assigned
  | "in_transit_to_bkk"  // Phase 1: assigned to trip, in transit
  | "deposited_bkk"      // Phase 2: cash deposited at BKK
  | "gold_secured"       // Phase 2: gold bought and secured
  | "in_transit_to_in"   // Phase 3: assigned to return trip
  | "arrived_in"         // Phase 3: arrived India
  | "sold";              // Phase 3: final sale complete

export type Phase = 1 | 2 | 3;

export interface CarrierTrip {
  id: string;
  date: string;                // YYYY-MM-DD
  route: BullionRoute;
  carrier_party_id?: string | null;   // link to /api/parties (optional)
  carrier_name?: string;              // fallback if no party linked
  available_slots: number;            // capacity for bags/batches
  notes?: string;
  created_at: string;
}

export interface BullionBatch {
  id: string;
  batch_no: string;
  status: BullionStatus;

  // Phase 1 (India buy)
  purchase_amount_inr: number;
  purchase_date: string;
  trip_id_to_bkk?: string | null;

  // Phase 2 (BKK deposit + gold)
  bkk_deposit_amount_thb?: number;
  gold_weight_g?: number;
  gold_price_thb_per_g?: number;
  gold_purchase_date?: string;

  // Phase 3 (return + final sale)
  trip_id_to_in?: string | null;
  final_sale_amount_inr?: number;
  final_sale_date?: string;

  notes?: string;
  created_at: string;
}

export const STATUS_LABEL: Record<BullionStatus, string> = {
  purchased_in: "Purchased · India",
  in_transit_to_bkk: "In transit → BKK",
  deposited_bkk: "Deposited · BKK",
  gold_secured: "Gold secured",
  in_transit_to_in: "In transit → India",
  arrived_in: "Arrived · India",
  sold: "Sold",
};

export const STATUS_PHASE: Record<BullionStatus, Phase> = {
  purchased_in: 1,
  in_transit_to_bkk: 1,
  deposited_bkk: 2,
  gold_secured: 2,
  in_transit_to_in: 3,
  arrived_in: 3,
  sold: 3,
};
