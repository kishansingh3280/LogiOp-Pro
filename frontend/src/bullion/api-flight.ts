import { findAirport } from "./airports";

/**
 * Flight tracking via AviationStack.
 *
 * The free tier is 100 requests/month, so this client aggressively caches
 * every response for 10 minutes and de-duplicates in-flight requests for
 * the same flight code. If the key is missing or the API errors, we fall
 * back to a deterministic mock so the UI still shows something meaningful.
 */

const KEY = process.env.EXPO_PUBLIC_AVIATIONSTACK_KEY;
const BASE = "https://api.aviationstack.com/v1";
const TTL_MS = 10 * 60 * 1000; // 10 min

export type FlightStatus =
  | "scheduled"
  | "active"       // in-air
  | "landed"
  | "cancelled"
  | "incident"
  | "diverted"
  | "unknown";

export interface FlightSnapshot {
  flight_iata: string;
  status: FlightStatus;
  airline?: string;
  aircraft_type?: string;
  departure: {
    airport_iata?: string;
    airport_name?: string;
    scheduled?: string;   // ISO
    actual?: string;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport_iata?: string;
    airport_name?: string;
    scheduled?: string;
    estimated?: string;
    terminal?: string;
    gate?: string;
  };
  live?: {
    updated?: string;
    latitude?: number;
    longitude?: number;
    altitude_m?: number;
    direction?: number;   // heading °
    speed_kmh?: number;
    is_ground?: boolean;
  } | null;
  /** 0..1 fraction of route flown. Derived from times or live position. */
  progress: number;
  /** True when the value came from the mock fallback. */
  mocked: boolean;
  fetched_at: string;
}

interface CacheEntry {
  data: FlightSnapshot;
  expires: number;
}
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<FlightSnapshot>>();

