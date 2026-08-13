/**
 * Invoice → Shipment "Packing Mode" — Fix C · Phase 7.
 *
 * A full-page workflow the operator opens from an invoice detail
 * screen. Every line-item from the invoice appears at the top;
 * every bag they create appears at the bottom. Tap an item to
 * assign it to a bag (or unassign). Live progress bar shows how
 * many items are packed. When all items are packed the "Confirm"
 * button becomes active and, on tap, creates a shipment whose
 * bags reference the invoice's party + items.
 *
 * Route: /invoice/[id]/pack (nested under /app/invoice/[id]/pack.tsx)
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import { apiGet, apiPost } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { useCompany } from "@/src/lib/company-context";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard } from "@/src/lib/ui";

type Currency = "INR" | "THB";

type InvoiceItem = {
  description: string;
  quantity: number;
  unit?: string;
  rate: number;
};

type Invoice = {
  id: string;
  number?: string;
  party_id: string;
  currency?: Currency;
  items: InvoiceItem[];
  company?: string;
  mode?: string;
  company_mode?: string;
};

type Party = { id: string; name: string; role?: string };

type PackedItem = {
  key: string;             // stable id across renders
  description: string;
  quantity: number;
  bag_key: string | null;  // null → unpacked
};

type Bag = {
  key: string;
  bag_no: number;
  weight_kg: string;       // free-form input
};

export default function InvoicePackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { activeCompany, activeMode } = useCompany();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [packedItems, setPackedItems] = useState<PackedItem[]>([]);
  const [bags, setBags] = useState<Bag[]>([
    { key: `bag-${Date.now()}`, bag_no: 1, weight_kg: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load invoice + party once.
  const load = useCallback(async () => {
    if (!id || !token) return;
    setLoading(true);
    setError(null);
    try {
      const inv = await apiGet<Invoice>(`/api/invoices/${id}`);
      setInvoice(inv);
      const items = Array.isArray(inv.items) ? inv.items : [];
      setPackedItems(
        items.map((it, idx) => ({
          key: `it-${idx}`,
          description: it.description || `Item ${idx + 1}`,
          quantity: Number(it.quantity) || 0,
          bag_key: null,
        })),
      );
      if (inv.party_id) {
        const p = await apiGet<Party>(`/api/parties/${inv.party_id}`).catch(
          () => null as Party | null,
        );
        if (p) setParty(p);
      }
    } catch (e) {
      setError((e as Error).message || "Could not load invoice.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  // Progress
  const total = packedItems.length;
  const packedCount = packedItems.filter((p) => p.bag_key).length;
  const progressPct = total > 0 ? Math.round((packedCount / total) * 100) : 0;
  const allPacked = total > 0 && packedCount === total;

  // Bag helpers
  const addBag = () => {
    setBags((prev) => [
      ...prev,
      { key: `bag-${Date.now()}-${prev.length}`, bag_no: prev.length + 1, weight_kg: "" },
    ]);
  };
  const removeBag = (key: string) => {
    // Unassign items in this bag
    setPackedItems((prev) =>
      prev.map((it) => (it.bag_key === key ? { ...it, bag_key: null } : it)),
    );
    setBags((prev) =>
      prev.filter((b) => b.key !== key).map((b, i) => ({ ...b, bag_no: i + 1 })),
    );
  };
  const setBagWeight = (key: string, v: string) => {
    setBags((prev) => prev.map((b) => (b.key === key ? { ...b, weight_kg: v } : b)));
  };

  const assignToBag = (itemKey: string, bagKey: string) => {
    setPackedItems((prev) =>
      prev.map((it) =>
        it.key === itemKey ? { ...it, bag_key: it.bag_key === bagKey ? null : bagKey } : it,
      ),
    );
  };

  const itemsByBag = useMemo(() => {
    const m: Record<string, PackedItem[]> = {};
    packedItems.forEach((p) => {
      if (p.bag_key) {
        m[p.bag_key] = m[p.bag_key] || [];
        m[p.bag_key].push(p);
      }
    });
    return m;
  }, [packedItems]);

  const onConfirm = async () => {
    if (!invoice || !allPacked) return;
    setSaving(true);
    try {
      const invMode = String(invoice.company_mode || invoice.mode || activeMode || "informal");
      const bagPayload = bags.map((b) => {
        const its = itemsByBag[b.key] || [];
        return {
          bag_no: b.bag_no,
          weight_kg: Number(b.weight_kg) || 0,
          bag_date: new Date().toISOString().slice(0, 10),
          items: its.map((it) => ({
            item_name: it.description,
            pieces: it.quantity,
          })),
          customer_party_id: invoice.party_id,
          freight: 0,
          freight_currency: (invoice.currency as Currency) || "INR",
        };
      });
      const payload: Record<string, unknown> = {
        direction: "IN_TO_TH",
        mode: "hand_carry",
        origin: "Delhi",
        destination: "Bangkok",
        bag_count: bagPayload.length,
        weight_kg: bagPayload.reduce((s, b) => s + (b.weight_kg || 0), 0),
        party_id: invoice.party_id,
        party_ids: [invoice.party_id],
        bags: bagPayload,
        notes: `Packed from Invoice ${invoice.number || invoice.id.slice(0, 8)}`,
        company_id: invoice.company || activeCompany || "awadh",
        company_mode: invMode,
        status: "pending",
        source_invoice_id: invoice.id,
      };
      const res = await apiPost<{ id?: string }>("/api/shipments", payload);
      if (res?.id) {
        router.replace(`/shipment/${res.id}` as never);
      } else {
        router.replace("/shipments" as never);
      }
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
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Packing Mode</Text>
          <Text style={styles.subtitle}>
            Invoice {invoice?.number ? `#${invoice.number}` : ""} → Shipment
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={22} color={colors.danger} />
          <Text style={{ color: colors.text, marginTop: 8 }}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Progress */}
          <GlassCard>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                PACKED: <Text style={{ color: colors.brand }}>{packedCount}</Text>/{total}{" "}
                items
              </Text>
              <Text style={styles.progressPct}>{progressPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPct}%`, backgroundColor: allPacked ? colors.brand : colors.warn },
                ]}
              />
            </View>
            {party ? (
              <Text style={styles.dim}>
                Bill To: <Text style={{ color: colors.text }}>{party.name}</Text>
              </Text>
            ) : null}
          </GlassCard>

          {/* Items */}
          <Text style={styles.section}>ITEMS TO PACK</Text>
          <GlassCard>
            {packedItems.length === 0 ? (
              <Text style={styles.emptyRow}>No items on this invoice.</Text>
            ) : (
              packedItems.map((it) => (
                <View key={it.key} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{it.description}</Text>
                    <Text style={styles.dim}>{it.quantity} pcs</Text>
                  </View>
                  <View style={styles.bagChipsRow}>
                    {bags.map((b) => {
                      const active = it.bag_key === b.key;
                      return (
                        <TouchableOpacity
                          key={b.key}
                          onPress={() => assignToBag(it.key, b.key)}
                          activeOpacity={0.75}
                          style={[styles.bagChip, active && styles.bagChipActive]}
                        >
                          <Text
                            style={[
                              styles.bagChipText,
                              active && styles.bagChipTextActive,
                            ]}
                          >
                            Bag {b.bag_no}
                            {active ? " ✓" : ""}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </GlassCard>

          {/* Bags */}
          <View style={styles.bagsHeader}>
            <Text style={styles.section}>BAGS</Text>
            <TouchableOpacity
              style={styles.addBagBtn}
              onPress={addBag}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={14} color={colors.brand} />
              <Text style={styles.addBagText}>Bag Jodo</Text>
            </TouchableOpacity>
          </View>
          {bags.map((b) => {
            const its = itemsByBag[b.key] || [];
            return (
              <GlassCard key={b.key} style={styles.bagCard}>
                <View style={styles.bagCardHead}>
                  <Text style={styles.bagCardTitle}>Bag {b.bag_no}</Text>
                  {bags.length > 1 ? (
                    <TouchableOpacity
                      onPress={() => removeBag(b.key)}
                      hitSlop={12}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.dim}>
                  {its.length} item{its.length === 1 ? "" : "s"} packed
                </Text>
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.miniLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={b.weight_kg}
                    onChangeText={(v) => setBagWeight(b.key, v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textDim}
                  />
                </View>
              </GlassCard>
            );
          })}

          {/* Confirm */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!allPacked || saving) && { opacity: 0.5 },
            ]}
            onPress={onConfirm}
            disabled={!allPacked || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color={colors.bg} />
                <Text style={styles.confirmBtnText}>
                  {allPacked
                    ? "✓ Shipment Confirm Karo"
                    : `${total - packedCount} items still to pack`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
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
  title: { color: colors.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  progressPct: { color: colors.brand, fontSize: 13, fontWeight: "800" },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.divider,
    overflow: "hidden",
  },
  progressFill: { height: "100%" },
  section: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
    marginTop: spacing.sm,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dim: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  emptyRow: { color: colors.textDim, fontSize: 12, padding: 12, textAlign: "center" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemName: { color: colors.text, fontSize: 13, fontWeight: "700" },
  bagChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    maxWidth: 180,
    justifyContent: "flex-end",
  },
  bagChip: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.card,
  },
  bagChipActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  bagChipText: { color: colors.textDim, fontSize: 11, fontWeight: "700" },
  bagChipTextActive: { color: colors.brand },
  bagsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  addBagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  addBagText: { color: colors.brand, fontSize: 11, fontWeight: "700" },
  bagCard: { padding: spacing.md },
  bagCardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bagCardTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  miniLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
  },
  confirmBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmBtnText: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
