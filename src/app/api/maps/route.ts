import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MAPS_KEY = "google_maps";

type MapsSettings = {
  connected: boolean;
  apiKey: string;
  connectedAt?: string | null;
};

async function readMapsSettings(): Promise<MapsSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: MAPS_KEY } });
  if (!row) return { connected: false, apiKey: "", connectedAt: null };
  try {
    return { connected: false, apiKey: "", connectedAt: null, ...JSON.parse(row.value) };
  } catch {
    return { connected: false, apiKey: "", connectedAt: null };
  }
}

export type MapPlace = {
  placeId: string;
  label: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  provider: "google" | "osm";
};

async function searchNominatim(q: string): Promise<MapPlace[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "LogiOp-Pro/1.0 (logistics)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      country?: string;
      suburb?: string;
    };
  }>;
  return data.map((d) => ({
    placeId: `osm:${d.place_id}`,
    label: d.display_name,
    address: d.display_name,
    city:
      d.address?.city ||
      d.address?.town ||
      d.address?.village ||
      d.address?.suburb ||
      d.address?.state ||
      "",
    country: d.address?.country || "",
    latitude: Number(d.lat),
    longitude: Number(d.lon),
    provider: "osm" as const,
  }));
}

async function searchGoogle(q: string, apiKey: string): Promise<MapPlace[]> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    q
  )}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{
      place_id: string;
      formatted_address: string;
      name: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };
  return (data.results || []).slice(0, 6).map((r) => {
    const parts = r.formatted_address.split(",").map((s) => s.trim());
    return {
      placeId: r.place_id,
      label: `${r.name} — ${r.formatted_address}`,
      address: r.formatted_address,
      city: parts.length >= 2 ? parts[parts.length - 3] || parts[0] : parts[0] || "",
      country: parts[parts.length - 1] || "",
      latitude: r.geometry.location.lat,
      longitude: r.geometry.location.lng,
      provider: "google" as const,
    };
  });
}

async function reverseNominatim(lat: number, lng: number): Promise<MapPlace | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "LogiOp-Pro/1.0 (logistics)" },
  });
  if (!res.ok) return null;
  const d = (await res.json()) as {
    place_id?: number;
    display_name?: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      country?: string;
      suburb?: string;
    };
  };
  if (!d.display_name) return null;
  return {
    placeId: d.place_id != null ? `osm:${d.place_id}` : `pin:${lat},${lng}`,
    label: d.display_name,
    address: d.display_name,
    city:
      d.address?.city ||
      d.address?.town ||
      d.address?.village ||
      d.address?.suburb ||
      d.address?.state ||
      "",
    country: d.address?.country || "",
    latitude: lat,
    longitude: lng,
    provider: "osm",
  };
}

/** GET ?q=search | ?lat=&lng= reverse | settings */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const settings = await readMapsSettings();

  if (searchParams.get("settings") === "1") {
    return NextResponse.json({
      connected: settings.connected,
      hasApiKey: Boolean(settings.apiKey),
      apiKeyMasked: settings.apiKey
        ? `${settings.apiKey.slice(0, 4)}••••${settings.apiKey.slice(-3)}`
        : null,
      connectedAt: settings.connectedAt,
      provider: settings.connected && settings.apiKey ? "google" : "osm",
    });
  }

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  if (lat && lng) {
    const place = await reverseNominatim(Number(lat), Number(lng));
    return NextResponse.json({ place });
  }

  const q = (searchParams.get("q") || "").trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], provider: "osm" });
  }

  if (settings.connected && settings.apiKey) {
    try {
      const results = await searchGoogle(q, settings.apiKey);
      if (results.length) {
        return NextResponse.json({ results, provider: "google" });
      }
    } catch {
      // fall through to OSM
    }
  }

  const results = await searchNominatim(q);
  return NextResponse.json({ results, provider: "osm" });
}

/** POST connect / disconnect Google Maps key */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "connect") {
    const apiKey = String(body.apiKey || "").trim();
    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 400 });
    }
    const next: MapsSettings = {
      connected: true,
      apiKey,
      connectedAt: new Date().toISOString(),
    };
    await prisma.appSetting.upsert({
      where: { key: MAPS_KEY },
      create: { key: MAPS_KEY, value: JSON.stringify(next) },
      update: { value: JSON.stringify(next) },
    });
    return NextResponse.json({
      ok: true,
      settings: {
        connected: true,
        hasApiKey: true,
        apiKeyMasked: `${apiKey.slice(0, 4)}••••${apiKey.slice(-3)}`,
        connectedAt: next.connectedAt,
        provider: "google",
      },
    });
  }

  if (action === "disconnect") {
    await prisma.appSetting.upsert({
      where: { key: MAPS_KEY },
      create: {
        key: MAPS_KEY,
        value: JSON.stringify({ connected: false, apiKey: "", connectedAt: null }),
      },
      update: {
        value: JSON.stringify({ connected: false, apiKey: "", connectedAt: null }),
      },
    });
    return NextResponse.json({
      ok: true,
      settings: {
        connected: false,
        hasApiKey: false,
        apiKeyMasked: null,
        connectedAt: null,
        provider: "osm",
      },
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