function normalizeFlightIata(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function deriveProgress(dep?: string, arr?: string): number {
  const d = parseDate(dep);
  const a = parseDate(arr);
  if (!d || !a) return 0;
  const now = Date.now();
  if (now <= d.getTime()) return 0;
  if (now >= a.getTime()) return 1;
  const total = a.getTime() - d.getTime();
  return Math.max(0, Math.min(1, (now - d.getTime()) / total));
}

function mockSnapshot(flightIata: string, hint?: { fromIata?: string; toIata?: string; date?: string }): FlightSnapshot {
  // Deterministic mock — same input → same output on a given day.
  const seed = (flightIata + (hint?.date || "")).split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const from = findAirport(hint?.fromIata) || findAirport("DEL")!;
  const to = findAirport(hint?.toIata) || findAirport("BKK")!;
  const stages: FlightStatus[] = ["scheduled", "active", "landed"];
  const status = stages[seed % stages.length];
  const now = Date.now();
  const dep = new Date(now - (seed % 6) * 60 * 60 * 1000);
  const arr = new Date(dep.getTime() + 4 * 60 * 60 * 1000);
  const progress =
    status === "landed" ? 1 : status === "scheduled" ? 0 : ((seed % 7) + 2) / 10;
  const lat = from.lat + (to.lat - from.lat) * progress;
  const lng = from.lng + (to.lng - from.lng) * progress;
  return {
    flight_iata: flightIata,
    status,
    airline: undefined,
    aircraft_type: ["A320neo", "B737-800", "B787-9", "A330-300"][seed % 4],
    departure: {
      airport_iata: from.code,
      airport_name: from.name,
      scheduled: dep.toISOString(),
      actual: status !== "scheduled" ? dep.toISOString() : undefined,
      terminal: String(1 + (seed % 3)),
    },
    arrival: {
      airport_iata: to.code,
      airport_name: to.name,
      scheduled: arr.toISOString(),
      estimated: arr.toISOString(),
      terminal: String(1 + ((seed + 1) % 3)),
    },
    live:
      status === "active"
        ? {
            updated: new Date().toISOString(),
            latitude: lat,
            longitude: lng,
            altitude_m: 10000 + (seed % 4) * 500,
            direction: (seed * 7) % 360,
            speed_kmh: 820 + (seed % 40),
            is_ground: false,
          }
        : null,
    progress,
    mocked: true,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Fetch a live flight snapshot for the given IATA code (e.g. `TG317`).
 * Passes hints (from/to airport + date) so the fallback mock is realistic.
 */
export async function fetchFlight(
  rawFlightIata: string,
  hint?: { fromIata?: string; toIata?: string; date?: string },
): Promise<FlightSnapshot> {
  const code = normalizeFlightIata(rawFlightIata);
  if (!code) return mockSnapshot(rawFlightIata || "UNKNOWN", hint);

  const now = Date.now();
  const cached = cache.get(code);
  if (cached && cached.expires > now) return cached.data;
  const already = inflight.get(code);
  if (already) return already;

  const p = (async (): Promise<FlightSnapshot> => {
    try {
      if (!KEY) return mockSnapshot(code, hint);
      const url = `${BASE}/flights?access_key=${encodeURIComponent(KEY)}&flight_iata=${encodeURIComponent(code)}&limit=1`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`AviationStack HTTP ${res.status}`);
      const json = await res.json();
      const item = (json?.data || [])[0];
      if (!item) return mockSnapshot(code, hint);

      const departure = item.departure || {};
      const arrival = item.arrival || {};
      const flight = item.flight || {};
      const airline = item.airline || {};
      const aircraft = item.aircraft || {};
      const live = item.live || null;

      const rawStatus = String(item.flight_status || "unknown").toLowerCase();
      const statusMap: Record<string, FlightStatus> = {
        scheduled: "scheduled",
        active: "active",
        landed: "landed",
        cancelled: "cancelled",
        incident: "incident",
        diverted: "diverted",
      };
      const status = statusMap[rawStatus] || "unknown";

      const progress =
        status === "landed"
          ? 1
          : status === "active"
            ? deriveProgress(departure.actual || departure.scheduled, arrival.estimated || arrival.scheduled) || 0.4
            : 0;

      const snap: FlightSnapshot = {
        flight_iata: (flight.iata || code).toUpperCase(),
        status,
        airline: airline.name || undefined,
        aircraft_type: aircraft.iata || aircraft.icao || undefined,
        departure: {
          airport_iata: departure.iata || undefined,
          airport_name: departure.airport || undefined,
          scheduled: departure.scheduled || undefined,
          actual: departure.actual || undefined,
          terminal: departure.terminal || undefined,
          gate: departure.gate || undefined,
        },
        arrival: {
          airport_iata: arrival.iata || undefined,
          airport_name: arrival.airport || undefined,
          scheduled: arrival.scheduled || undefined,
          estimated: arrival.estimated || undefined,
          terminal: arrival.terminal || undefined,
          gate: arrival.gate || undefined,
        },
        live: live
          ? {
              updated: live.updated || undefined,
              latitude: typeof live.latitude === "number" ? live.latitude : undefined,
              longitude: typeof live.longitude === "number" ? live.longitude : undefined,
              altitude_m: typeof live.altitude === "number" ? live.altitude : undefined,
              direction: typeof live.direction === "number" ? live.direction : undefined,
              speed_kmh: typeof live.speed_horizontal === "number" ? live.speed_horizontal : undefined,
              is_ground: !!live.is_ground,
            }
          : null,
        progress,
        mocked: false,
        fetched_at: new Date().toISOString(),
      };
      return snap;
    } catch (e) {
      console.warn("AviationStack fetch failed, using mock:", (e as Error).message);
      return mockSnapshot(code, hint);
    }
  })();

  inflight.set(code, p);
  try {
    const snap = await p;
    cache.set(code, { data: snap, expires: Date.now() + TTL_MS });
    return snap;
  } finally {
    inflight.delete(code);
  }
}

export function statusLabel(s: FlightStatus): string {
  switch (s) {
    case "scheduled": return "Scheduled";
    case "active":    return "In the air";
    case "landed":    return "Landed";
    case "cancelled": return "Cancelled";
    case "incident":  return "Incident";
    case "diverted":  return "Diverted";
    default:          return "Unknown";
  }
}

/** Tailwind-ish colour tint for the given status. */
export function statusTint(s: FlightStatus): "info" | "ok" | "warn" | "danger" | "muted" {
  switch (s) {
    case "active":    return "info";
    case "landed":    return "ok";
    case "cancelled":
    case "incident":  return "danger";
    case "diverted":  return "warn";
    default:          return "muted";
  }
}
