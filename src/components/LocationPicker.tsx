"use client";

import { useEffect, useRef, useState } from "react";
import { Input, Button } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/client-api";
import { MapPin, Search, Link2 } from "lucide-react";

export type LocationValue = {
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
};

type PlaceResult = {
  placeId: string;
  label: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  provider: "google" | "osm";
};

type Props = {
  label?: string;
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  /** Show Google Maps connect hint */
  showMapsConnect?: boolean;
};

export function LocationPicker({
  label = "Location on map",
  value,
  onChange,
  showMapsConnect = true,
}: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [provider, setProvider] = useState<"google" | "osm">("osm");
  const [searching, setSearching] = useState(false);
  const [mapsConnected, setMapsConnected] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<{ connected: boolean; provider: "google" | "osm" }>(
      "/api/maps?settings=1"
    )
      .then((s) => {
        setMapsConnected(s.connected);
        setProvider(s.provider);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initMap() {
      if (!mapEl.current || mapRef.current) return;
      const L = (await import("leaflet")).default;
      // Fix default marker icons in bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (cancelled || !mapEl.current) return;
      const lat = value.latitude ?? 20.5937;
      const lng = value.longitude ?? 78.9629;
      const map = L.map(mapEl.current).setView([lat, lng], value.latitude ? 15 : 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      if (value.latitude != null && value.longitude != null) {
        markerRef.current = L.marker([value.latitude, value.longitude]).addTo(map);
      }

      map.on("click", async (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        setMarker(L, map, clickLat, clickLng);
        try {
          const res = await apiGet<{ place: PlaceResult | null }>(
            `/api/maps?lat=${clickLat}&lng=${clickLng}`
          );
          if (res.place) {
            onChange({
              address: res.place.address,
              city: res.place.city || value.city,
              country: res.place.country || value.country,
              latitude: clickLat,
              longitude: clickLng,
              placeId: res.place.placeId,
            });
            setQuery(res.place.address);
          } else {
            onChange({
              ...value,
              latitude: clickLat,
              longitude: clickLng,
              placeId: `pin:${clickLat},${clickLng}`,
            });
          }
        } catch {
          onChange({
            ...value,
            latitude: clickLat,
            longitude: clickLng,
          });
        }
      });

      mapRef.current = map;
    }
    initMap();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function syncMarker() {
      if (!mapRef.current || value.latitude == null || value.longitude == null)
        return;
      const L = (await import("leaflet")).default;
      setMarker(L, mapRef.current, value.latitude, value.longitude);
      mapRef.current.setView([value.latitude, value.longitude], 15);
    }
    syncMarker();
  }, [value.latitude, value.longitude]);

  function setMarker(
    L: typeof import("leaflet"),
    map: import("leaflet").Map,
    lat: number,
    lng: number
  ) {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }
  }

  async function search() {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      const res = await apiGet<{
        results: PlaceResult[];
        provider: "google" | "osm";
      }>(`/api/maps?q=${encodeURIComponent(q)}`);
      setResults(res.results || []);
      setProvider(res.provider);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function pick(place: PlaceResult) {
    onChange({
      address: place.address,
      city: place.city || value.city,
      country: place.country || value.country,
      latitude: place.latitude,
      longitude: place.longitude,
      placeId: place.placeId,
    });
    setQuery(place.label);
    setResults([]);
    if (mapRef.current) {
      const L = (await import("leaflet")).default;
      setMarker(L, mapRef.current, place.latitude, place.longitude);
      mapRef.current.setView([place.latitude, place.longitude], 16);
    }
  }

  async function connectMaps() {
    if (!apiKey.trim()) return;
    setBusy(true);
    try {
      await apiPost("/api/maps", { action: "connect", apiKey: apiKey.trim() });
      setMapsConnected(true);
      setProvider("google");
      setConnectOpen(false);
      setApiKey("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className="text-xs text-[var(--muted)]">
          {provider === "google" ? "Google Maps" : "OpenStreetMap"} search
          {value.latitude != null && value.longitude != null
            ? ` · ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`
            : ""}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Input
            placeholder="Search address, landmark, area…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={search}
          disabled={searching || query.trim().length < 2}
        >
          <Search size={16} />
          {searching ? "…" : "Search"}
        </Button>
      </div>

      {results.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--bg)] text-sm">
          {results.map((r) => (
            <li key={r.placeId}>
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[var(--accent-soft)]"
                onClick={() => pick(r)}
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <span>{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        ref={mapEl}
        className="h-56 w-full overflow-hidden rounded-lg border border-[var(--line)]"
      />
      <p className="text-xs text-[var(--muted)]">
        Search or click the map to pin the precise location for Lalamove pickup /
        dropoff.
      </p>

      {showMapsConnect && (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--muted)]">
          {mapsConnected ? (
            <span className="text-emerald-700">
              Google Maps connected — searches prefer Google Places.
            </span>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Optional: connect a Google Maps API key for Places search (Maps
                JavaScript + Places / Geocoding).
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[var(--accent)]"
                onClick={() => setConnectOpen((v) => !v)}
              >
                <Link2 size={12} /> Connect Google
              </button>
            </div>
          )}
          {connectOpen && !mapsConnected && (
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="password"
                className="min-w-[200px] flex-1 rounded border border-[var(--line)] px-2 py-1"
                placeholder="Google Maps API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button
                type="button"
                onClick={connectMaps}
                disabled={busy || !apiKey.trim()}
              >
                Save key
              </Button>
            </div>
          )}
        </div>
      )}

      <Input
        label="Address line"
        value={value.address}
        onChange={(e) => onChange({ ...value, address: e.target.value })}
        placeholder="Confirmed street address"
      />
    </div>
  );
}
