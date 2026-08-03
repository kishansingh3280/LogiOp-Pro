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
 * Restrict the key by HTTP referrer. Places search runs in the browser.
 */

type MapsSettings = {
  connected: boolean;
  apiKey: string;
  connectedAt?: string | null;
};

function defaultSettings(): MapsSettings {
  return { connected: false, apiKey: "", connectedAt: null };
}

async function readSettings(): Promise<MapsSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return defaultSettings();
  try {
    return { ...defaultSettings(), ...JSON.parse(row.value) };
  } catch {
    return defaultSettings();
  }
}

async function writeSettings(next: MapsSettings) {
  const value = JSON.stringify(next);
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value },
    update: { value },
  });
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

    // Soft probe — browser-restricted keys often fail server-side; we still save.
    let probeOk = false;
    let probeNote: string | null = null;
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
      url.searchParams.set("input", "Bangkok");
      url.searchParams.set("key", apiKey);
      const res = await fetch(url.toString());
      const data = (await res.json()) as { status?: string; error_message?: string };
      if (data.status === "OK" || data.status === "ZERO_RESULTS") {
        probeOk = true;
      } else if (data.status === "REQUEST_DENIED") {
        probeNote =
          data.error_message ||
          "Server probe denied (common with HTTP-referrer–restricted keys). Key saved — Places search runs in the browser.";
      } else {
        probeNote = data.error_message || data.status || "Probe inconclusive; key saved for browser use.";
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
