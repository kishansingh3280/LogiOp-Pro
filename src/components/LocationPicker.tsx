"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client-api";

export type LocationValue = {
  address: string;
  city?: string;
  country?: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
};

/** @deprecated use LocationValue */
export type MapLocation = LocationValue;

type Suggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  /** Places API (New) prediction — used for toPlace()/fetchFields */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  placePrediction?: any;
};

type Props = {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  label?: string;
  hint?: string;
  required?: boolean;
};

function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined
): { city: string; country: string } {
  let city = "";
  let country = "";
  if (!components) return { city, country };
  for (const c of components) {
    if (c.types.includes("locality") || c.types.includes("administrative_area_level_2")) {
      if (!city) city = c.long_name;
    }
    if (c.types.includes("administrative_area_level_1") && !city) {
      city = c.long_name;
    }
    if (c.types.includes("country")) {
      country = c.long_name;
    }
  }
  return { city, country };
}

declare global {
  interface Window {
    google?: typeof google;
    __logiopMapsInit?: () => void;
  }
}

let mapsScriptPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-logiop-maps]");
    if (existing) {
      if (window.google?.maps) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")));
      return;
    }
    window.__logiopMapsInit = () => resolve();
    const script = document.createElement("script");
    script.dataset.logiopMaps = "1";
    script.async = true;
    script.defer = true;
    // loading=async + places library; Places API (New) via AutocompleteSuggestion
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly&loading=async&callback=__logiopMapsInit`;
    script.onerror = () => {
      mapsScriptPromise = null;
      reject(new Error("Google Maps failed to load — check API key and Maps JavaScript API"));
    };
    document.head.appendChild(script);
  });
  return mapsScriptPromise;
}

export function LocationPicker({
  value,
  onChange,
  label = "Location",
  hint = "Search Google Maps for an address, then fine-tune the pin.",
  required,
}: Props) {
  const [query, setQuery] = useState(value.address || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mapsConnected, setMapsConnected] = useState(false);
  const [browserKey, setBrowserKey] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [usePlacesNew, setUsePlacesNew] = useState(false);
  const [connectKey, setConnectKey] = useState("");
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const skipSearchRef = useRef(false);
  const searchGenRef = useRef(0);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await apiFetch("/api/maps?status=1");
      const data = await res.json();
      setMapsConnected(Boolean(data.connected));
      setBrowserKey(typeof data.browserKey === "string" ? data.browserKey : null);
    } catch {
      setMapsConnected(false);
      setBrowserKey(null);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!value.address) return;
    if (document.activeElement?.closest("[data-location-picker]")) return;
    setQuery(value.address);
  }, [value.address]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load Google Maps JS + Places when connected
  useEffect(() => {
    if (!browserKey) {
      setMapsReady(false);
      return;
    }
    let cancelled = false;
    setMapsError(null);
    void loadGoogleMaps(browserKey)
      .then(async () => {
        if (cancelled) return;
        // Prefer Places API (New) AutocompleteSuggestion when available
        const placesLib = (await google.maps.importLibrary(
          "places"
        )) as google.maps.PlacesLibrary;
        const hasNew =
          typeof (
            placesLib as unknown as {
              AutocompleteSuggestion?: { fetchAutocompleteSuggestions?: unknown };
            }
          ).AutocompleteSuggestion?.fetchAutocompleteSuggestions === "function";

        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        geocoderRef.current = new window.google!.maps.Geocoder();

        if (hasNew) {
          setUsePlacesNew(true);
        } else {
          setUsePlacesNew(false);
          autocompleteRef.current = new placesLib.AutocompleteService();
        }
        setMapsReady(true);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setMapsReady(false);
        setMapsError(err.message || "Failed to load Google Maps");
      });
    return () => {
      cancelled = true;
    };
  }, [browserKey]);

  // Init / update map
  useEffect(() => {
    if (!mapsReady || !mapElRef.current || !window.google?.maps) return;

    const center =
      value.latitude != null && value.longitude != null
        ? { lat: value.latitude, lng: value.longitude }
        : { lat: 13.7563, lng: 100.5018 };

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapElRef.current, {
        center,
        zoom: value.latitude != null ? 16 : 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      placesRef.current = new window.google.maps.places.PlacesService(mapRef.current);
      markerRef.current = new window.google.maps.Marker({
        map: mapRef.current,
        position: center,
        draggable: true,
        title: "Drag to adjust",
      });
      markerRef.current.addListener("dragend", () => {
        const pos = markerRef.current?.getPosition();
        if (!pos) return;
        void reverseGeocode(pos.lat(), pos.lng());
      });
      mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        markerRef.current?.setPosition(e.latLng);
        void reverseGeocode(e.latLng.lat(), e.latLng.lng());
      });
    } else if (value.latitude != null && value.longitude != null) {
      const pos = { lat: value.latitude, lng: value.longitude };
      mapRef.current.setCenter(pos);
      markerRef.current?.setPosition(pos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, value.latitude, value.longitude]);

  function reverseGeocode(lat: number, lng: number) {
    if (!geocoderRef.current) {
      onChange({
        address: value.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        city: value.city,
        country: value.country,
        latitude: lat,
        longitude: lng,
        placeId: value.placeId,
      });
      return;
    }
    setBusy(true);
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      setBusy(false);
      if (status === "OK" && results?.[0]) {
        const r = results[0];
        const parsed = parseAddressComponents(r.address_components);
        skipSearchRef.current = true;
        setQuery(r.formatted_address);
        onChange({
          address: r.formatted_address,
          city: parsed.city || value.city,
          country: parsed.country || value.country,
          latitude: lat,
          longitude: lng,
          placeId: r.place_id || null,
        });
      } else {
        onChange({
          address: value.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          city: value.city,
          country: value.country,
          latitude: lat,
          longitude: lng,
          placeId: value.placeId,
        });
      }
    });
  }

  // Google Places Autocomplete — Places API (New) first, legacy fallback
  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    const q = query.trim();
    if (!mapsReady || q.length < 2) {
      setSuggestions([]);
      return;
    }

    const gen = ++searchGenRef.current;
    const handle = window.setTimeout(() => {
      void (async () => {
        setBusy(true);
        try {
          if (usePlacesNew && window.google?.maps?.places) {
            const placesLib = (await google.maps.importLibrary(
              "places"
            )) as google.maps.PlacesLibrary & {
              AutocompleteSuggestion: {
                fetchAutocompleteSuggestions: (req: {
                  input: string;
                  sessionToken?: google.maps.places.AutocompleteSessionToken;
                }) => Promise<{
                  suggestions: Array<{
                    placePrediction?: {
                      placeId?: string;
                      text?: { text?: string };
                      mainText?: { text?: string };
                      secondaryText?: { text?: string };
                      toPlace: () => google.maps.places.Place;
                    };
                  }>;
                }>;
              };
            };

            const { suggestions: raw } =
              await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                input: q,
                sessionToken: sessionTokenRef.current || undefined,
              });

            if (gen !== searchGenRef.current) return;

            const mapped: Suggestion[] = (raw || [])
              .map((s) => {
                const p = s.placePrediction;
                if (!p) return null;
                const description = p.text?.text || p.mainText?.text || "";
                return {
                  placeId: p.placeId || description,
                  description,
                  mainText: p.mainText?.text || description,
                  secondaryText: p.secondaryText?.text || "",
                  placePrediction: p,
                };
              })
              .filter(Boolean) as Suggestion[];

            setSuggestions(mapped);
            if (mapped.length) setOpen(true);
          } else if (autocompleteRef.current) {
            await new Promise<void>((resolve) => {
              autocompleteRef.current!.getPlacePredictions(
                {
                  input: q,
                  sessionToken: sessionTokenRef.current || undefined,
                },
                (predictions, status) => {
                  if (gen !== searchGenRef.current) {
                    resolve();
                    return;
                  }
                  if (
                    status !== window.google!.maps.places.PlacesServiceStatus.OK ||
                    !predictions?.length
                  ) {
                    setSuggestions([]);
                    resolve();
                    return;
                  }
                  setSuggestions(
                    predictions.map((p) => ({
                      placeId: p.place_id,
                      description: p.description,
                      mainText: p.structured_formatting?.main_text || p.description,
                      secondaryText: p.structured_formatting?.secondary_text || "",
                    }))
                  );
                  setOpen(true);
                  resolve();
                }
              );
            });
          }
        } catch {
          if (gen === searchGenRef.current) setSuggestions([]);
        } finally {
          if (gen === searchGenRef.current) setBusy(false);
        }
      })();
    }, 220);

    return () => window.clearTimeout(handle);
  }, [query, mapsReady, usePlacesNew]);

  async function pickSuggestion(s: Suggestion) {
    setOpen(false);
    setSuggestions([]);
    skipSearchRef.current = true;
    setQuery(s.description);
    setBusy(true);

    const finish = (
      lat: number,
      lng: number,
      address: string,
      placeId: string,
      city?: string,
      country?: string
    ) => {
      setBusy(false);
      onChange({
        address,
        city: city || value.city,
        country: country || value.country,
        latitude: lat,
        longitude: lng,
        placeId,
      });
      sessionTokenRef.current = new window.google!.maps.places.AutocompleteSessionToken();
      if (mapRef.current && markerRef.current) {
        const pos = { lat, lng };
        mapRef.current.setCenter(pos);
        mapRef.current.setZoom(16);
        markerRef.current.setPosition(pos);
      }
    };

    try {
      if (s.placePrediction && typeof s.placePrediction.toPlace === "function") {
        const place = s.placePrediction.toPlace() as google.maps.places.Place;
        await place.fetchFields({
          fields: ["displayName", "formattedAddress", "location", "id", "addressComponents"],
        });
        const loc = place.location;
        if (loc) {
          let city = "";
          let country = "";
          const comps = place.addressComponents || [];
          for (const c of comps) {
            const types = c.types || [];
            if (types.includes("locality") || types.includes("administrative_area_level_2")) {
              if (!city) city = c.longText || c.shortText || "";
            }
            if (types.includes("administrative_area_level_1") && !city) {
              city = c.longText || c.shortText || "";
            }
            if (types.includes("country")) {
              country = c.longText || c.shortText || "";
            }
          }
          finish(
            loc.lat(),
            loc.lng(),
            place.formattedAddress || place.displayName || s.description,
            place.id || s.placeId,
            city,
            country
          );
          return;
        }
      }

      if (placesRef.current) {
        placesRef.current.getDetails(
          {
            placeId: s.placeId,
            fields: [
              "formatted_address",
              "geometry",
              "place_id",
              "name",
              "address_components",
            ],
            sessionToken: sessionTokenRef.current || undefined,
          },
          (place, status) => {
            if (
              status === window.google!.maps.places.PlacesServiceStatus.OK &&
              place?.geometry?.location
            ) {
              const parsed = parseAddressComponents(place.address_components);
              finish(
                place.geometry.location.lat(),
                place.geometry.location.lng(),
                place.formatted_address || place.name || s.description,
                place.place_id || s.placeId,
                parsed.city,
                parsed.country
              );
            } else {
              setBusy(false);
              onChange({
                address: s.description,
                city: value.city,
                country: value.country,
                latitude: null,
                longitude: null,
                placeId: s.placeId,
              });
            }
          }
        );
        return;
      }

      setBusy(false);
      onChange({
        address: s.description,
        city: value.city,
        country: value.country,
        latitude: null,
        longitude: null,
        placeId: s.placeId,
      });
    } catch {
      setBusy(false);
      onChange({
        address: s.description,
        city: value.city,
        country: value.country,
        latitude: null,
        longitude: null,
        placeId: s.placeId,
      });
    }
  }

  async function connectMaps() {
    const key = connectKey.trim();
    if (!key) {
      setConnectMsg("Paste your Google Maps JavaScript API key.");
      return;
    }
    setBusy(true);
    setConnectMsg(null);
    try {
      const res = await apiFetch(
        `/api/maps?connect=1&apiKey=${encodeURIComponent(key)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setConnectMsg(data.error || "Could not save key");
        return;
      }
      setConnectMsg(
        data.note
          ? `Saved. ${data.note}`
          : "Google Maps connected. Search below for Places suggestions."
      );
      setConnectKey("");
      setShowConnect(false);
      await refreshStatus();
    } catch {
      setConnectMsg("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectMaps() {
    setBusy(true);
    try {
      await apiFetch("/api/maps?disconnect=1");
      setMapsReady(false);
      mapRef.current = null;
      markerRef.current = null;
      autocompleteRef.current = null;
      placesRef.current = null;
      await refreshStatus();
      setConnectMsg("Disconnected.");
    } finally {
      setBusy(false);
    }
  }

  const hasPin = value.latitude != null && value.longitude != null;

  return (
    <div className="space-y-2" data-location-picker ref={wrapRef}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label className="block text-sm font-medium text-ink">
          {label}
          {required ? " *" : ""}
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {mapsConnected ? (
            <>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
                Google Maps connected
              </span>
              <button
                type="button"
                className="text-slate-500 underline"
                onClick={() => void disconnectMaps()}
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              className="font-medium text-brand underline"
              onClick={() => setShowConnect((v) => !v)}
            >
              Connect Google Maps
            </button>
          )}
        </div>
      </div>

      {showConnect && !mapsConnected ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 space-y-2">
          <p className="text-xs text-amber-950">
            Prefer <code className="text-[10px]">GOOGLE_MAPS_API_KEY</code> in{" "}
            <code className="text-[10px]">.env.local</code>. In Google Cloud enable{" "}
            <strong>Maps JavaScript API</strong>, <strong>Places API (New)</strong>, and{" "}
            <strong>Geocoding API</strong>. Restrict the key to{" "}
            <code className="text-[10px]">http://localhost:3000/*</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              className="input min-w-[220px] flex-1 font-mono text-xs"
              type="password"
              autoComplete="off"
              placeholder="AIza…"
              value={connectKey}
              onChange={(e) => setConnectKey(e.target.value)}
            />
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void connectMaps()}>
              Save key
            </button>
          </div>
        </div>
      ) : null}

      {connectMsg ? <p className="text-xs text-slate-600">{connectMsg}</p> : null}
      {mapsError ? (
        <p className="text-xs text-rose-700">
          {mapsError}. Enable Maps JavaScript API + Places API (New) for this key.
        </p>
      ) : null}

      <div className="relative">
        <input
          className="input w-full pr-10"
          placeholder={
            mapsReady
              ? "Search Google Maps — type an address or place…"
              : mapsConnected
                ? "Loading Google Places…"
                : "Connect Google Maps to search places…"
          }
          value={query}
          disabled={!mapsReady}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange({
              ...value,
              address: e.target.value,
              latitude: null,
              longitude: null,
              placeId: null,
            });
            setOpen(true);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {busy ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            …
          </span>
        ) : null}

        {open && suggestions.length > 0 ? (
          <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => void pickSuggestion(s)}
                >
                  <span className="text-sm font-medium text-ink">{s.mainText}</span>
                  {s.secondaryText ? (
                    <span className="text-xs text-slate-500">{s.secondaryText}</span>
                  ) : (
                    <span className="text-xs text-slate-500">{s.description}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {mapsReady ? (
        <div
          ref={mapElRef}
          className="h-56 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
        />
      ) : mapsConnected && !mapsError ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
          Loading Google Map…
        </div>
      ) : !mapsConnected ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          Connect Google Maps above to search places and drop a pin.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>{hint}</span>
        {hasPin ? (
          <span className="font-mono text-slate-600">
            {value.latitude!.toFixed(6)}, {value.longitude!.toFixed(6)}
            <button
              type="button"
              className="ml-2 text-rose-600 underline"
              onClick={() =>
                onChange({
                  address: query,
                  city: value.city,
                  country: value.country,
                  latitude: null,
                  longitude: null,
                  placeId: null,
                })
              }
            >
              Clear pin
            </button>
          </span>
        ) : (
          <span className="text-amber-700">No coordinates yet — pick a Google suggestion or click the map</span>
        )}
      </div>
    </div>
  );
}
