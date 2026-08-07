/**
 * Static airline metadata used by carrier-trip cards.
 *
 * We ship a small curated list of airlines that operate India ↔ Bangkok
 * routes so the picker is offline-safe and legally clean (no bundled
 * proprietary logo PNGs). Each airline renders as a compact "brand badge"
 * — a rounded chip painted with the airline's official brand colour and
 * stamped with the 2-letter IATA code. This gives instant visual
 * recognition on the trip cards without embedding copyrighted artwork.
 */
export interface Airline {
  code: string;   // IATA 2-letter code
  name: string;
  brand: string;  // primary brand colour (hex)
  fg?: string;    // foreground colour override (default: white)
}

export const AIRLINES: Airline[] = [
  { code: "AI", name: "Air India",          brand: "#C8102E" },
  { code: "UK", name: "Vistara",            brand: "#4B286D" },
  { code: "6E", name: "IndiGo",             brand: "#001E5A" },
  { code: "SG", name: "SpiceJet",           brand: "#B71C1C" },
  { code: "TG", name: "Thai Airways",       brand: "#6E1E7D" },
  { code: "WE", name: "Thai Smile",         brand: "#F4C300", fg: "#0a0a0a" },
  { code: "FD", name: "Thai AirAsia",       brand: "#E31E24" },
  { code: "EK", name: "Emirates",           brand: "#D71921" },
  { code: "EY", name: "Etihad Airways",     brand: "#BB8332" },
  { code: "QR", name: "Qatar Airways",      brand: "#5C0032" },
  { code: "SQ", name: "Singapore Airlines", brand: "#F99F1C", fg: "#0a0a0a" },
  { code: "MH", name: "Malaysia Airlines",  brand: "#005F9E" },
  { code: "CX", name: "Cathay Pacific",     brand: "#006564" },
  { code: "AK", name: "AirAsia",            brand: "#FF0000" },
];

const BY_CODE = new Map(AIRLINES.map((a) => [a.code, a]));

export function findAirline(code?: string | null): Airline | undefined {
  if (!code) return undefined;
  return BY_CODE.get(code.toUpperCase());
}
