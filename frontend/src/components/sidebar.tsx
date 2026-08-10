/**
 * Sidebar — JARVIS Aura v3 primary navigation. Replaces the removed
 * bottom tab bar. Behaviour differs by form factor:
 *
 *   • TABLET  — always visible, docked left. Expanded (220 px) shows
 *               icons + labels; collapsed (64 px) shows icons only.
 *               Toggled by a chevron pinned to the right edge.
 *
 *   • MOBILE  — hidden off-screen left by default. A hamburger button
 *               floats in the top-left of every screen; tapping it
 *               slides the sidebar in from the left with a dark scrim
 *               behind it. Tapping the scrim closes it.
 *
 * Nav items route via expo-router. Active detection uses the current
 * pathname so the highlight follows deep-links too. Each nav item has
 * a unique per-tab colour glow (Overview cyan, Shipments purple, and
 * so on). White shiny particles drift slowly upward inside the sidebar
 * to give it a "living glass" feel.
 */
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { DashboardStats } from "@/src/api/types";
import { useAuth } from "@/src/auth/context";
import { FYPicker } from "@/src/components/fy-picker";
import { currentSidebarWidth, useSidebar } from "@/src/context/sidebar-context";
import { colors, radii } from "@/src/theme";

// ---------------------------------------------------------------------------
// Nav item definitions
// ---------------------------------------------------------------------------
type NavItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  /** Path matcher for active state. */
  match: (pathname: string) => boolean;
  /** Per-item active glow colour. */
  glow: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    icon: "grid-outline",
    route: "/(tabs)",
    match: (p) => p === "/" || p === "/(tabs)" || p === "/index",
    glow: "#00F5FF",
  },
  {
    label: "Shipments",
    icon: "cube-outline",
    route: "/(tabs)/shipments",
    match: (p) => p.startsWith("/shipments") || p.startsWith("/shipment"),
    glow: "#9B4DFF",
  },
  {
    label: "Invoices",
    icon: "document-text-outline",
    route: "/(tabs)/invoices",
    match: (p) => p.startsWith("/invoices") || p.startsWith("/invoice"),
    glow: "#00FF88",
  },
  {
    label: "Ledger",
    icon: "book-outline",
    route: "/ledger",
    match: (p) => p.startsWith("/ledger") || p.startsWith("/party") || p.startsWith("/parties"),
    glow: "#FFD700",
  },
  {
    label: "Trips",
    icon: "airplane-outline",
    route: "/(tabs)/bullion",
    match: (p) => p.startsWith("/bullion") || p.startsWith("/trips"),
    glow: "#FF5EC4",
  },
  {
    label: "More",
    icon: "ellipsis-horizontal",
    route: "/(tabs)/more",
    match: (p) => p.startsWith("/more"),
    glow: "#FFFFFF",
  },
];

// -- Papa (family owner) mode ------------------------------------------------
// Papa sees simplified Hindi/Hinglish labels and a trimmed nav that hides
// screens meant for admins. The route paths stay identical so navigation
// history + deep-links still work — only the displayed label changes.
const PAPA_LABEL_OVERRIDES: Record<string, string> = {
  Overview: "Ghar",           // dashboard = home
  Shipments: "Maal Bheja",    // "goods sent"
  Invoices: "Bill",           // simple word for invoices
  Ledger: "Hisaab",           // "accounts"
  Trips: "Saman Yatra",       // "goods trip"
  More: "Aur",                // "more"
};
const PAPA_HIDDEN_LABELS = new Set<string>(["More"]);

function papaNavItems(): NavItem[] {
  return NAV_ITEMS
    .filter((n) => !PAPA_HIDDEN_LABELS.has(n.label))
    .map((n) => ({ ...n, label: PAPA_LABEL_OVERRIDES[n.label] || n.label }));
}

// ---------------------------------------------------------------------------
// White shiny particles inside the sidebar
// ---------------------------------------------------------------------------
const PARTICLE_COUNT = 9;

