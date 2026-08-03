import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SETTING_KEY = "google_maps";

/**
 * Google Maps for LogiOp Pro.
 *
 * Paste your Maps JavaScript API key. In Google Cloud Console enable:
 *   1. Maps JavaScript API
 *   2. Places API   (Autocomplete + Place Details in the browser)
 *   3. Geocoding API (pin reverse-geocode)
 *
 * Prefer GOOGLE_MAPS_API_KEY in `.env.local` (never commit the key).
 * Restrict the key by HTTP referrer (localhost:3000 + your domain).
 */

type MapsSettings = {
  connected: boolean;
  apiKey: string;
  connectedAt?: string | null;
};

function defaultSettings(): MapsSettings {
  return { connected: false, apiKey: "", connectedAt: null };
}

function envApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
}

async function writeSettings(next: MapsSettings) {
  const value = JSON.stringify(next);
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value },
    update: { value },
  });
}

async function readSettings(): Promise<MapsSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
  let settings = defaultSettings();
  if (row) {
    try {
      settings = { ...defaultSettings(), ...JSON.parse(row.value) };
    } catch {
      settings = defaultSettings();
    }
  }

  // Env key wins / fills in so you don't paste the key in the UI every machine.
  const fromEnv = envApiKey();
  if (fromEnv && (!settings.connected || !settings.apiKey || settings.apiKey !== fromEnv)) {
    settings = {
      connected: true,
      apiKey: fromEnv,
      connectedAt: settings.connectedAt || new Date().toISOString(),
    };
    await writeSettings(settings);
  }

  return settings;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const connect = searchParams.get("connect");
  const disconnect = searchParams.get("disconnect");
  const browserKey = searchParams.get("browserKey");

  if (status === "1") {
    const settings = await readSettings();
    const key = settings.connected && settings.apiKey ? settings.apiKey : null;
    return NextResponse.json({
      connected: Boolean(key),
      provider: "google",
      browserKey: key,
      fromEnv: Boolean(envApiKey()),
    });
  }

  if (browserKey === "1") {
    const settings = await readSettings();
    if (!settings.connected || !settings.apiKey) {
      return NextResponse.json({ error: "Google Maps not connected" }, { status: 400 });
    }
    return NextResponse.json({ key: settings.apiKey, provider: "google" });
  }

  if (disconnect === "1") {
    await writeSettings(defaultSettings());
    return NextResponse.json({ ok: true, connected: false });
  }

  if (connect === "1") {
    const apiKey = searchParams.get("apiKey")?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    }

    // Soft probe against Places API (New). HTTP-referrer keys may still fail server-side.
    let probeOk = false;
    let probeNote: string | null = null;
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify({ input: "Bangkok" }),
      });
      const data = (await res.json()) as {
        suggestions?: unknown[];
        error?: { message?: string; status?: string };
      };
      if (res.ok && Array.isArray(data.suggestions)) {
        probeOk = true;
      } else if (data.error?.message?.includes("not been used") || data.error?.message?.includes("disabled")) {
        probeNote =
          "Key saved, but enable Places API (New) + Maps JavaScript API + Geocoding API in Google Cloud Console, then wait ~1–2 minutes.";
      } else if (!res.ok) {
        probeNote =
          data.error?.message ||
          "Server probe denied (common with HTTP-referrer–restricted keys). Key saved — browser search may still work once APIs are enabled.";
      }
    } catch {
      probeNote = "Could not probe from server; key saved for browser Places search.";
    }

    await writeSettings({
      connected: true,
      apiKey,
      connectedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      connected: true,
      provider: "google",
      browserKey: apiKey,
      probeOk,
      note: probeNote,
    });
  }

  return NextResponse.json({
    error: "Use ?status=1, ?connect=1&apiKey=, ?browserKey=1, or ?disconnect=1",
  }, { status: 400 });
}
