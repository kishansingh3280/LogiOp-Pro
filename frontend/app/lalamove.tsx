/**
 * Lalamove screen — Fix 4.
 *
 * Restored (leaner) version of the previous quarantined screen.
 * Talks to the backend endpoints exposed at /api/lalamove/*:
 *   • GET  /api/lalamove/config   — { configured, market, sandbox }
 *   • GET  /api/lalamove/orders   — list of past orders
 *   • POST /api/lalamove/quote    — get delivery quote
 *   • POST /api/lalamove/order    — book a delivery
 *
 * Behaviour:
 *   • Status banner (green when configured, red when API key missing).
 *   • Orders list with pull-to-refresh.
 *   • "Book new" opens a modal with pickup + drop-off + service picker.
 *     If not configured, the CTA is disabled and shows a hint pointing
 *     Admin to enter the LALAMOVE_API_KEY.
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
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
import { shortDate } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, Pill } from "@/src/lib/ui";

type LalamoveConfig = {
  configured: boolean;
  market?: string;
  base_url?: string;
  sandbox?: boolean;
};

type LalamoveOrder = {
  id?: string;
  order_id?: string;
  status?: string;
  service?: string;
  price?: { total?: number; currency?: string };
  created_at?: string;
  pickup?: { address?: string };
  dropoff?: { address?: string };
};

type Service = "MOTORCYCLE" | "CAR" | "VAN";
const SERVICES: {
  key: Service;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { key: "MOTORCYCLE", label: "Motorcycle", icon: "bicycle" },
  { key: "CAR", label: "Car", icon: "car" },
  { key: "VAN", label: "Van", icon: "cube" },
];

export default function LalamoveScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<LalamoveConfig | null>(null);
  const [orders, setOrders] = useState<LalamoveOrder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfg, ords] = await Promise.all([
        apiGet<LalamoveConfig>("/api/lalamove/config"),
        apiGet<LalamoveOrder[]>("/api/lalamove/orders"),
      ]);
      setConfig(cfg);
      setOrders(Array.isArray(ords) ? ords : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const configured = !!config?.configured;

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
          <Text style={styles.title}>Lalamove</Text>
          <Text style={styles.subtitle}>Instant last-mile delivery</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        {config ? (
          <GlassCard
            style={[
              styles.banner,
              configured ? styles.bannerOk : styles.bannerWarn,
            ]}
          >
            <Ionicons
              name={configured ? "checkmark-circle" : "warning"}
              size={22}
              color={configured ? colors.brand : colors.warn}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                {configured ? "Lalamove connected" : "Not configured"}
              </Text>
              <Text style={styles.bannerSub}>
                {configured
                  ? `Market: ${config.market || "IN"}${config.sandbox ? " · sandbox" : ""}`
                  : "Ask Admin to add LALAMOVE_API_KEY in backend .env"}
              </Text>
            </View>
          </GlassCard>
        ) : loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.dim}>Loading Lalamove…</Text>
          </View>
        ) : null}

        {error ? (
          <GlassCard style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.errorText} numberOfLines={3}>
              {error}
            </Text>
            <TouchableOpacity style={styles.retry} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : null}

        {/* Orders list */}
        <Text style={styles.section}>Orders</Text>
        {orders && orders.length ? (
          orders.map((o, idx) => (
            <GlassCard key={o.id || o.order_id || idx} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <Text style={styles.orderId} numberOfLines={1}>
                  {o.order_id || o.id || `order-${idx + 1}`}
                </Text>
                <Pill
                  label={(o.status || "unknown").toString()}
                  tint={
                    (o.status || "").toLowerCase() === "completed"
                      ? colors.brand
                      : colors.info
                  }
                  soft={
                    (o.status || "").toLowerCase() === "completed"
                      ? colors.brandSoft
                      : colors.infoSoft
                  }
                  size="sm"
                />
              </View>
              {o.pickup?.address ? (
                <Text style={styles.orderMeta} numberOfLines={1}>
                  <Ionicons name="location" size={12} color={colors.brand} />{" "}
                  {o.pickup.address}
                </Text>
              ) : null}
              {o.dropoff?.address ? (
                <Text style={styles.orderMeta} numberOfLines={1}>
                  <Ionicons name="flag" size={12} color={colors.info} />{" "}
                  {o.dropoff.address}
                </Text>
              ) : null}
              <View style={styles.orderFoot}>
                <Text style={styles.orderService}>
                  {(o.service || "—").toString().toUpperCase()}
                </Text>
                <Text style={styles.orderPrice}>
                  {o.price?.currency || ""} {o.price?.total ?? "—"}
                </Text>
                <Text style={styles.dim}>{shortDate(o.created_at)}</Text>
              </View>
            </GlassCard>
          ))
        ) : (
          <GlassCard style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={28} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySub}>
              Book your first Lalamove delivery to see it here.
            </Text>
          </GlassCard>
        )}
      </ScrollView>

      {/* FAB · Book new */}
      <TouchableOpacity
        style={[styles.fab, !configured && styles.fabDisabled]}
        onPress={() => {
          if (!configured) {
            Alert.alert(
              "Not configured",
              "Ask Admin to set LALAMOVE_API_KEY in backend .env before booking.",
            );
            return;
          }
          setModalOpen(true);
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={22} color={colors.bgSolid} />
        <Text style={styles.fabText}>Book new</Text>
      </TouchableOpacity>

      {modalOpen ? (
        <BookModal
          onClose={() => setModalOpen(false)}
          onBooked={async () => {
            setModalOpen(false);
            await load();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ─── Booking modal ─────────────────────────────────────────────────
function BookModal({
  onClose,
  onBooked,
}: {
  onClose: () => void;
  onBooked: () => void | Promise<void>;
}) {
  const [service, setService] = useState<Service>("MOTORCYCLE");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffPhone, setDropoffPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<{ total?: number; currency?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const canQuote =
    pickupAddress.trim().length > 3 && dropoffAddress.trim().length > 3;
  const canBook = !!quote && !!pickupPhone && !!dropoffPhone;

  const buildPayload = useMemo(
    () => ({
      service,
      pickup: { address: pickupAddress.trim(), phone: pickupPhone.trim() },
      dropoff: [{ address: dropoffAddress.trim(), phone: dropoffPhone.trim() }],
      notes: notes.trim() || undefined,
    }),
    [service, pickupAddress, pickupPhone, dropoffAddress, dropoffPhone, notes],
  );

  const handleQuote = async () => {
    if (!canQuote) return;
    setBusy(true);
    try {
      const r = await apiPost<{ price?: { total?: number; currency?: string } }>(
        "/api/lalamove/quote",
        buildPayload,
      );
      setQuote(r?.price || null);
    } catch (e) {
      Alert.alert("Quote failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleBook = async () => {
    if (!canBook) return;
    setBusy(true);
    try {
      await apiPost("/api/lalamove/order", buildPayload);
      Alert.alert("Booked", "Your Lalamove delivery has been booked.");
      await onBooked();
    } catch (e) {
      Alert.alert("Booking failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book a Delivery</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 540 }} showsVerticalScrollIndicator={false}>
            {/* Service picker */}
            <Text style={styles.modalLabel}>Service</Text>
            <View style={styles.serviceRow}>
              {SERVICES.map((s) => {
                const active = service === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.serviceBtn, active && styles.serviceBtnActive]}
                    onPress={() => {
                      setService(s.key);
                      setQuote(null); // re-quote when service changes
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={s.icon}
                      size={20}
                      color={active ? colors.brand : colors.textDim}
                    />
                    <Text
                      style={[
                        styles.serviceLabel,
                        { color: active ? colors.brand : colors.textDim },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Pickup */}
            <Text style={styles.modalLabel}>Pickup address</Text>
            <TextInput
              style={styles.input}
              value={pickupAddress}
              onChangeText={(v) => {
                setPickupAddress(v);
                setQuote(null);
              }}
              placeholder="Full pickup address"
              placeholderTextColor={colors.textDim}
            />
            <Text style={styles.modalLabel}>Pickup phone</Text>
            <TextInput
              style={styles.input}
              value={pickupPhone}
              onChangeText={setPickupPhone}
              placeholder="+91 …"
              placeholderTextColor={colors.textDim}
              keyboardType="phone-pad"
            />

            {/* Drop-off */}
            <Text style={styles.modalLabel}>Drop-off address</Text>
            <TextInput
              style={styles.input}
              value={dropoffAddress}
              onChangeText={(v) => {
                setDropoffAddress(v);
                setQuote(null);
              }}
              placeholder="Full drop-off address"
              placeholderTextColor={colors.textDim}
            />
            <Text style={styles.modalLabel}>Drop-off phone</Text>
            <TextInput
              style={styles.input}
              value={dropoffPhone}
              onChangeText={setDropoffPhone}
              placeholder="+91 …"
              placeholderTextColor={colors.textDim}
              keyboardType="phone-pad"
            />

            {/* Notes */}
            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Handle with care, fragile, etc."
              placeholderTextColor={colors.textDim}
              multiline
            />

            {/* Quote block */}
            {quote ? (
              <GlassCard style={styles.quoteCard}>
                <Text style={styles.quoteLabel}>Estimated fare</Text>
                <Text style={styles.quoteValue}>
                  {quote.currency || ""} {quote.total ?? "—"}
                </Text>
              </GlassCard>
            ) : null}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnGhost]}
              onPress={onClose}
              disabled={busy}
              activeOpacity={0.75}
            >
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            {!quote ? (
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  (!canQuote || busy) && { opacity: 0.5 },
                ]}
                onPress={handleQuote}
                disabled={!canQuote || busy}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator color={colors.bgSolid} size="small" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Get quote</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  (!canBook || busy) && { opacity: 0.5 },
                ]}
                onPress={handleBook}
                disabled={!canBook || busy}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator color={colors.bgSolid} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color={colors.bgSolid} />
                    <Text style={styles.modalBtnPrimaryText}>Book delivery</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
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
  title: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingBottom: 220 },
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
    marginBottom: spacing.md,
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

  banner: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  bannerOk: { borderColor: colors.brandBorder, backgroundColor: colors.brandSoft },
  bannerWarn: { borderColor: colors.warn, backgroundColor: colors.warnSoft },
  bannerTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  bannerSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  section: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  orderCard: { padding: spacing.md, marginBottom: spacing.sm },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  orderId: { color: colors.text, fontSize: 14, fontWeight: "800", flex: 1, marginRight: 8 },
  orderMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  orderFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  orderService: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  orderPrice: { color: colors.text, fontSize: 14, fontWeight: "800" },
  emptyCard: {
    alignItems: "center",
    padding: spacing.xl,
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  emptySub: { color: colors.textMuted, fontSize: 12, textAlign: "center" },

  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: 160,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.pill,
    shadowColor: colors.brand,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 8,
    zIndex: 20,
  },
  fabDisabled: { backgroundColor: colors.textDim },
  fabText: { color: colors.bgSolid, fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    ...(Platform.OS === "web" ? { alignItems: "center" } : {}),
  },
  modalSheet: {
    backgroundColor: colors.bgSolid,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: colors.cardBorder,
    borderRightColor: colors.cardBorder,
    padding: spacing.lg,
    paddingBottom: Platform.OS === "web" ? spacing.lg : 32,
    ...(Platform.OS === "web"
      ? { width: 460, maxWidth: "90%", borderRadius: 20, borderWidth: 1, marginBottom: 32 }
      : {}),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  modalLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: spacing.md,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  serviceRow: { flexDirection: "row", gap: 8 },
  serviceBtn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  serviceBtnActive: { borderColor: colors.brandBorder, backgroundColor: colors.brandSoft },
  serviceLabel: { fontSize: 11, fontWeight: "700" },
  quoteCard: {
    padding: spacing.md,
    marginTop: spacing.md,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
  },
  quoteLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  quoteValue: {
    color: colors.brand,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  modalBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  modalBtnGhost: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalBtnGhostText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  modalBtnPrimary: { backgroundColor: colors.brand },
  modalBtnPrimaryText: { color: colors.bgSolid, fontSize: 13, fontWeight: "800" },
});
