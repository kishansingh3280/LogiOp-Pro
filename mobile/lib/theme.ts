export const colors = {
  bg: "#f3efe6",
  panel: "#fffdf8",
  ink: "#1a2b2a",
  muted: "#5f6f6c",
  line: "#d9d2c4",
  accent: "#0f6e56",
  accentSoft: "#d8efe6",
  accentInk: "#0a4d3c",
  inr: "#1f5f8b",
  thb: "#c45c26",
  danger: "#b42318",
  ok: "#067647",
  warn: "#b54708",
};

export type Currency = "INR" | "THB";

export function formatMoney(amount: number, currency: Currency): string {
  const symbol = currency === "INR" ? "₹" : "฿";
  return `${symbol}${Number(amount).toLocaleString("en-IN", {
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
  CUSTOMER_IN: "India customer",
  CUSTOMER_TH: "Thai customer",
  CARRY_PERSON: "Carry person",
  AGENT: "Agent",
  OTHER: "Other",
};
