/**
 * GlobalSidebar — the tablet sidebar rendered by the ROOT layout so
 * it persists across ALL routes (not just tab screens).
 *
 * Fix 3 additions:
 *   • Frosted glass background rgba(5,3,15,0.80)
 *   • 2px neon-green left-edge glow (#00FF88, opacity 0.6)
 *   • 8 floating particle dots (4 gold + 4 silver) at zIndex -1 with
 *     translateY 0 → -15 loop, 4000–7000ms per particle
 *
 * Fix 5:
 *   • Uses expo-router usePathname() for active-state highlighting so
 *     it works on non-tab routes (/ledger, /bullion, /reports, etc.).
 *   • Navigation via router.push().
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import {
  FyPicker,
  NotificationsButton,
} from "@/src/lib/dashboard-widgets";
import { colors, radii, spacing } from "@/src/lib/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: IconName;
  iconActive: IconName;
  // A route matches this item if pathname startsWith one of these.
  matchPrefixes: string[];
};

// Fix 2 · Per-item cycling color palettes. Each tap on a nav item
// advances that item's counter to the next color in its list. When
// the item is active it uses the current color for icon/text and a
// soft rgba(color, 0.18) background.
const ITEM_PALETTES: Record<string, string[]> = {
  overview: ["#00FFFF", "#00BFFF", "#40E0D0"],
  shipments: ["#8B00FF", "#9B59B6", "#6A0DAD"],
  invoices: ["#FFD700", "#FFA500", "#FFEC8B"],
  ledger: ["#B76E79", "#FF69B4", "#C48B9F"],
  trips: ["#007AFF", "#0055FF", "#4169E1"],
  more: ["#FF6B6B", "#FF4500", "#FF7F50"],
};

// Convert `#RRGGBB` → `rgba(r,g,b,alpha)` for translucent tinting.
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "overview",
    label: "Overview",
    href: "/",
    icon: "grid-outline",
    iconActive: "grid",
    matchPrefixes: ["/", "/(tabs)"],
  },
  {
    key: "shipments",
    label: "Shipments",
    href: "/shipments",
    icon: "airplane-outline",
    iconActive: "airplane",
    matchPrefixes: ["/shipments", "/shipment", "/bags"],
  },
  {
    key: "invoices",
    label: "Invoices",
    href: "/invoices",
    icon: "receipt-outline",
    iconActive: "receipt",
    matchPrefixes: ["/invoices", "/invoice"],
  },
  {
    key: "ledger",
    label: "Ledger",
    href: "/ledger",
    icon: "book-outline",
    iconActive: "book",
    matchPrefixes: ["/ledger", "/party"],
  },
  {
    key: "trips",
    label: "Trips",
    href: "/bullion",
    icon: "diamond-outline",
    iconActive: "diamond",
    matchPrefixes: ["/bullion", "/trips"],
  },
  {
    key: "more",
    label: "More",
    href: "/more",
    icon: "menu-outline",
    iconActive: "menu",
    matchPrefixes: ["/more", "/reports", "/items", "/admin", "/parties"],
  },
];

export function GlobalSidebar({
  collapsed,
  onToggle,
  width,
}: {
  collapsed: boolean;
  onToggle: () => void;
  width: number;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  // Fix 2 · Per-item color-cycle counter. Bumped on every tap of that
  // nav item so the active tint advances through ITEM_PALETTES[key].
  const [colorCycle, setColorCycle] = useState<Record<string, number>>({
    overview: 0,
    shipments: 0,
    invoices: 0,
    ledger: 0,
    trips: 0,
    more: 0,
  });

  const isActive = (item: NavItem): boolean => {
    // Exact "/" match takes precedence for Overview so "/shipments"
    // doesn't accidentally match Overview's "/" prefix.
    if (item.key === "overview") {
      return pathname === "/" || pathname === "" || pathname === "/(tabs)";
    }
    return item.matchPrefixes.some(
      (p) => p !== "/" && (pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)),
    );
  };

  // Fix 6 removed (Phase 3) — company/mode switcher moved to More tab.

  return (
    <View style={[styles.sidebar, { width }]}>
      {/* Fix 1 · Left-edge neon-green glow rail removed. */}

      {/* Floating gold + silver particles behind everything */}
      <ParticleLayer />

      <View style={styles.sidebarHeader}>
        <View style={styles.brandDot} />
        {!collapsed ? <Text style={styles.brandText}>LogiOp</Text> : null}
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={onToggle}
          activeOpacity={0.7}
          accessibilityLabel={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Ionicons
            name={collapsed ? "chevron-forward" : "chevron-back"}
            size={16}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Fix 1 (Phase 3) · Company + Mode switcher moved to More tab. */}

      {/* FY selector */}
      <View style={{ paddingHorizontal: spacing.md, marginBottom: 4, zIndex: 1 }}>
        <FyPicker collapsed={collapsed} />
      </View>

      <View style={styles.sidebarNav}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          // Fix 2 · Resolve current cycled color for this item.
          const palette = ITEM_PALETTES[item.key] || ["#FFFFFF"];
          const cycleIdx = (colorCycle[item.key] ?? 0) % palette.length;
          const color = palette[cycleIdx];
          const activeBg = hexToRgba(color, 0.18);
          const inactiveText = "rgba(255,255,255,0.45)";
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => {
                setColorCycle((prev) => ({
                  ...prev,
                  [item.key]: (prev[item.key] ?? 0) + 1,
                }));
                router.push(item.href as any);
              }}
              activeOpacity={0.75}
              style={[
                styles.sidebarItem,
                active && { backgroundColor: activeBg },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={active ? { selected: true } : {}}
            >
              {/* Fix 1 + 2 · No left border/rail on any item. */}
              <Ionicons
                name={active ? item.iconActive : item.icon}
                size={20}
                color={active ? color : inactiveText}
                style={styles.sidebarIcon}
              />
              {!collapsed ? (
                <Text
                  style={[
                    styles.sidebarLabel,
                    { color: active ? color : inactiveText },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}

        {!collapsed ? <SidebarShipmentStats /> : null}
      </View>

      <View style={styles.sidebarFooter}>
        <NotificationsButton collapsed={collapsed} />
        {!collapsed ? (
          <Text style={styles.sidebarFooterText}>JARVIS AURA</Text>
        ) : (
          <View style={styles.sidebarFooterDot} />
        )}
      </View>
    </View>
  );
}

// ─── Floating gold + silver + rose-gold particle layer ─────────────
// Sits at zIndex 0 (nav items are above at zIndex 1) so it never
// intercepts taps on nav items. 14 total particles:
//   • 3 gold   (#FFD700, 3px,   opacity 0.35)
//   • 6 silver (#C0C0C0, 2.5px, opacity 0.42)
//   • 5 rose   (#B76E79, 2.5px, opacity 0.45)
// Each floats upward translateY 0 → -20 with a per-particle duration
// staggered between 4000–8000 ms, useNativeDriver: true.
type Particle = {
  color: string;
  size: number;
  radius: number;
  opacity: number;
  topPct: number; // 0..1
  leftPct: number; // 0..1
  duration: number;
};

function ParticleLayer() {
  const particles = useMemo<Particle[]>(() => {
    // Deterministic pseudo-random spread — same layout every mount.
    const rand = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    const arr: Particle[] = [];

    // 3 gold — largest, brightest
    for (let i = 0; i < 3; i++) {
      arr.push({
        color: "#FFD700",
        size: 3,
        radius: 1.5,
        opacity: 0.35,
        topPct: rand(i * 7.13 + 1) * 0.9 + 0.05,
        leftPct: rand(i * 3.71 + 2) * 0.85 + 0.075,
        // 4000 + 0..4000 → range 4000..8000
        duration: 4000 + Math.round(rand(i * 5.5 + 3) * 4000),
      });
    }

    // 6 silver — small, subtle
    for (let i = 0; i < 6; i++) {
      arr.push({
        color: "#C0C0C0",
        size: 2.5,
        radius: 1.25,
        opacity: 0.42,
        topPct: rand(i * 11.7 + 40) * 0.9 + 0.05,
        leftPct: rand(i * 4.9 + 41) * 0.85 + 0.075,
        duration: 4000 + Math.round(rand(i * 6.7 + 42) * 4000),
      });
    }

    // 5 rose gold — medium warmth
    for (let i = 0; i < 5; i++) {
      arr.push({
        color: "#B76E79",
        size: 2.5,
        radius: 1.25,
        opacity: 0.45,
        topPct: rand(i * 9.31 + 80) * 0.9 + 0.05,
        leftPct: rand(i * 5.83 + 81) * 0.85 + 0.075,
        duration: 4000 + Math.round(rand(i * 7.19 + 82) * 4000),
      });
    }
    return arr;
  }, []);

  return (
    <View pointerEvents="none" style={styles.particleLayer}>
      {particles.map((p, i) => (
        <FloatingParticle key={i} {...p} />
      ))}
    </View>
  );
}

function FloatingParticle(p: Particle) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Loop with implicit reverse (0→1→0) — total round trip = 2×duration.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: p.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: p.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, p.duration]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: `${p.topPct * 100}%`,
        left: `${p.leftPct * 100}%`,
        width: p.size,
        height: p.size,
        borderRadius: p.radius,
        backgroundColor: p.color,
        opacity: p.opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

// ─── Sidebar shipment stats (bottom-of-nav block) ──────────────────
// Fix 3 · API returns { shipments: { total, pending, in_transit, ... } }
// (not flat) — unwrap the nested object.
type ShipmentStats = {
  total?: number;
  pending?: number;
  in_transit?: number;
  warehouse_arrived?: number;
  delivered?: number;
};

function SidebarShipmentStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState<ShipmentStats | null>(null);

  useEffect(() => {
    if (!token) return;
    apiGet<{ shipments?: ShipmentStats } | ShipmentStats>("/api/dashboard/stats")
      .then((data) => {
        // Fix 8 · API returns { shipments: { total, pending, in_transit,
        // delivered } } — unwrap into `s`, fall back to flat shape.
        const s = ((data as { shipments?: ShipmentStats })?.shipments ??
          data) as ShipmentStats;
        setStats(s || null);
      })
      .catch(() => setStats(null));
  }, [token]);

  const rows: { label: string; value: number; tint: string }[] = [
    // Fix 8 · Fixed palette per spec.
    { label: "Total", value: stats?.total ?? 0, tint: "#FFFFFF" },
    { label: "Pending", value: stats?.pending ?? 0, tint: "#FF9500" },
    { label: "In Transit", value: stats?.in_transit ?? 0, tint: "#007AFF" },
    { label: "Delivered", value: stats?.delivered ?? 0, tint: "#00FF88" },
  ];

  return (
    <View style={styles.statsBlock}>
      <Text style={styles.statsHeader}>Shipment Stats</Text>
      {rows.map((r) => (
        <View key={r.label} style={styles.statsRow}>
          <Text style={styles.statsLabel}>{r.label}</Text>
          <Text style={[styles.statsValue, { color: r.tint }]}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    // Frosted glass (Fix 3)
    backgroundColor: "rgba(5,3,15,0.80)",
    borderRightColor: colors.cardBorder,
    borderRightWidth: 1,
    paddingVertical: spacing.md,
    justifyContent: "space-between",
    overflow: "hidden",
  },

  // Fix 1 · leftGlowRail removed (no left border/line on sidebar).

  // Fix 3 · Particle layer sits BEHIND every nav item
  particleLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
  },

  sidebarHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    zIndex: 1,
  },
  brandDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  brandText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
    flex: 1,
  },
  toggleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  sidebarNav: { flex: 1, gap: 4, paddingHorizontal: 8, zIndex: 1 },
  sidebarItem: {
    height: 44,
    paddingHorizontal: 8,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    position: "relative",
  },
  // Fix 1 + 2 · sidebarItemActive + sidebarActiveRail removed — active
  // background + tint are now applied inline from the per-item palette.
  sidebarIcon: { width: 20, textAlign: "center" },
  sidebarLabel: { fontSize: 13, fontWeight: "700", flex: 1 },
  sidebarFooter: {
    alignItems: "center",
    paddingVertical: spacing.md,
    zIndex: 1,
  },
  sidebarFooterText: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  sidebarFooterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
    opacity: 0.6,
  },

  // Stats block
  statsBlock: {
    marginTop: 16,
    marginHorizontal: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  statsHeader: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  statsLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  statsValue: { fontSize: 13, fontWeight: "800" },
});
