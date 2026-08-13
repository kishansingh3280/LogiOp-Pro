/**
 * Party detail — Phase 3.
 *
 * Deep-linked at /party/:id. Shows:
 *   • Identity card (name, role, contact)
 *   • Ledger summary for this party (net balance, INR + THB)
 *   • Recent ledger entries (last 20, debit red / credit green)
 *   • Recent shipments (filtered to this party)
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { fmtCurrency, shortDate, titleCase } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, LabelValueRow, Pill } from "@/src/lib/ui";

type Party = {
  id: string;
  name: string;
  role: string;
  country?: string;
  default_currency?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  lat?: string | number | null;
  lng?: string | number | null;
  notes?: string | null;
  photo_url?: string | null;
  opening_balance_inr?: number;
  opening_balance_thb?: number;
};

type LedgerEntry = {
  id: string;
  party_id: string;
  date?: string;
  description: string;
  currency: "INR" | "THB";
  debit: number;
  credit: number;
  ref_type?: string;
};

type Shipment = {
  id: string;
  consignment_no: string;
  status: string;
  weight_kg: number;
  bag_count: number;
  created_at: string;
  party_id: string;
  direction: "IN_TO_TH" | "TH_TO_IN";
};

// Fix 3b (Phase 3) · Match parties list palette.
const ROLE_TINT: Record<string, { tint: string; soft: string }> = {
  customer: { tint: "#00FFFF", soft: "rgba(0,255,255,0.15)" },
  end_customer: { tint: "#FFD700", soft: "rgba(255,215,0,0.15)" },
  supplier: { tint: "#FFA500", soft: "rgba(255,165,0,0.15)" },
  vendor: { tint: "#FFA500", soft: "rgba(255,165,0,0.15)" },
  carrier: { tint: "#8B00FF", soft: "rgba(139,0,255,0.15)" },
  other: { tint: "#9E9E9E", soft: "rgba(158,158,158,0.15)" },
};

export default function PartyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [party, setParty] = useState<Party | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [p, allEntries, allShipments] = await Promise.all([
        apiGet<Party>(`/api/parties/${id}`),
        apiGet<LedgerEntry[]>("/api/ledger/entries").catch(() => []),
        apiGet<Shipment[]>("/api/shipments").catch(() => []),
      ]);
      setParty(p);
      setEntries((allEntries || []).filter((e) => e.party_id === id));
      setShipments((allShipments || []).filter((s) => s.party_id === id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (token && id) load();
  }, [token, id, load]);

  // ── Ledger balance (party-side accounting convention):
  //    credit → we owe them   (payable → red)
  //    debit  → they owe us   (receivable → green)
  const balance = useMemo(() => {
    if (!entries) return { inr: 0, thb: 0 };
    const b = { inr: 0, thb: 0 };
    entries.forEach((e) => {
      const key = e.currency === "THB" ? "thb" : "inr";
      b[key] += (e.debit || 0) - (e.credit || 0);
    });
    return b;
  }, [entries]);

  const recentEntries = useMemo(() => {
    if (!entries) return [];
    return entries
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 15);
  }, [entries]);

  const recentShipments = useMemo(() => {
    if (!shipments) return [];
    return shipments
      .slice()
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
      .slice(0, 10);
  }, [shipments]);

  const roleKey = (party?.role || "other").toLowerCase();
  const roleTint = ROLE_TINT[roleKey] ?? ROLE_TINT.other;

  // Fix 3b · Only show "Book Lalamove" when party has coordinates.
  const hasCoords = !!(party?.lat && party?.lng);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {party?.name || "Party"}
          </Text>
          <Text style={styles.subtitle}>{party ? titleCase(party.role) : ""}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        {party === null && loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.dim}>Loading party…</Text>
          </View>
        ) : error ? (
          <GlassCard style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.errorText} numberOfLines={3}>
              {error}
            </Text>
            <TouchableOpacity style={styles.retry} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : party ? (
          <>
            {/* Identity */}
            <GlassCard glow style={styles.identityCard}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: roleTint.soft, borderColor: roleTint.tint },
                ]}
              >
                <Text style={[styles.avatarText, { color: roleTint.tint }]}>
                  {party.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.identityName}>{party.name}</Text>
              <View style={{ marginTop: 6 }}>
                <Pill
                  label={titleCase(party.role)}
                  tint={roleTint.tint}
                  soft={roleTint.soft}
                />
              </View>
              <View style={styles.contactRow}>
                {party.phone ? (
                  <ContactBtn icon="call" label={party.phone} onPress={() => Linking.openURL(`tel:${party.phone}`)} />
                ) : null}
                {party.email ? (
                  <ContactBtn icon="mail" label="Email" onPress={() => Linking.openURL(`mailto:${party.email}`)} />
                ) : null}
              </View>
            </GlassCard>

            {/* Balance summary */}
            <Text style={styles.section}>Net balance</Text>
            <View style={styles.grid}>
              <BalanceBox amount={balance.inr} currency="INR" />
              <BalanceBox amount={balance.thb} currency="THB" />
            </View>

            {/* Fix 3b · Action buttons row */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push(`/party/${id}/statement` as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text" size={16} color={colors.brand} />
                <Text style={styles.actionText}>View Ledger</Text>
              </TouchableOpacity>
              {hasCoords ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/lalamove",
                      params: { party_id: id },
                    } as any)
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="bicycle" size={16} color={colors.brand} />
                  <Text style={styles.actionText}>Book Lalamove</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push(`/party/${id}/edit` as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="create" size={16} color={colors.brand} />
                <Text style={styles.actionText}>Edit Party</Text>
              </TouchableOpacity>
            </View>

            {/* Fix 3b · Contact card (phone, address, lat/long) */}
            <Text style={styles.section}>Contact</Text>
            <GlassCard>
              <LabelValueRow label="Phone" value={party.phone || "—"} />
              <LabelValueRow label="Address" value={party.address || "—"} />
              {(party.lat || party.lng) ? (
                <LabelValueRow
                  label="Lat / Long"
                  value={`${party.lat || "—"}, ${party.lng || "—"}`}
                />
              ) : null}
              {party.notes ? <LabelValueRow label="Notes" value={party.notes} /> : null}
            </GlassCard>

            {/* Contact / meta */}
            <Text style={styles.section}>Details</Text>
            <GlassCard>
              <LabelValueRow label="Country" value={party.country || "—"} />
              <LabelValueRow
                label="Default currency"
                value={party.default_currency || "—"}
              />
              {party.gstin ? <LabelValueRow label="GSTIN" value={party.gstin} /> : null}
              {party.address ? <LabelValueRow label="Address" value={party.address} /> : null}
              {(party.opening_balance_inr ?? 0) !== 0 ? (
                <LabelValueRow
                  label="Opening balance · INR"
                  value={fmtCurrency(party.opening_balance_inr ?? 0, "INR")}
                  valueColor={
                    (party.opening_balance_inr ?? 0) >= 0 ? colors.credit : colors.debit
                  }
                />
              ) : null}
              {(party.opening_balance_thb ?? 0) !== 0 ? (
                <LabelValueRow
                  label="Opening balance · THB"
                  value={fmtCurrency(party.opening_balance_thb ?? 0, "THB")}
                  valueColor={
                    (party.opening_balance_thb ?? 0) >= 0 ? colors.credit : colors.debit
                  }
                />
              ) : null}
            </GlassCard>

            {/* Recent entries */}
            {recentEntries.length ? (
              <>
                <Text style={styles.section}>Recent ledger entries</Text>
                <GlassCard>
                  {recentEntries.map((e, idx, arr) => {
                    const isDebit = e.debit > 0;
                    const amount = isDebit ? e.debit : e.credit;
                    const tint = isDebit ? colors.debit : colors.credit;
                    return (
                      <View
                        key={e.id}
                        style={[
                          styles.entryRow,
                          idx < arr.length - 1 && styles.entryRowBorder,
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.entryDesc} numberOfLines={1}>
                            {e.description}
                          </Text>
                          <Text style={styles.entrySub}>{shortDate(e.date)}</Text>
                        </View>
                        <Text style={[styles.entryAmt, { color: tint }]}>
                          {isDebit ? "− " : "+ "}
                          {fmtCurrency(amount, e.currency)}
                        </Text>
                      </View>
                    );
                  })}
                </GlassCard>
              </>
            ) : null}

            {/* Recent shipments */}
            {recentShipments.length ? (
              <>
                <Text style={styles.section}>Recent shipments</Text>
                <GlassCard>
                  {recentShipments.map((s, idx, arr) => (
                    <TouchableOpacity
                      key={s.id}
                      activeOpacity={0.75}
                      onPress={() => router.push(`/shipment/${s.id}` as any)}
                      style={[
                        styles.shipRow,
                        idx < arr.length - 1 && styles.entryRowBorder,
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entryDesc} numberOfLines={1}>
                          {s.consignment_no}
                        </Text>
                        <Text style={styles.entrySub}>
                          {s.direction === "IN_TO_TH" ? "IN → TH" : "TH → IN"} ·{" "}
                          {shortDate(s.created_at)}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", marginRight: 6 }}>
                        <Text style={styles.entryAmt}>{s.weight_kg} kg</Text>
                        <Text style={styles.entrySub}>
                          {s.bag_count} bag{s.bag_count !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                    </TouchableOpacity>
                  ))}
                </GlassCard>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function BalanceBox({ amount, currency }: { amount: number; currency: "INR" | "THB" }) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const tint = isPositive ? colors.credit : isNegative ? colors.debit : colors.textMuted;
  const label = isPositive ? "They owe us" : isNegative ? "We owe them" : "Settled";
  return (
    <View style={styles.stat}>
      <View style={styles.statHeader}>
        <View style={[styles.statDot, { backgroundColor: tint }]} />
        <Text style={styles.statLabel}>
          {label} · {currency}
        </Text>
      </View>
      <Text style={[styles.statValue, { color: tint }]}>
        {fmtCurrency(Math.abs(amount), currency)}
      </Text>
    </View>
  );
}

function ContactBtn({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.contactBtn} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon} size={14} color={colors.brand} />
      <Text style={styles.contactText} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
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
  title: { color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingBottom: 80 },
  identityCard: { padding: spacing.lg, alignItems: "center", marginBottom: spacing.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 26, fontWeight: "800" },
  identityName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  contactRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSoft,
  },
  contactText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  section: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stat: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  statHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    flex: 1,
  },
  statValue: { fontSize: 20, fontWeight: "800", marginTop: 6, letterSpacing: 0.2 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: spacing.md,
  },
  shipRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: spacing.sm,
  },
  entryRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  entryDesc: { color: colors.text, fontSize: 13, fontWeight: "600" },
  entrySub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  entryAmt: { fontSize: 13, fontWeight: "800" },
  statementBtn: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  statementTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  statementSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  // Fix 3b · Action buttons row (View Ledger / Book Lalamove / Edit).
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.md,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSoft,
    flexGrow: 1,
    justifyContent: "center",
    minWidth: "30%",
  },
  actionText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  loading: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  dim: { color: colors.textDim, fontSize: 11 },
  errorCard: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderColor: colors.danger,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 12 },
  retry: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});
