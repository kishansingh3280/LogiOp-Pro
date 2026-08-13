/**
 * Papa mode — simplified Hindi UI for the family principal.
 *
 * When Papa (`bsingh` / role: "Papa") is signed in, the whole app
 * flips a few key labels to friendlier Hindi. The rest of the UI
 * (structure, navigation, colors) stays untouched by design — we're
 * only changing the words, not the layout.
 */
import { useMemo } from "react";
import { useAuth, type AuthUser } from "./auth-context";

export type UiVoice = {
  greet: string;
  overview: string;
  shipments: string;
  parties: string;
  invoices: string;
  more: string;
  customerWillPay: string;
  youPayCarrier: string;
  bangkokWarehouse: string;
  delivered: string;
  inTransit: string;
  pending: string;
  ledger: string;
  statement: string;
  vault: string;
  isPapa: boolean;
};

const ENGLISH: UiVoice = {
  greet: "Welcome back",
  overview: "Overview",
  shipments: "Shipments",
  parties: "Parties",
  invoices: "Invoices",
  more: "More",
  customerWillPay: "Aapko Lena Hai",
  youPayCarrier: "Aapko Dena Hai",
  bangkokWarehouse: "Bangkok warehouse",
  delivered: "Delivered",
  inTransit: "In transit",
  pending: "Pending",
  ledger: "Ledger",
  statement: "Statement",
  vault: "Vault",
  isPapa: false,
};

const PAPA_HINDI: UiVoice = {
  greet: "Namaste",
  overview: "Ghar ka Hisaab",
  shipments: "Parcel",
  parties: "Log",
  invoices: "Bill",
  more: "Aur",
  customerWillPay: "Aapko Lena Hai",
  youPayCarrier: "Aapko Dena Hai",
  bangkokWarehouse: "Bangkok Godaam",
  delivered: "Pahoncha diya",
  inTransit: "Raaste mein",
  pending: "Baaki hai",
  ledger: "Bahi",
  statement: "Bahi Statement",
  vault: "Tijori",
  isPapa: true,
};

export function isPapa(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "Papa") return true;
  const uname = (user.username || "").toLowerCase();
  return uname === "bsingh";
}

export function useUiVoice(): UiVoice {
  const { user } = useAuth();
  return useMemo(() => (isPapa(user) ? PAPA_HINDI : ENGLISH), [user]);
}

export function usePapaMode(): boolean {
  const { user } = useAuth();
  return useMemo(() => isPapa(user), [user]);
}
