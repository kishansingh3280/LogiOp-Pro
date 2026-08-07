/**
 * Curated airport database for India ↔ Thailand routes.
 *
 * Only the airports actually used by hand-carry / bullion trips are shipped
 * so the SVG map stays uncluttered. Extend as new routes appear.
 *
 * Coordinates are decimal degrees (WGS-84). They feed both the map projection
 * and any distance/great-circle math the app may need later.
 */
export interface Airport {
  code: string;   // IATA 3-letter
  icao?: string;
  name: string;
  city: string;
  country: "IN" | "TH" | string;
  lat: number;
  lng: number;
}

export const AIRPORTS: Airport[] = [
  // India
  { code: "DEL", icao: "VIDP", name: "Indira Gandhi Intl.",    city: "Delhi",     country: "IN", lat: 28.5562, lng: 77.1000 },
  { code: "BOM", icao: "VABB", name: "Chhatrapati Shivaji",    city: "Mumbai",    country: "IN", lat: 19.0896, lng: 72.8656 },
  { code: "BLR", icao: "VOBL", name: "Kempegowda Intl.",       city: "Bengaluru", country: "IN", lat: 13.1986, lng: 77.7066 },
  { code: "MAA", icao: "VOMM", name: "Chennai Intl.",          city: "Chennai",   country: "IN", lat: 12.9941, lng: 80.1709 },
  { code: "HYD", icao: "VOHS", name: "Rajiv Gandhi Intl.",     city: "Hyderabad", country: "IN", lat: 17.2403, lng: 78.4294 },
  { code: "CCU", icao: "VECC", name: "Netaji Subhas Chandra",  city: "Kolkata",   country: "IN", lat: 22.6547, lng: 88.4467 },
  { code: "COK", icao: "VOCI", name: "Cochin Intl.",           city: "Kochi",     country: "IN", lat: 10.1520, lng: 76.4019 },
  { code: "AMD", icao: "VAAH", name: "Sardar Vallabhbhai Patel", city: "Ahmedabad", country: "IN", lat: 23.0733, lng: 72.6347 },
  // Thailand
  { code: "BKK", icao: "VTBS", name: "Suvarnabhumi",           city: "Bangkok",   country: "TH", lat: 13.6900, lng: 100.7501 },
  { code: "DMK", icao: "VTBD", name: "Don Mueang Intl.",       city: "Bangkok",   country: "TH", lat: 13.9126, lng: 100.6068 },
  { code: "HKT", icao: "VTSP", name: "Phuket Intl.",           city: "Phuket",    country: "TH", lat: 8.1132,  lng: 98.3169  },
  { code: "CNX", icao: "VTCC", name: "Chiang Mai Intl.",       city: "Chiang Mai",country: "TH", lat: 18.7668, lng: 98.9629  },
];

const BY_IATA = new Map(AIRPORTS.map((a) => [a.code, a]));

export function findAirport(code?: string | null): Airport | undefined {
  if (!code) return undefined;
  return BY_IATA.get(code.toUpperCase());
}

/**
 * Default airport pair used when we only know the trip's route direction
 * (IN_TO_TH / TH_TO_IN) and no explicit airports were supplied.
 */
export function defaultAirports(route: "IN_TO_TH" | "TH_TO_IN"): { from: Airport; to: Airport } {
  const del = BY_IATA.get("DEL")!;
  const bkk = BY_IATA.get("BKK")!;
  return route === "IN_TO_TH" ? { from: del, to: bkk } : { from: bkk, to: del };
}
