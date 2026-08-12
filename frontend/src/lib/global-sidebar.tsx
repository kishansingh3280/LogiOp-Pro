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

  return (
    <View style={[styles.sidebar, { width }]}>
      {/* Left-edge neon-green glow rail (Fix 3) */}
      <View pointerEvents="none" style={styles.leftGlowRail} />

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

      {/* FY selector */}
      <View style={{ paddingHorizontal: spacing.md, marginBottom: 4, zIndex: 1 }}>
        <FyPicker collapsed={collapsed} />
      </View>

      <View style={styles.sidebarNav}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => router.push(item.href as any)}
              activeOpacity={0.75}
              style={[styles.sidebarItem, active && styles.sidebarItemActive]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={active ? { selected: true } : {}}
            >
              {active ? <View style={styles.sidebarActiveRail} /> : null}
              <Ionicons
                name={active ? item.iconActive : item.icon}
                size={20}
                color={active ? colors.brand : colors.textDim}
                style={styles.sidebarIcon}
              />
              {!collapsed ? (
                <Text
                  style={[
                    styles.sidebarLabel,
                    { color: active ? colors.brand : colors.textMuted },
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
//   • 5 gold  (#FFD700, 3px,   opacity 0.40)
//   • 5 silver (#C0C0C0, 2px,   opacity 0.30)
//   • 4 rose  (#B76E79, 2.5px, opacity 0.35)
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

    // 5 gold — largest, brightest
    for (let i = 0; i < 5; i++) {
      arr.push({
        color: "#FFD700",
        size: 3,
        radius: 1.5,
        opacity: 0.4,
        topPct: rand(i * 7.13 + 1) * 0.9 + 0.05,
        leftPct: rand(i * 3.71 + 2) * 0.85 + 0.075,
        // 4000 + 0..4000 → range 4000..8000
        duration: 4000 + Math.round(rand(i * 5.5 + 3) * 4000),
      });
    }

    // 5 silver — small, subtle
    for (let i = 0; i < 5; i++) {
      arr.push({
        color: "#C0C0C0",
        size: 2,
        radius: 1,
        opacity: 0.3,
        topPct: rand(i * 11.7 + 40) * 0.9 + 0.05,
        leftPct: rand(i * 4.9 + 41) * 0.85 + 0.075,
        duration: 4000 + Math.round(rand(i * 6.7 + 42) * 4000),
      });
    }

    // 4 rose gold — medium warmth
    for (let i = 0; i < 4; i++) {
      arr.push({
        color: "#B76E79",
        size: 2.5,
        radius: 1.25,
        opacity: 0.35,
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
function SidebarShipmentStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState<{
    total?: number;
    pending?: number;
    in_transit?: number;
    warehouse_arrived?: number;
    delivered?: number;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    apiGet<typeof stats>("/api/dashboard/stats" as string)
      .then((s) => setStats(s))
      .catch(() => setStats(null));
  }, [token]);

  const rows: { label: string; value: number; tint: string }[] = [
    { label: "Total", value: stats?.total ?? 0, tint: colors.text },
    { label: "Pending", value: stats?.pending ?? 0, tint: colors.warn },
    {
      label: "In Transit",
      value: (stats?.in_transit ?? 0) + (stats?.warehouse_arrived ?? 0),
      tint: colors.info,
    },
    { label: "Delivered", value: stats?.delivered ?? 0, tint: colors.brand },
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

  // Fix 3 · Left-edge neon glow rail
  leftGlowRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#00FF88",
    opacity: 0.6,
    shadowColor: "#00FF88",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.9,
  },

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
  sidebarItemActive: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  sidebarActiveRail: {
    position: "absolute",
    left: -8,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
  },
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
