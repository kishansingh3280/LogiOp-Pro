/**
 * BlockerBell + BlockerPanel — the "Intelligent To-Do" surface.
 *
 * BlockerBell is a floating top-right icon (safe-area aware) that shows
 * a red badge with the number of data-hygiene blockers. Visible on every
 * authenticated screen. Tapping it slides in the BlockerPanel modal.
 *
 * BlockerPanel is a full-height right-side glassmorphic slide-in panel
 * that lists categorised blockers:
 *   • Shipments missing freight or bill-to party
 *   • Invoices with amount = 0
 *   • Bags without weight_kg
 *
 * Each item is tappable — deep-links to the entity so the operator can
 * fix it. On save, the operator can re-open the bell to see the count
 * decrement (the endpoint is polled every 45s + on route change).
 *
 * The panel + bell adhere to the Cyber-Siri visual language: deep space
 * bg, blue hair-line borders, cyan icon accents, purple/blue tab glows.
 */
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/src/api/client";
import { useAuth } from "@/src/auth/context";
import { colors, radii, spacing } from "@/src/theme";

const { width: SCREEN_W } = Dimensions.get("window");

// ---------------------------------------------------------------------------
// Types + store (a tiny module-level cache so the bell + modal share data)
// ---------------------------------------------------------------------------

type ShipBlocker = {
  id: string;
  consignment_no?: string;
  origin?: string;
  destination?: string;
  missing: ("freight" | "bill_to")[];
  route: string;
};
type InvBlocker = {
  id: string;
  invoice_no?: string;
  party_name?: string;
  route: string;
};
type BagBlocker = {
  id?: string;
  bag_no?: string;
  shipment_id: string;
  consignment_no?: string;
  route: string;
};

export type BlockerSet = {
  total: number;
  shipments: ShipBlocker[];
  invoices: InvBlocker[];
  bags: BagBlocker[];
  summary_hi: string;
  generated_at: string;
};

type Listener = (b: BlockerSet | null) => void;
let cached: BlockerSet | null = null;
let inflight = false;
const listeners = new Set<Listener>();

export function getCachedBlockers(): BlockerSet | null {
  return cached;
}

async function refreshBlockers(): Promise<BlockerSet | null> {
  if (inflight) return cached;
  inflight = true;
  try {
    const res = await fetch(`${API_BASE}/api/todo/blockers`);
    if (!res.ok) return cached;
    const data = (await res.json()) as BlockerSet;
    cached = data;
    listeners.forEach((l) => l(cached));
    return cached;
  } catch {
    return cached;
  } finally {
    inflight = false;
  }
}

/** Hook that returns the current blockers and auto-refreshes on route
 *  changes + on a 45-second heartbeat. Also exposes a manual refresh. */
export function useBlockers(): { data: BlockerSet | null; refresh: () => Promise<BlockerSet | null> } {
  const [data, setData] = useState<BlockerSet | null>(cached);
  const pathname = usePathname();
  useEffect(() => {
    const listener: Listener = (b) => setData(b);
    listeners.add(listener);
    void refreshBlockers();
    const id = setInterval(refreshBlockers, 45000);
    return () => {
      listeners.delete(listener);
      clearInterval(id);
    };
  }, []);
  // Refresh whenever the operator moves to a new screen — most likely
  // because they just fixed one of the flagged items.
  useEffect(() => {
    void refreshBlockers();
  }, [pathname]);
  return { data, refresh: refreshBlockers };
}

// ---------------------------------------------------------------------------
// Bell — floating top-right icon
// ---------------------------------------------------------------------------

const HIDE_ON = new Set<string>(["/sign-in"]);

