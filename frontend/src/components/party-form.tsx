/**
 * PartyForm — Shared full-page form used by /party/new and
 * /party/[id]/edit. Phase 3 · Fix 3c.
 *
 * Fields (all optional except name):
 *   Name*, Role, Phone, Address, Latitude, Longitude, Notes
 *   Photo (Coming Soon — disabled placeholder).
 *
 * On save:
 *   • POST /api/parties (create) or PATCH /api/parties/{id} (edit)
 *   • PUT  /api/parties/{id}/meta with {notes, photo_url}  (local overlay)
 *   • On success → router.back()
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet, apiPatch, apiPost, apiPut } from "@/src/lib/api";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard } from "@/src/lib/ui";

export type PartyFormValues = {
  id?: string;
  name?: string;
  role?: string;
  phone?: string;
  address?: string;
  lat?: string;
  lng?: string;
  notes?: string;
  photo_url?: string | null;
  gstin?: string;
};

const ROLES: { key: string; label: string }[] = [
  { key: "customer", label: "Customer" },
  { key: "end_customer", label: "End Customer" },
  { key: "carrier", label: "Carrier" },
  { key: "other", label: "Other" },
];

export function PartyForm({
  title,
  subtitle,
  initial,
  submitLabel,
}: {
  title: string;
  subtitle: string;
  initial?: PartyFormValues;
  submitLabel: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name || "");
  const [role, setRole] = useState<string>(initial?.role || "customer");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [lat, setLat] = useState(initial?.lat ? String(initial.lat) : "");
  const [lng, setLng] = useState(initial?.lng ? String(initial.lng) : "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [saving, setSaving] = useState(false);
  // Fix 4 (Phase 7 · Batch C-2) · GSTIN + auto-lookup state.
  const [gstin, setGstin] = useState(initial?.gstin || "");
  const [gstStatus, setGstStatus] = useState<
    "idle" | "checking" | "verified" | "invalid"
  >("idle");
  const [gstLegalName, setGstLegalName] = useState<string>("");

  const canSubmit = useMemo(() => name.trim().length > 0 && !saving, [name, saving]);

  // Fix 4 (Phase 7 · Batch C-2) · Debounced GSTIN auto-lookup.
  // When user types a 15-char GSTIN we ping the backend which relays
  // to the RapidAPI GST-verification service and returns the legal
  // name + address. Successful lookups auto-fill `name` (only if
  // still blank) + `address` (only if blank). Fails silently — user
  // can always fill in manually.
  useEffect(() => {
    const g = gstin.trim().toUpperCase();
    if (g.length === 0) {
      setGstStatus("idle");
      setGstLegalName("");
      return;
    }
    if (g.length !== 15) {
      setGstStatus("invalid");
      setGstLegalName("");
      return;
    }
    setGstStatus("checking");
    const handle = setTimeout(() => {
      apiGet<{ valid: boolean; legal_name?: string; address?: string; state?: string }>(
        `/api/parties/lookup-gstin?gstin=${g}`,
      )
        .then((r) => {
          if (r?.valid && r.legal_name) {
            setGstStatus("verified");
            setGstLegalName(r.legal_name);
            if (!name.trim()) setName(r.legal_name);
            if (!address.trim() && r.address) setAddress(r.address);
          } else {
            setGstStatus("invalid");
            setGstLegalName("");
          }
        })
        .catch(() => {
          setGstStatus("invalid");
          setGstLegalName("");
        });
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstin]);

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const upstreamBody: Record<string, unknown> = {
        name: name.trim(),
        role,
        phone: phone.trim() || null,
        address: address.trim() || null,
        gstin: gstin.trim() || null,
        // Upstream schema stores lat/lng as strings — send as-is.
        lat: lat.trim() || null,
        lng: lng.trim() || null,
      };
      let saved: { id: string };
      if (initial?.id) {
        saved = await apiPatch<{ id: string }>(
          `/api/parties/${initial.id}`,
          upstreamBody,
        );
      } else {
        saved = await apiPost<{ id: string }>("/api/parties", upstreamBody);
      }

      // Fix 3d overlay · Store notes + photo_url in local meta table.
      const pid = saved.id;
      try {
        await apiPut(`/api/parties/${pid}/meta`, {
          party_id: pid,
          notes: notes.trim() || null,
          photo_url: initial?.photo_url ?? null,
        });
      } catch {
        /* non-blocking */
      }

      router.back();
    } catch (e) {
      Alert.alert("Save failed", (e as Error).message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.card}>
          {/* Name */}
          <Text style={styles.label}>
            Name<Text style={{ color: colors.danger }}> *</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ravi Enterprises"
            placeholderTextColor={colors.textDim}
            autoCapitalize="words"
          />

          {/* Role */}
          <Text style={styles.label}>Role</Text>
          <View style={styles.rolePillRow}>
            {ROLES.map((r) => {
              const active = role === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setRole(r.key)}
                  activeOpacity={0.75}
                  style={[styles.rolePill, active && styles.rolePillActive]}
                >
                  <Text
                    style={[styles.rolePillText, active && styles.rolePillTextActive]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Phone */}
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98xxxxxxxx"
            placeholderTextColor={colors.textDim}
            keyboardType="phone-pad"
          />

          {/* Fix 4 (Phase 7 · Batch C-2) · GSTIN auto-lookup */}
          <Text style={styles.label}>GSTIN (optional)</Text>
          <TextInput
            style={styles.input}
            value={gstin}
            onChangeText={(v) => setGstin(v.toUpperCase())}
            placeholder="15-digit GSTIN (auto-fetches company details)"
            placeholderTextColor={colors.textDim}
            autoCapitalize="characters"
            maxLength={15}
          />
          {gstStatus === "checking" ? (
            <Text style={[styles.label, { color: colors.textDim, marginTop: 4 }]}>
              Verifying GSTIN…
            </Text>
          ) : gstStatus === "verified" ? (
            <Text style={[styles.label, { color: "#00C853", marginTop: 4 }]}>
              ✓ GST Verified · {gstLegalName}
            </Text>
          ) : gstStatus === "invalid" && gstin.length >= 15 ? (
            <Text style={[styles.label, { color: "#E53935", marginTop: 4 }]}>
              ✗ Invalid GSTIN or not found
            </Text>
          ) : null}

          {/* Address */}
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.multi]}
            value={address}
            onChangeText={setAddress}
            placeholder="Building, street, city, PIN"
            placeholderTextColor={colors.textDim}
            multiline
          />

          {/* Lat / Long */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput
                style={styles.input}
                value={lat}
                onChangeText={setLat}
                placeholder="13.75"
                placeholderTextColor={colors.textDim}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput
                style={styles.input}
                value={lng}
                onChangeText={setLng}
                placeholder="100.5"
                placeholderTextColor={colors.textDim}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Notes */}
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multi]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any internal remarks…"
            placeholderTextColor={colors.textDim}
            multiline
          />

          {/* Photo placeholder */}
          <Text style={styles.label}>Photo</Text>
          <View style={[styles.input, styles.photoBtn]}>
            <Ionicons name="image" size={18} color={colors.textDim} />
            <Text style={styles.photoText}>Add Photo — Coming Soon</Text>
          </View>
        </GlassCard>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.ghost]}
            onPress={() => router.back()}
            disabled={saving}
            activeOpacity={0.75}
          >
            <Text style={styles.ghostText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.primary,
              (!canSubmit || saving) && { opacity: 0.5 },
            ]}
            onPress={submit}
            disabled={!canSubmit || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.bgSolid} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color={colors.bgSolid} />
                <Text style={styles.primaryText}>{submitLabel}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  card: { padding: spacing.md, gap: 4 },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  row: { flexDirection: "row", gap: spacing.md },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  multi: { minHeight: 68 },
  rolePillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rolePillActive: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  rolePillText: { color: colors.textDim, fontSize: 11, fontWeight: "700" },
  rolePillTextActive: { color: colors.brand },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    opacity: 0.5,
  },
  photoText: { color: colors.textDim, fontSize: 12 },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  ghost: { backgroundColor: "transparent", borderColor: colors.cardBorder },
  ghostText: { color: colors.textDim, fontSize: 14, fontWeight: "700" },
  primary: { backgroundColor: colors.brand, borderColor: colors.brand },
  primaryText: { color: colors.bgSolid, fontSize: 14, fontWeight: "800" },
});