function SidebarParticle({ i, width }: { i: number; width: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const seed = (n: number) => {
    const x = Math.sin(i * 137.19 + n * 21.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const size = 1 + seed(1) * 1.5;            // 1–2.5 px
  const startX = seed(2);                     // fraction of sidebar width
  const opacity = 0.3 + seed(3) * 0.3;        // 0.3–0.6
  const period = 15000 + seed(4) * 10000;     // 15–25 s
  const delay = seed(5) * period;

  useEffect(() => {
    // start at random phase so particles are staggered
    t.setValue((delay % period) / period);
    Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: period,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    ).start();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [700, -80],
  });
  const dynamicOpacity = t.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, opacity, opacity, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: startX * (width - size),
        top: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#FFFFFF",
        opacity: dynamicOpacity,
        transform: [{ translateY }],
        ...Platform.select({
          web: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...({ boxShadow: `0 0 ${size * 4}px rgba(255,255,255,0.8)` } as any),
          },
          default: {
            shadowColor: "#FFFFFF",
            shadowOpacity: 0.9,
            shadowRadius: size * 2,
            shadowOffset: { width: 0, height: 0 },
          },
        }),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Sidebar body (shared by tablet + mobile drawer)
// ---------------------------------------------------------------------------
function SidebarBody({ width, expanded, onNavigate }: { width: number; expanded: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const stats = useApi<DashboardStats>("/api/dashboard/stats");
  const showLabels = expanded;
  // Papa-mode gets a trimmed nav with simple Hindi labels.
  const isPapa = user?.role === "Papa";
  const navItems = useMemo(() => (isPapa ? papaNavItems() : NAV_ITEMS), [isPapa]);

  const activeIndex = useMemo(() => {
    const idx = navItems.findIndex((n) => n.match(pathname));
    return idx === -1 ? 0 : idx;
  }, [navItems, pathname]);

  const goto = (item: NavItem) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(item.route as any);
    onNavigate?.();
  };

  return (
    <View style={[styles.body, { width, paddingTop: insets.top + 12 }]} testID="sidebar-body">
      {/* Living-glass particles */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <SidebarParticle key={i} i={i} width={width} />
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — logo, company, FY */}
        <View style={styles.header}>
          {showLabels ? (
            <Text style={styles.logo} testID="sidebar-logo-full">LogiOp Pro</Text>
          ) : (
            <View style={styles.logoDot} testID="sidebar-logo-mini">
              <Ionicons name="flash" size={18} color={colors.lime} />
            </View>
          )}
          {showLabels ? (
            <View style={{ marginTop: 10, gap: 8, alignItems: "flex-start" }}>
              {/* CompanySwitcher REMOVED in Phase 5 — moved to More tab.
                  Papa/Staff/Carrier still see a locked brand badge here
                  so they know which brand they're scoped to. */}
              {user && user.role !== "Admin" ? (
                <View style={styles.papaBrandBadge} testID="sidebar-brand-locked">
                  <Ionicons name="business-outline" size={12} color={colors.warn} />
                  <Text style={styles.papaBrandText} numberOfLines={1}>
                    {((user as unknown as { company?: string }).company || "")
                      .replace(/^co_/, "")
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ") || "My Company"}
                  </Text>
                  <Ionicons name="lock-closed" size={10} color={colors.textDim} />
                </View>
              ) : null}
              <FYPicker compact earliest="2024-04-01" />
            </View>
          ) : null}
        </View>

        {/* Nav items */}
        <View style={styles.navList}>
          {navItems.map((item, i) => {
            const active = i === activeIndex;
            return (
              <NavRow
                key={item.label}
                item={item}
                active={active}
                showLabel={showLabels}
                onPress={() => goto(item)}
              />
            );
          })}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Quick stats (expanded only) */}
        {showLabels ? (
          <View style={styles.quickStats} testID="sidebar-quick-stats">
            <QuickStat label="Total Shipments" value={String(stats.data?.total ?? 0)} />
            <QuickStat label="Pending" value={String(stats.data?.pending ?? 0)} />
            <QuickStat label="In Transit" value={String(stats.data?.in_transit ?? 0)} />
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom section — notifications only. Profile row REMOVED in
          Phase 5; profile is now reached via the "More" tab which also
          hosts the CompanySwitcher. */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
        <BottomAction icon="notifications-outline" label="Notifications" showLabel={showLabels} onPress={() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          router.push("/notifications" as any);
          onNavigate?.();
        }} />
      </View>
    </View>
  );
}

function NavRow({ item, active, showLabel, onPress }: { item: NavItem; active: boolean; showLabel: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: { hovered?: boolean }) => [
        styles.navRow,
        !showLabel && styles.navRowCollapsed,
        hovered && styles.navRowHover,
        active && { backgroundColor: "rgba(0,255,136,0.10)" },
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      testID={`sidebar-nav-${item.label.toLowerCase()}`}
    >
      {/* Active left border */}
      {active ? <View style={styles.navActiveBar} /> : null}
      <View
        style={[
          styles.navIcon,
          active && {
            ...Platform.select({
              web: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...({ boxShadow: `0 0 14px ${item.glow}` } as any),
              },
              default: {
                shadowColor: item.glow,
                shadowOpacity: 0.9,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
              },
            }),
          },
        ]}
      >
        <Ionicons
          name={item.icon}
          size={20}
          color={active ? item.glow : "rgba(255,255,255,0.45)"}
        />
      </View>
      {showLabel ? (
        <Text
          style={[
            styles.navLabel,
            {
              color: active ? item.glow : "rgba(255,255,255,0.38)",
              fontWeight: active ? "800" : "600",
            },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      ) : null}
    </Pressable>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.qsRow}>
      <Text style={styles.qsLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.qsValue}>{value}</Text>
    </View>
  );
}

function BottomAction({ icon, label, showLabel, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; showLabel: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.bottomAction} accessibilityLabel={label} testID={`sidebar-${label.toLowerCase()}`}>
      <Ionicons name={icon} size={18} color="rgba(255,255,255,0.55)" />
      {showLabel ? <Text style={styles.bottomActionLabel}>{label}</Text> : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Top-level: tablet dock vs. mobile hamburger + slide-over
// ---------------------------------------------------------------------------
export function Sidebar() {
  const s = useSidebar();
  return s.isTablet ? <TabletSidebar /> : <MobileSidebar />;
}

// -- Tablet ------------------------------------------------------------------
function TabletSidebar() {
  const s = useSidebar();
  const width = currentSidebarWidth(s);
  const anim = useRef(new Animated.Value(width)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: width,
      duration: 300,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [width, anim]);
  return (
    <Animated.View style={[styles.dock, { width: anim }]} testID="sidebar-dock">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.glass} />
      </View>
      <SidebarBody width={width} expanded={s.expanded} />
      {/* Toggle chevron on the right edge */}
      <TouchableOpacity
        onPress={s.toggleExpanded}
        style={styles.toggle}
        accessibilityLabel={s.expanded ? "Collapse sidebar" : "Expand sidebar"}
        testID="sidebar-toggle"
        hitSlop={8}
      >
        <Ionicons
          name={s.expanded ? "chevron-back" : "chevron-forward"}
          size={16}
          color="rgba(255,255,255,0.7)"
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// -- Mobile ------------------------------------------------------------------
function MobileSidebar() {
  const s = useSidebar();
  const insets = useSafeAreaInsets();
  const drawerWidth = 260;
  const anim = useRef(new Animated.Value(-drawerWidth)).current;
  const scrim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: s.openMobile ? 0 : -drawerWidth,
      duration: 300,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
    Animated.timing(scrim, {
      toValue: s.openMobile ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [s.openMobile, anim, scrim]);

  return (
    <>
      {/* Hamburger button — always visible top-left */}
      <TouchableOpacity
        onPress={s.openMobileDrawer}
        style={[styles.hamburger, { top: insets.top + 8 }]}
        accessibilityLabel="Open menu"
        testID="sidebar-hamburger"
        hitSlop={12}
      >
        <Ionicons name="menu" size={22} color="rgba(255,255,255,0.9)" />
      </TouchableOpacity>

      {/* Scrim */}
      <Animated.View
        pointerEvents={s.openMobile ? "auto" : "none"}
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "rgba(0,0,0,0.5)",
            opacity: scrim,
            zIndex: 80,
            elevation: 18,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={s.closeMobileDrawer} testID="sidebar-scrim" />
      </Animated.View>

      {/* Slide-in drawer */}
      <Animated.View
        style={[
          styles.mobileDrawer,
          {
            width: drawerWidth,
            transform: [{ translateX: anim }],
          },
        ]}
        testID="sidebar-mobile-drawer"
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.glass} />
        </View>
        <SidebarBody width={drawerWidth} expanded={true} onNavigate={s.closeMobileDrawer} />
      </Animated.View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // Tablet dock
  dock: {
    height: "100%",
    flexShrink: 0,
    flexGrow: 0,
    borderRightColor: "rgba(255,255,255,0.08)",
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "4px 0 32px rgba(0,0,0,0.5)" } as any),
      },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 32,
        shadowOffset: { width: 4, height: 0 },
      },
    }),
  },
  // Frosted glass background
  glass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 3, 15, 0.75)",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
        } as any),
      },
      default: {},
    }),
  },
  toggle: {
    position: "absolute",
    right: -1,
    top: "50%",
    width: 22,
    height: 44,
    marginTop: -22,
    backgroundColor: "rgba(20, 20, 40, 0.8)",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderLeftWidth: 0,
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: 22 }],
  },
  body: {
    flex: 1,
    paddingHorizontal: 10,
  },
  // Header
  header: {
    paddingHorizontal: 6,
    marginBottom: 18,
    minHeight: 44,
  },
  logo: {
    color: "#00FF88",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,255,136,0.55)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  logoDot: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(0,255,136,0.10)",
    borderColor: "rgba(0,255,136,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  // Nav
  navList: { gap: 4 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  navRowCollapsed: {
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  navRowHover: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  navActiveBar: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
    backgroundColor: "#00FF88",
  },
  navIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontSize: 13,
    flex: 1,
  },
  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 14,
    marginHorizontal: 6,
  },
  // Quick stats
  quickStats: {
    gap: 8,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  qsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qsLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  qsValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  // Bottom
  bottom: {
    paddingHorizontal: 6,
    paddingTop: 8,
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  bottomAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  bottomActionLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontWeight: "600",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginTop: 4,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,255,136,0.12)",
    borderColor: "rgba(0,255,136,0.4)",
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#00FF88", fontWeight: "900", fontSize: 13 },
  userName: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  userRole: { color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1 },

  // Papa / Staff / Carrier brand badge — read-only counterpart of the
  // Admin CompanySwitcher pill. Uses warm-gold styling so it visually
  // signals "locked to this brand" without looking like a button.
  papaBrandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,176,32,0.10)",
    borderColor: "rgba(255,176,32,0.4)",
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 220,
  },
  papaBrandText: {
    color: "#FFB020",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    flexShrink: 1,
  },

  // -- Mobile-only --
  hamburger: {
    position: "absolute",
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(12, 12, 30, 0.65)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    // Cross-platform stacking so the hamburger never sits UNDER
    // scrims, cards or the AmbientBackground. Native needs
    // `elevation` for Android + `zIndex` for iOS; web uses zIndex.
    zIndex: 100,
    elevation: 12,
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          cursor: "pointer",
        } as any),
      },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  mobileDrawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    overflow: "hidden",
    borderRightColor: "rgba(255,255,255,0.08)",
    borderRightWidth: StyleSheet.hairlineWidth,
    // Drawer must sit above the AmbientBackground + all scrim so its
    // slide-in animation reads correctly on all platforms.
    zIndex: 90,
    elevation: 20,
  },
});
