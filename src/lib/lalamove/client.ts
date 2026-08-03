import { createHmac, randomUUID } from "crypto";

export type LalamoveEnv = "sandbox" | "production";

export type LalamoveCreds = {
  apiKey: string;
  apiSecret: string;
  market: string;
  sandbox: boolean;
};

export type LalamoveStop = {
  coordinates: { lat: string; lng: string };
  address: string;
};

export type LalamoveQuoteInput = {
  serviceType: string;
  language: string;
  stops: LalamoveStop[];
  specialRequests?: string[];
  isRouteOptimized?: boolean;
  scheduleAt?: string;
  item?: {
    quantity?: string;
    weight?: string;
    categories?: string[];
    handlingInstructions?: string[];
  };
};

export type LalamoveOrderInput = {
  quotationId: string;
  sender: { stopId: string; name: string; phone: string };
  recipients: Array<{
    stopId: string;
    name: string;
    phone: string;
    remarks?: string;
  }>;
  isPODEnabled?: boolean;
  metadata?: Record<string, string>;
};

export class LalamoveApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function baseUrl(sandbox: boolean) {
  return sandbox
    ? "https://rest.sandbox.lalamove.com"
    : "https://rest.lalamove.com";
}

/** Market header expects country code (TH, HK, …). Accept TH_BKK / TH BKK too. */
export function normalizeMarket(market: string): string {
  const m = (market || "TH").trim().toUpperCase().replace(/\s+/g, "_");
  if (m.includes("_")) return m.split("_")[0] || "TH";
  if (m.includes(" ")) return m.split(" ")[0] || "TH";
  return m || "TH";
}

export function defaultLanguage(market: string): string {
  const m = normalizeMarket(market);
  const map: Record<string, string> = {
    TH: "en_TH",
    HK: "en_HK",
    SG: "en_SG",
    MY: "en_MY",
    PH: "en_PH",
    ID: "en_ID",
    VN: "en_VN",
    TW: "en_TW",
    JP: "en_JP",
    IN: "en_IN",
  };
  return map[m] || `en_${m}`;
}

/** Best-effort E.164 for TH / IN numbers used in LogiOp. */
export function toE164(phone: string | null | undefined, market: string): string {
  const raw = (phone || "").trim();
  if (!raw) return normalizeMarket(market) === "IN" ? "+919999999999" : "+66900000000";
  if (raw.startsWith("+")) return raw.replace(/[^\d+]/g, "");
  const digits = raw.replace(/\D/g, "");
  const m = normalizeMarket(market);
  if (m === "TH") {
    if (digits.startsWith("66")) return `+${digits}`;
    if (digits.startsWith("0")) return `+66${digits.slice(1)}`;
    return `+66${digits}`;
  }
  if (m === "IN") {
    if (digits.startsWith("91")) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+91${digits}`;
  }
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function mapProviderStatus(status: string | undefined | null): string {
  const s = (status || "").toUpperCase();
  if (s === "COMPLETED") return "COMPLETED";
  if (s === "CANCELED" || s === "CANCELLED" || s === "REJECTED" || s === "EXPIRED")
    return "CANCELLED";
  if (
    s === "ASSIGNING_DRIVER" ||
    s === "ON_GOING" ||
    s === "PICKED_UP" ||
    s === "MATCHED"
  )
    return "BOOKED";
  return "BOOKED";
}

function sign(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  body: string
) {
  const raw = `${timestamp}\r\n${method.toUpperCase()}\r\n${path}\r\n\r\n${body}`;
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export async function lalamoveRequest<T = unknown>(
  creds: LalamoveCreds,
  method: string,
  path: string,
  bodyObj?: unknown
): Promise<T> {
  const market = normalizeMarket(creds.market);
  const timestamp = Date.now().toString();
  const body = bodyObj != null ? JSON.stringify(bodyObj) : "";
  const signature = sign(creds.apiSecret, timestamp, method, path, body);
  const token = `${creds.apiKey}:${timestamp}:${signature}`;
  const url = `${baseUrl(creds.sandbox)}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `hmac ${token}`,
      Market: market,
      "Content-Type": "application/json",
      "Request-ID": randomUUID(),
    },
    body: body || undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const errObj = json as {
      message?: string;
      errors?: Array<{ message?: string; detail?: string; id?: string }>;
    } | null;
    const msg =
      errObj?.errors?.[0]?.detail ||
      errObj?.errors?.[0]?.message ||
      errObj?.message ||
      `Lalamove error ${res.status}`;
    throw new LalamoveApiError(res.status, msg, json);
  }

  return json as T;
}

export async function getCities(creds: LalamoveCreds) {
  return lalamoveRequest<{ data: unknown[] }>(creds, "GET", "/v3/cities");
}

export async function createQuotation(creds: LalamoveCreds, input: LalamoveQuoteInput) {
  return lalamoveRequest<{ data: Record<string, unknown> }>(creds, "POST", "/v3/quotations", {
    data: input,
  });
}

export async function placeOrder(creds: LalamoveCreds, input: LalamoveOrderInput) {
  return lalamoveRequest<{ data: Record<string, unknown> }>(creds, "POST", "/v3/orders", {
    data: input,
  });
}

export async function getOrder(creds: LalamoveCreds, orderId: string) {
  return lalamoveRequest<{ data: Record<string, unknown> }>(
    creds,
    "GET",
    `/v3/orders/${encodeURIComponent(orderId)}`
  );
}

export async function cancelOrder(creds: LalamoveCreds, orderId: string) {
  return lalamoveRequest<void>(
    creds,
    "DELETE",
    `/v3/orders/${encodeURIComponent(orderId)}`
  );
}

export async function addPriorityFee(
  creds: LalamoveCreds,
  orderId: string,
  amount: string
) {
  return lalamoveRequest<{ data: Record<string, unknown> }>(
    creds,
    "POST",
    `/v3/orders/${encodeURIComponent(orderId)}/priority-fee`,
    { data: { priorityFee: amount } }
  );
}

export async function changeDriver(
  creds: LalamoveCreds,
  orderId: string,
  driverId: string,
  reason: string
) {
  return lalamoveRequest<void>(
    creds,
    "DELETE",
    `/v3/orders/${encodeURIComponent(orderId)}/drivers/${encodeURIComponent(driverId)}`,
    { data: { reason } }
  );
}

export function hasLiveCredentials(creds: {
  apiKey?: string | null;
  apiSecret?: string | null;
}): boolean {
  return Boolean(creds.apiKey?.trim() && creds.apiSecret?.trim());
}
