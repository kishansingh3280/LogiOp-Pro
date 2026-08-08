import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiPost, apiPut } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { Currency, Party, PartyRole } from "@/src/api/types";
import { useGhostFill } from "@/src/ghost/use-ghost-fill";
import { colors, radii, spacing } from "@/src/theme";

const ROLES: PartyRole[] = ["customer", "end_customer", "supplier", "carrier", "vendor", "other"];
const ROLE_LABEL: Record<PartyRole, string> = {
  customer: "Main Party",
  end_customer: "End Customer",
  supplier: "Supplier",
  carrier: "Carrier",
  vendor: "Vendor",
  other: "Other",
};

export default function NewPartyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string }>();
  const editId = params.editId || null;
  const isEdit = !!editId;

  const existing = useApi<Party>(editId ? `/api/parties/${editId}` : null);

  const [name, setName] = useState("");
  const [role, setRole] = useState<PartyRole>("customer");
  const [country, setCountry] = useState<"IN" | "TH">("IN");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  // Default shipping rate: applied automatically to every bag this party
  // owns in a shipment. `defaultRate` = amount, `defaultRateCcy` = currency.
  // Type is fixed to "per_kg" — flat overrides remain manual on the shipment.
  const [defaultRate, setDefaultRate] = useState("");
  const [defaultRateCcy, setDefaultRateCcy] = useState<Currency>("INR");
  // Google-Maps coordinates. Stored as strings so operators can leave them
  // blank and so we don't lose precision on parse/format. Filled either by
  // typing directly or via the "Paste from Google Maps" affordance which
  // accepts full Maps URLs, "lat,lng" pairs, or plus-codes.
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Ghost-Fill: when the Assistant dispatched us here via /party/new, the
  // Ghost store has a payload like { name, role, city, phone, notes }.
  // Because useGhostFill types char-by-char, each setter is called many
  // times with the accumulated string. We use refs to remember the
  // "latest fully-typed value" per virtual field so combined fields
  // (city + notes → address) reflect the actual state at any moment.
  const cityBufRef = useRef("");
  const notesBufRef = useRef("");
  const composeAddress = () => {
    const c = cityBufRef.current;
    const n = notesBufRef.current;
    if (c && n) return `${c}\n${n}`;
    return c || n || "";
  };
  useGhostFill({
    name: (v) => setName(String(v ?? "")),
    role: (v) => setRole((v as PartyRole) || "customer"),
    city: (v) => {
      cityBufRef.current = String(v ?? "");
      setAddress(composeAddress());
    },
    phone: (v) => setPhone(String(v ?? "")),
    notes: (v) => {
      notesBufRef.current = String(v ?? "");
      setAddress(composeAddress());
    },
  });

  // Role-driven copy: carriers charge YOU a carrying rate, everyone else
  // has a shipping rate WE charge THEM. Keeps the mental model clean when
  // the operator picks the role.
  const isCarrier = role === "carrier";
  const rateFieldLabel = isCarrier
    ? `Default carrying rate (${defaultRateCcy} per kg)`
    : `Default shipping rate (${defaultRateCcy} per kg)`;
  const rateHint = isCarrier
    ? "Used to auto-calculate what this carrier bills you per shipment kg. Leave 0 to enter manually per trip."
    : "Used to auto-calculate freight per bag when this party is billed. Leave 0 to enter freight manually.";

  // Hydrate form fields from server when editing an existing party.
  useEffect(() => {
    if (!isEdit || hydrated || !existing.data) return;
    const p = existing.data;
    setName(p.name || "");
    setRole((p.role as PartyRole) || "customer");
    setCountry((p.country === "TH" ? "TH" : "IN") as "IN" | "TH");
    setCurrency((p.default_currency as Currency) || "INR");
    setPhone(p.phone || "");
    setEmail(p.email || "");
    setGstin(p.gstin || "");
    setAddress(p.address || "");
    setLat(p.lat || "");
    setLng(p.lng || "");
    if (typeof p.default_charge === "number" && p.default_charge > 0) {
      setDefaultRate(String(p.default_charge));
    }
    if (p.default_charge_currency) {
      setDefaultRateCcy(p.default_charge_currency as Currency);
    } else if (p.default_currency) {
      setDefaultRateCcy(p.default_currency as Currency);
    }
    setHydrated(true);
  }, [existing.data, isEdit, hydrated]);

  /**
   * Extract latitude / longitude from anything the user pastes into the
   * coordinates capture box:
   *   • "13.7563, 100.5018"  → straight decimal pair
   *   • "13.7563,100.5018"   → no space
   *   • "13.7563 100.5018"   → space-separated
   *   • "https://www.google.com/maps/@13.7563,100.5018,15z" → Maps deep-link
   *   • "https://maps.google.com/?q=13.7563,100.5018"      → query-string link
   *   • "https://www.google.com/maps/place/…/@13.7563,100.5018,15z/…" → place URL
   *   • "https://goo.gl/maps/xyz"                          → short link (needs API, flagged)
   * Returns null when nothing usable was found.
   */
  const parseCoordinates = (raw: string): { lat: string; lng: string } | null => {
    if (!raw) return null;
    const text = raw.trim();
    // Google Maps @lat,lng,zoom pattern — highest quality.
    const atMatch = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };
    // ?q=lat,lng
    const qMatch = text.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };
    // Plain "lat,lng" or "lat lng"
    const pair = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (pair) {
      const la = parseFloat(pair[1]);
      const lo = parseFloat(pair[2]);
      if (Math.abs(la) <= 90 && Math.abs(lo) <= 180) {
        return { lat: pair[1], lng: pair[2] };
      }
    }
    return null;
  };

  const handlePasteCoordinates = async () => {
    // Best-effort: try to read the clipboard through the platform API. Web
    // and native both expose `navigator.clipboard.readText()` (via the RN
    // Web polyfill and Expo's clipboard module respectively). We fall back
    // gracefully when the permission is denied.
    try {
      let text = "";
      // Reach for the browser API first (RN Web).
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.readText === "function"
      ) {
        text = await navigator.clipboard.readText();
      }
      if (!text) {
        Alert.alert(
          "Paste manually",
          "Couldn't read the clipboard. Paste the coordinates or Google Maps link into the box directly.",
        );
        return;
      }
      const parsed = parseCoordinates(text);
      if (!parsed) {
        Alert.alert(
          "Unrecognised",
          "That doesn't look like coordinates or a Google Maps link. Expected something like 13.7563, 100.5018 or a maps.google.com URL.",
        );
        return;
      }
      setLat(parsed.lat);
      setLng(parsed.lng);
    } catch {
      Alert.alert(
        "Paste manually",
        "Couldn't read the clipboard. Paste the coordinates or Google Maps link into the box directly.",
      );
    }
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert("Missing", "Name is required");
    setBusy(true);
    try {
      const rateNum = Number(defaultRate) || 0;
      const payload = {
        name: name.trim(),
        role,
        country,
        default_currency: currency,
        phone,
        email,
        gstin,
        address,
        lat: lat.trim() || null,
        lng: lng.trim() || null,
        default_charge: rateNum,
        default_charge_type: "per_kg",
        default_charge_currency: defaultRateCcy,
      };
      const res = isEdit
        ? await apiPut<Party>(`/api/parties/${editId}`, payload)
        : await apiPost<Party>("/api/parties", payload);
      if ((res as { queued?: boolean }).queued) {
        Alert.alert("Queued", "Saved locally — syncing when back online.");
      }
      router.back();
    } catch (e) {
      Alert.alert("Failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headTitle}>{isEdit ? "Edit party" : "New party"}</Text>
        <TouchableOpacity onPress={save} disabled={busy} style={styles.saveBtn} testID="save-party-btn">
          <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Field label="Name">
            <TextInput style={styles.input} placeholder="Client name" placeholderTextColor={colors.textDim} value={name} onChangeText={setName} testID="input-name" />
          </Field>

          <Field label="Role">
            <View style={styles.segRow}>
              {ROLES.map((r) => {
                const active = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    style={[styles.seg, active && styles.segActive]}
                    testID={`role-${r}`}
                  >
                    <Text style={[styles.segText, active && styles.segTextActive]}>{ROLE_LABEL[r]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Country">
                <View style={styles.segRow}>
                  {(["IN", "TH"] as const).map((c) => {
                    const active = country === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setCountry(c)}
                        style={[styles.seg, active && styles.segActive]}
                      >
                        <Text style={[styles.segText, active && styles.segTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Currency">
                <View style={styles.segRow}>
                  {(["INR", "THB"] as Currency[]).map((c) => {
                    const active = currency === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setCurrency(c)}
                        style={[styles.seg, active && styles.segActive]}
                      >
                        <Text style={[styles.segText, active && styles.segTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Field>
            </View>
          </View>

          {/* Default shipping/carrying rate — auto-applied to bags in shipments. */}
          <Field label={rateFieldLabel}>
            <View style={styles.rateRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                keyboardType="decimal-pad"
                value={defaultRate}
                onChangeText={setDefaultRate}
                placeholder="0.00"
                placeholderTextColor={colors.textDim}
                testID="input-default-rate"
              />
              <View style={[styles.segRow, { marginLeft: 8 }]}>
                {(["INR", "THB"] as Currency[]).map((c) => {
                  const active = defaultRateCcy === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setDefaultRateCcy(c)}
                      style={[styles.seg, active && styles.segActive]}
                    >
                      <Text style={[styles.segText, active && styles.segTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <Text style={styles.hint}>{rateHint}</Text>
          </Field>

          <Field label="Phone">
            <TextInput style={styles.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="+91…" placeholderTextColor={colors.textDim} />
          </Field>

          <Field label="Email">
            <TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="name@example.com" placeholderTextColor={colors.textDim} />
          </Field>

          <Field label="GSTIN">
            <TextInput style={styles.input} autoCapitalize="characters" value={gstin} onChangeText={setGstin} placeholder="15-digit GSTIN" placeholderTextColor={colors.textDim} />
          </Field>

          <Field label="Address">
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={address}
              onChangeText={setAddress}
              placeholder="Full address"
              placeholderTextColor={colors.textDim}
            />
          </Field>

          {/* Coordinates — pasted from Google Maps so Lalamove and future
              geolocation features can send couriers straight to the door.
              Web supports one-tap paste via the clipboard API; on native
              the operator paste-and-blurs into the box below. */}
          <Field label="Coordinates (Google Maps)">
            <View style={styles.coordCaptureBox}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={
                  lat && lng
                    ? `${lat}, ${lng}`
                    : ""
                }
                placeholder="Paste 13.7563, 100.5018 or a Google Maps link"
                placeholderTextColor={colors.textDim}
                onChangeText={(t) => {
                  const parsed = parseCoordinates(t);
                  if (parsed) {
                    setLat(parsed.lat);
                    setLng(parsed.lng);
                  } else if (!t.trim()) {
                    setLat("");
                    setLng("");
                  }
                }}
                autoCapitalize="none"
                autoCorrect={false}
                testID="input-coords"
              />
              <TouchableOpacity
                onPress={handlePasteCoordinates}
                style={styles.pasteBtn}
                testID="paste-coords-btn"
              >
                <Ionicons name="clipboard-outline" size={14} color={colors.lime} />
                <Text style={styles.pasteBtnText}>Paste</Text>
              </TouchableOpacity>
            </View>
            {lat && lng ? (
              <View style={styles.coordConfirmRow}>
                <View style={styles.coordPill}>
                  <Ionicons name="location" size={11} color={colors.lime} />
                  <Text style={styles.coordPillText}>
                    Lat {lat} · Lng {lng}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setLat("");
                    setLng("");
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={16} color={colors.textDim} />
                </TouchableOpacity>
              </View>
            ) : null}
            <Text style={styles.hint}>
              Open Google Maps → long-press the drop pin → tap the coordinates
              at the top → paste them here. We&apos;ll pass these to Lalamove
              when you book a courier for this party.
            </Text>
          </Field>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: 8 },
  headTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "800" },
  saveBtn: { backgroundColor: colors.lime, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill },
  saveText: { color: colors.bg, fontWeight: "800", fontSize: 13 },
  content: { padding: spacing.lg },
  field: { marginBottom: spacing.md },
  label: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  segRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  seg: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  segActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  segText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  segTextActive: { color: colors.bg },
  row2: { flexDirection: "row" },
  rateRow: { flexDirection: "row", alignItems: "center" },
  hint: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },
  coordCaptureBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pasteBtnText: { color: colors.lime, fontSize: 12, fontWeight: "800" },
  coordConfirmRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  coordPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
  },
  coordPillText: { color: colors.lime, fontSize: 11, fontWeight: "800" },
});
