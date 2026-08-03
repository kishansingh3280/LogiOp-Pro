export type Currency = "INR" | "THB";
export type LedgerDirection = "YOU_GAVE" | "YOU_GOT";

export type PartyRateFields = {
  exchangeRate: number | null;
  quoteMode: string;
};

export function computeBalance(youGave: number, youGot: number): number {
  return youGave - youGot;
}

export function formatMoney(amount: number, currency: Currency): string {
  const symbol = currency === "INR" ? "₹" : "฿";
  return `${symbol}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatBalanceLabel(balance: number, currency: Currency): string {
  const abs = Math.abs(balance);
  if (Math.abs(balance) < 0.005) return `Settled (${formatMoney(0, currency)})`;
  if (balance > 0) return `To receive ${formatMoney(abs, currency)}`;
  return `To pay ${formatMoney(abs, currency)}`;
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rateInrPerThb: number
): number {
  if (from === to) return amount;
  if (from === "THB" && to === "INR") return amount * rateInrPerThb;
  if (from === "INR" && to === "THB") return amount / rateInrPerThb;
  return amount;
}

export function partyRateInrPerThb(party: PartyRateFields): number | null {
  if (party.exchangeRate == null) return null;
  if (party.quoteMode === "THB_PER_INR") {
    return party.exchangeRate === 0 ? null : 1 / party.exchangeRate;
  }
  return party.exchangeRate;
}

export function directionLabel(direction: LedgerDirection): string {
  return direction === "YOU_GAVE" ? "You gave" : "You got";
}

export const BAG_STATUS_LABELS: Record<string, string> = {
  CREATED: "Created",
  AT_WAREHOUSE: "At warehouse",
  ASSIGNED: "Assigned",
  IN_TRANSIT: "In transit",
  ARRIVED: "Arrived",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  LOST: "Lost",
};

export const TRANSPORT_MODE_LABELS: Record<string, string> = {
  AIR: "Air cargo",
  SEA: "Sea cargo",
  LAND: "Land cargo",
  CARRY_PERSON: "Carry person",
};

export const PARTY_TYPE_LABELS: Record<string, string> = {
  LOGISTIC_CUSTOMER: "Logistic customer",
  BUYER: "Buyer",
  CARRIER: "Carrier",
  TRANSPORTER: "Transporter",
  INDIVIDUAL: "Individual",
};

/** Short help text shown when adding/editing a party */
export const PARTY_TYPE_DESCRIPTIONS: Record<string, string> = {
  LOGISTIC_CUSTOMER:
    "Customers who give you goods to transport India ↔ Thailand",
  BUYER: "Direct buyers of your own products (invoices & orders coming later)",
  CARRIER: "Carry persons who transport your bags by hand",
  TRANSPORTER: "Companies that transport your goods (air / sea / land)",
  INDIVIDUAL: "Personal ledger with people (business or personal)",
};

/** Parties who can own a shipment (billing / goods owner) */
export const SHIPMENT_PARTY_TYPES = ["LOGISTIC_CUSTOMER", "BUYER"] as const;

/** Parties who can receive a bag (end customer / deliver-to) */
export const DELIVER_TO_PARTY_TYPES = [
  "LOGISTIC_CUSTOMER",
  "BUYER",
  "INDIVIDUAL",
] as const;

/** Parties who can be assigned as transport carriers */
export const TRANSPORT_PARTY_TYPES = ["CARRIER", "TRANSPORTER"] as const;

export const BAG_STATUS_FLOW = [
  "CREATED",
  "AT_WAREHOUSE",
  "ASSIGNED",
  "IN_TRANSIT",
  "ARRIVED",
  "DELIVERED",
] as const;
