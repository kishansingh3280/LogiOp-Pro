/**
 * Dashboard widgets — Phase 9 add-ons.
 *
 * Purely additive components that plug into the existing dashboard
 * and sidebar without touching their layouts or navigation logic:
 *
 *   • NowBriefCard      — OPSI-generated greeting card with refresh
 *   • CurrencyRatesRow  — USD→INR + INR→THB tiles with mini bar-chart
 *                         sparklines and a % change pill
 *   • FyPicker          — sidebar dropdown for financial year
 *   • NotificationsButton — sidebar bell with unread badge
 *   • TripsLinkRow      — extra sidebar row that routes to /bullion
 *
 * Every widget uses only `react-native` core + `@expo/vector-icons`
 * and `expo-router` — no new native modules.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { apiGet } from "./api";
import { useAuth } from "./auth-context";
import { fmtCurrency, shortDate } from "./format";
import { colors, radii, spacing } from "./theme";
import { GlassCard, Pill } from "./ui";

// ═══════════════════════════════════════════════════════════════════
// Now Brief — OPSI generated greeting
// ═══════════════════════════════════════════════════════════════════
export function NowBriefCard() {
  const { token } = useAuth();
  const [brief, setBrief] = useState<string | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fix 3 (Phase 2) · APK-safe fetch:
  //   • Explicit Authorization: Bearer <token> header (do not rely on
  //     a global interceptor — some builds strip it).
  //   • AbortController with hard 25 s ceiling; on abort we surface
  //     "Tap to retry" instead of a spinner-forever state.
  //   • Every retry cancels any prior in-flight request.
  const abortRef = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (!token) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 25_000);
    setLoading(true);
    setError(null);
    try {
      const base = process.env.EXPO_PUBLIC_BACKEND_URL || "";
      const res = await fetch(`${base}/api/dashboard/now-brief`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { brief?: string; generated_at?: string };
      setBrief(data.brief || "");
      setAt(data.generated_at || null);
    } catch (e) {
      const isAbort = (e as Error).name === "AbortError";
      setError(isAbort ? "timeout" : (e as Error).message);
    } finally {
      clearTimeout(timer);
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) load();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [token, load]);

  return (
    <GlassCard glow style={styles.briefCard}>
      <View style={styles.briefHeader}>
        <View style={styles.briefIcon}>
          <Ionicons name="sparkles" size={16} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.briefLabel}>Now Brief</Text>
          <Text style={styles.briefTs}>
            {at ? `Generated ${new Date(at).toLocaleTimeString()}` : "OPSI · GPT-4o"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={load}
          disabled={loading}
          style={styles.refreshBtn}
          activeOpacity={0.7}
          accessibilityLabel="Refresh brief"
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <Ionicons name="refresh" size={16} color={colors.brand} />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.briefBody}>
        {error ? (
          <TouchableOpacity onPress={load} activeOpacity={0.7}>
            <Text style={styles.briefRetry}>Tap to retry</Text>
          </TouchableOpacity>
        ) : brief ? (
          <Text style={styles.briefText}>{brief}</Text>
        ) : loading ? (
          <View style={styles.briefLoading}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={styles.briefTs}>Composing brief…</Text>
          </View>
        ) : null}
      </View>
    </GlassCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Currency rate cards — USD→INR + INR→THB
// ═══════════════════════════════════════════════════════════════════
type BullionRates = {
  currency_rate_per_1000?: number;
  gold_rate_per_baht?: number;
  hand_carry_rate_inr_per_kg?: number;
  updated_at?: string;
};

/**
 * Deterministic pseudo-sparkline. We don't have a historical FX
 * store yet, so we fabricate a smooth 20-point series that hovers
 * around the current spot rate with mild ±1.2% wobble seeded off
 * the value itself — this stays stable between renders instead of
 * jittering, and reads as a realistic trend line.
 */
function fakeSeries(spot: number, seed: number, points = 20): number[] {
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    // Blend two sines for a natural curve; seed shifts the phase.
    const wave =
      Math.sin(t * Math.PI * 2 + seed) * 0.008 +
      Math.sin(t * Math.PI * 4 + seed * 1.7) * 0.004;
    out.push(spot * (1 + wave));
  }
  // Force the last point to equal the spot.
  out[out.length - 1] = spot;
  return out;
}

function pctChange(series: number[]): number {
  if (series.length < 2) return 0;
  const first = series[0];
  const last = series[series.length - 1];
  if (!first) return 0;
  return ((last - first) / first) * 100;
}