export function BlockerBell() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user } = useAuth();
  const { data } = useBlockers();
  const [open, setOpen] = useState(false);

  const shouldHide = !user || HIDE_ON.has(pathname || "");
  if (shouldHide) return null;

  const count = data?.total || 0;
  return (
    <>
      <View
        pointerEvents="box-none"
        style={[
          styles.bellWrap,
          { top: insets.top + 8, right: 14 },
        ]}
      >
        <Pressable
          onPress={() => setOpen(true)}
          style={styles.bellBtn}
          testID="blocker-bell"
          accessibilityLabel={`To-Do inbox — ${count} pending`}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={18} color={colors.accent} />
          {count > 0 ? (
            <View style={styles.badge} pointerEvents="none">
              <Text style={styles.badgeText}>{count > 99 ? "99+" : String(count)}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      {open ? <BlockerPanel data={data} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Panel — slide-in glassmorphic modal
// ---------------------------------------------------------------------------

function BlockerPanel({ data, onClose }: { data: BlockerSet | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const slideIn = useMemo(() => new Animated.Value(SCREEN_W), []);

  useEffect(() => {
    Animated.spring(slideIn, {
      toValue: 0,
      useNativeDriver: true,
      stiffness: 200,
      damping: 24,
      mass: 0.6,
    }).start();
  }, [slideIn]);

  const closeAnimated = useCallback(() => {
    Animated.timing(slideIn, {
      toValue: SCREEN_W,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, slideIn]);

  const total = data?.total || 0;

  const goTo = (route: string) => {
    closeAnimated();
    setTimeout(() => {
      try {
        router.push(route as never);
      } catch {
        /* ignore */
      }
    }, 200);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={closeAnimated}>
      <Pressable style={styles.backdrop} onPress={closeAnimated}>
        <Animated.View
          style={[
            styles.panel,
            { transform: [{ translateX: slideIn }], paddingTop: insets.top + 12 },
          ]}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {Platform.OS !== "web" ? (
            <BlurView tint="dark" intensity={45} style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={styles.panelOverlay} pointerEvents="none" />

          {/* Header */}
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderLeft}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="notifications" size={16} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.panelTitle}>To-Do Inbox</Text>
                <Text style={styles.panelSub}>
                  {total === 0 ? "सब कुछ अपडेट है" : `${total} pending item${total === 1 ? "" : "s"}`}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={closeAnimated}
              style={styles.panelClose}
              testID="blocker-panel-close"
              hitSlop={10}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 80 }}
            showsVerticalScrollIndicator={false}
          >
            {total === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyGlow} />
                <Ionicons name="checkmark-circle" size={44} color={colors.ok} />
                <Text style={styles.emptyTitle}>All clear, Sir</Text>
                <Text style={styles.emptySub}>
                  कोई blocking item नहीं। हर shipment, bag, और invoice पूरा है।
                </Text>
              </View>
            ) : null}

            {/* Bags — highest priority (weight is required for pricing) */}
            {data && data.bags.length > 0 ? (
              <Section
                title="Bags without weight"
                subtitle={`${data.bags.length} bag${data.bags.length === 1 ? "" : "s"} need weight`}
                icon="cube-outline"
                tint={colors.warn}
              >
                {data.bags.slice(0, 20).map((b, i) => (
                  <RowItem
                    key={`bag-${i}`}
                    title={`${b.bag_no || "Bag"} · ${b.consignment_no || b.shipment_id}`}
                    subtitle="weight_kg is empty — पहले weight डालें"
                    onPress={() => goTo(b.route)}
                    testID={`blocker-bag-${i}`}
                  />
                ))}
              </Section>
            ) : null}

            {/* Shipments */}
            {data && data.shipments.length > 0 ? (
              <Section
                title="Shipments incomplete"
                subtitle={`${data.shipments.length} shipment${data.shipments.length === 1 ? "" : "s"} need attention`}
                icon="airplane-outline"
                tint={colors.accent}
              >
                {data.shipments.map((s, i) => (
                  <RowItem
                    key={`ship-${i}`}
                    title={`${s.consignment_no || s.id} · ${s.origin || "?"} → ${s.destination || "?"}`}
                    subtitle={
                      s.missing.includes("freight") && s.missing.includes("bill_to")
                        ? "Missing: freight + bill-to party"
                        : s.missing.includes("freight")
                          ? "Missing: freight amount"
                          : "Missing: bill-to party"
                    }
                    onPress={() => goTo(s.route)}
                    testID={`blocker-ship-${i}`}
                  />
                ))}
              </Section>
            ) : null}

            {/* Invoices */}
            {data && data.invoices.length > 0 ? (
              <Section
                title="Invoices with 0 amount"
                subtitle={`${data.invoices.length} invoice${data.invoices.length === 1 ? "" : "s"} need amount`}
                icon="document-text-outline"
                tint={colors.purple}
              >
                {data.invoices.map((iv, i) => (
                  <RowItem
                    key={`inv-${i}`}
                    title={`${iv.invoice_no || iv.id} · ${iv.party_name || "—"}`}
                    subtitle="Amount is 0 — line items या rate डालें"
                    onPress={() => goTo(iv.route)}
                    testID={`blocker-inv-${i}`}
                  />
                ))}
              </Section>
            ) : null}
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function Section({
  title,
  subtitle,
  icon,
  tint,
  children,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View
          style={[
            styles.sectionIcon,
            { borderColor: tint, backgroundColor: hexAlpha(tint, 0.12) },
          ]}
        >
          <Ionicons name={icon} size={13} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSub}>{subtitle}</Text>
        </View>
      </View>
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

function RowItem({
  title,
  subtitle,
  onPress,
  testID,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      testID={testID}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
    </Pressable>
  );
}

/** Convert `#RRGGBB` or `rgb(r,g,b)` into `rgba(r,g,b,a)`. Lazy helper. */
function hexAlpha(color: string, alpha: number): string {
  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  bellWrap: {
    position: "absolute",
    zIndex: 800,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 12, 20, 0.75)",
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#020202",
    borderWidth: 2,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  // Panel
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "flex-end",
  },
  panel: {
    width: Math.min(360, SCREEN_W - 32),
    height: "100%",
    backgroundColor: "rgba(6, 10, 20, 0.92)",
    borderLeftColor: colors.borderStrong,
    borderLeftWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  panelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 4, 12, 0.55)",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  panelHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 209, 255, 0.10)",
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
  },
  panelTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  panelSub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  panelClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 209, 255, 0.06)",
  },

  // Empty state
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyGlow: {
    position: "absolute",
    top: 20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(52, 211, 153, 0.14)",
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  emptySub: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 18,
  },

  // Sections
  section: { marginBottom: spacing.xl },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionSub: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: "rgba(0, 209, 255, 0.05)",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  rowSub: { color: colors.textMuted, fontSize: 11, marginTop: 2, lineHeight: 15 },
});