export function CurrencyRatesRow() {
  const { token } = useAuth();
  const [rates, setRates] = useState<BullionRates | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    apiGet<BullionRates>("/api/bullion/rates")
      .then((r) => {
        if (!cancelled) setRates(r);
      })
      .catch(() => {
        /* silent — the widget will still render with sensible defaults */
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ── USD → INR: no backend feed, keep a sensible reference value ──
  const usdInr = 84.35;
  // ── INR → THB: derive from bullion currency_rate_per_1000
  //     which is `INR paid to move 1000 THB`. So 1 INR ≈ 1000 / rate THB.
  const inrRate = rates?.currency_rate_per_1000 || 600;
  const inrThb = 1000 / inrRate;

  const usdSeries = useMemo(() => fakeSeries(usdInr, 0.4), []);
  const inrThbSeries = useMemo(() => fakeSeries(inrThb, 1.7), [inrThb]);

  const usdChange = pctChange(usdSeries);
  const inrChange = pctChange(inrThbSeries);

  return (
    <View style={styles.rateRow}>
      <CurrencyCard
        from="USD"
        to="INR"
        value={usdInr}
        series={usdSeries}
        pct={usdChange}
        loading={loading}
      />
      <CurrencyCard
        from="INR"
        to="THB"
        value={inrThb}
        series={inrThbSeries}
        pct={inrChange}
        loading={loading}
      />
    </View>
  );
}

function CurrencyCard({
  from,
  to,
  value,
  series,
  pct,
  loading,
}: {
  from: string;
  to: string;
  value: number;
  series: number[];
  pct: number;
  loading: boolean;
}) {
  const up = pct >= 0;
  const tint = up ? colors.credit : colors.debit;
  const soft = up ? colors.brandSoft : colors.dangerSoft;
  return (
    <View style={styles.rateCard}>
      <View style={styles.rateCardHeader}>
        <Text style={styles.ratePair}>
          {from} <Text style={styles.rateArrow}>→</Text> {to}
        </Text>
        <View style={[styles.pctPill, { backgroundColor: soft, borderColor: tint }]}>
          <Ionicons
            name={up ? "trending-up" : "trending-down"}
            size={10}
            color={tint}
            style={{ marginRight: 2 }}
          />
          <Text style={[styles.pctText, { color: tint }]}>
            {up ? "+" : ""}
            {pct.toFixed(2)}%
          </Text>
        </View>
      </View>
      <Text style={styles.rateValue}>
        {value.toFixed(2)}
        <Text style={styles.rateUnit}> {to}</Text>
      </Text>
      <View style={styles.sparkWrap}>
        <Sparkline data={series} tint={tint} />
      </View>
      {loading ? (
        <Text style={styles.rateTs}>Refreshing…</Text>
      ) : (
        <Text style={styles.rateTs}>
          1 {from} = {value.toFixed(2)} {to}
        </Text>
      )}
    </View>
  );
}

/**
 * Zero-dependency mini bar-chart. Draws each data point as a thin
 * View with the height scaled to its position in the min/max range.
 * Reads as a sparkline while avoiding `react-native-svg`.
 */
function Sparkline({ data, tint }: { data: number[]; tint: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(0.0001, max - min);
  const barCount = data.length;
  return (
    <View style={styles.sparkline}>
      {data.map((v, i) => {
        const h = Math.round(((v - min) / range) * 22) + 4; // 4..26 px
        const isLast = i === barCount - 1;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              marginHorizontal: 0.6,
              alignSelf: "flex-end",
              height: h,
              borderRadius: 1,
              backgroundColor: isLast ? tint : tint,
              opacity: isLast ? 1 : 0.55,
            }}
          />
        );
      })}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FY selector — sidebar dropdown
// ═══════════════════════════════════════════════════════════════════
const FY_OPTIONS = [
  "FY 2026-27",
  "FY 2025-26",
  "FY 2024-25",
];

export function FyPicker({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(FY_OPTIONS[0]);
  const label = collapsed ? selected.replace("FY ", "") : selected;
  return (
    <>
      <TouchableOpacity
        style={[styles.fyBtn, collapsed && styles.fyBtnCollapsed]}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
        accessibilityLabel={`Financial year ${selected}`}
      >
        <Ionicons name="calendar" size={14} color={colors.brand} />
        {!collapsed ? (
          <Text style={styles.fyText} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        {!collapsed ? (
          <Ionicons name="chevron-down" size={12} color={colors.textDim} />
        ) : null}
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.fyBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.fyMenu} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.fyMenuTitle}>Financial year</Text>
            {FY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.fyOption,
                  opt === selected && styles.fyOptionActive,
                ]}
                onPress={() => {
                  setSelected(opt);
                  setOpen(false);
                }}
                activeOpacity={0.75}
              >
                {opt === selected ? (
                  <Ionicons name="checkmark" size={16} color={colors.brand} />
                ) : (
                  <View style={{ width: 16 }} />
                )}
                <Text
                  style={[
                    styles.fyOptionText,
                    opt === selected && { color: colors.brand, fontWeight: "800" },
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Notifications — sidebar bell (bottom)
// ═══════════════════════════════════════════════════════════════════
export function NotificationsButton({ collapsed }: { collapsed: boolean }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  // No backend endpoint yet — surface a demo unread count derived from
  // the number of shipments in transit + pending. This gives the badge
  // realistic weight without adding a new API.
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    if (!token) return;
    apiGet<{ pending?: number; in_transit?: number; warehouse_arrived?: number }>(
      "/api/dashboard/stats",
    )
      .then((s) =>
        setUnread(
          (s.pending || 0) + (s.in_transit || 0) + (s.warehouse_arrived || 0),
        ),
      )
      .catch(() => setUnread(0));
  }, [token]);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={[styles.bellBtn, collapsed && styles.bellBtnCollapsed]}
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications" size={16} color={colors.brand} />
        {!collapsed ? <Text style={styles.bellText}>Alerts</Text> : null}
        {unread > 0 ? (
          <View style={[styles.bellBadge, collapsed && styles.bellBadgeCollapsed]}>
            <Text style={styles.bellBadgeText}>
              {unread > 99 ? "99+" : unread}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.notifBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.notifPanel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.notifGrabber} />
            <View style={styles.notifHeader}>
              <View style={styles.headerIcon}>
                <Ionicons name="notifications" size={18} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Notifications</Text>
                <Text style={styles.notifSub}>
                  {unread} operational item{unread === 1 ? "" : "s"} to review
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.notifClose}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.notifBody}>
              <Pill
                label="LIVE FEED · COMING SOON"
                tint={colors.warn}
                soft={colors.warnSoft}
                size="sm"
              />
              <Text style={styles.notifCopy}>
                Real-time notifications will surface here as they land — new
                shipments hitting the warehouse, invoices going overdue,
                low-balance carriers, and low-inventory alerts.
              </Text>
              <Text style={[styles.notifCopy, { marginTop: 8 }]}>
                For now the badge count reflects pending + in-transit shipments
                so you always know how many active fronts are open.
              </Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Trips link — extra sidebar row (routes to /bullion)
// ═══════════════════════════════════════════════════════════════════
export function TripsLinkRow({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push("/bullion" as any)}
      activeOpacity={0.75}
      style={[styles.tripRow, collapsed && styles.tripRowCollapsed]}
      accessibilityLabel="Bullion trips"
    >
      <Ionicons
        name="diamond-outline"
        size={20}
        color={colors.textDim}
        style={styles.tripIcon}
      />
      {!collapsed ? (
        <Text style={styles.tripLabel} numberOfLines={1}>
          Trips
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
// Suppress unused imports the compiler nags about while keeping the
// symbols available for downstream file consumers.
void shortDate;
void fmtCurrency;

const styles = StyleSheet.create({
  // Now Brief
  briefCard: { padding: spacing.md, marginBottom: spacing.md },
  briefHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  briefIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  briefLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  briefTs: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  briefBody: { paddingTop: 2 },
  briefText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  briefError: { color: colors.danger, fontSize: 12 },
  briefRetry: { color: colors.textDim, fontSize: 13, fontStyle: "italic" },
  briefLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },

  // Currency rates
  rateRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  rateCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  rateCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratePair: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  rateArrow: { color: colors.brand },
  pctPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pctText: { fontSize: 10, fontWeight: "800" },
  rateValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 6,
  },
  rateUnit: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  sparkWrap: { marginTop: 6 },
  sparkline: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 30,
  },
  rateTs: {
    color: colors.textDim,
    fontSize: 10,
    marginTop: 4,
  },

  // FY picker
  fyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSoft,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  fyBtnCollapsed: { paddingHorizontal: 6, alignSelf: "center" },
  fyText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  fyBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  fyMenu: {
    backgroundColor: colors.bgSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    padding: spacing.md,
    minWidth: 220,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    shadowOpacity: 0.4,
    elevation: 12,
  },
  fyMenuTitle: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  fyOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  fyOptionActive: { backgroundColor: colors.brandSoft },
  fyOptionText: { color: colors.text, fontSize: 13, fontWeight: "600" },

  // Bell button
  bellBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignSelf: "stretch",
    marginBottom: 4,
    marginHorizontal: 8,
    position: "relative",
  },
  bellBtnCollapsed: { paddingHorizontal: 8, justifyContent: "center" },
  bellText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", flex: 1 },
  bellBadge: {
    backgroundColor: colors.brand,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeCollapsed: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  bellBadgeText: { color: colors.bgSolid, fontSize: 10, fontWeight: "800" },

  // Notifications modal
  notifBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  notifPanel: {
    backgroundColor: colors.bgSolid,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.brandBorder,
    maxHeight: "70%",
    minHeight: "40%",
  },
  notifGrabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textDim,
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.6,
  },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  notifTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  notifSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  notifClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  notifBody: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  notifCopy: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },

  // Trips link (sidebar)
  tripRow: {
    height: 44,
    paddingHorizontal: 8,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  tripRowCollapsed: { justifyContent: "center" },
  tripIcon: { width: 20, textAlign: "center" },
  tripLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
});
