import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii } from "@/src/theme";

// JARVIS Aura tab bar — a neon-smoke half-shelf sitting flush with the
// bottom of the screen. Bottom half is intentionally clipped below the
// safe area to give a "half-cut shelf" look, animated gradient shifts on
// a 20 s loop, a breathing cyan↔purple glow paints the top edge, and 4
// twinkling sparkles float inside. Each tab lights up with its own
// per-tab colour halo when active; inactive icons are slightly smaller
// and dimmed to rgba(255,255,255,0.45).
//
// Layout constants are UNCHANGED — TAB_BAR_BOTTOM_PAD is the same 96 px
// every screen already reserves.
export const TAB_BAR_BOTTOM_PAD = 96;

// Per-tab active glow palette per JARVIS Aura spec.
const TAB_GLOW: Record<TabName, string> = {
  index: "#00F5FF",       // Overview → cyan
  shipments: "#9B4DFF",   // Shipments → purple
  invoices: "#00FF88",    // Invoices → green
  bullion: "#FF5EC4",     // Trips → pink
  more: "#FFFFFF",        // More → white
};
// NOTE: "Ledger: gold glow" — Ledger currently lives under the More menu
// (not a top-level tab), so its gold glow is applied on the Ledger tile
// inside More, not here.

type TabName = "index" | "shipments" | "invoices" | "bullion" | "more";

interface TabDef {
  name: TabName;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabDef[] = [
  { name: "index", title: "Overview", icon: "grid-outline" },
  { name: "shipments", title: "Shipments", icon: "cube-outline" },
  { name: "invoices", title: "Invoices", icon: "document-text-outline" },
  { name: "bullion", title: "Trips", icon: "airplane-outline" },
  { name: "more", title: "More", icon: "ellipsis-horizontal" },
];

// ---------------------------------------------------------------------------
// Neon-smoke gradient — cycles through the 4 accent hues on a 20 s loop.
// ---------------------------------------------------------------------------
function NeonSmokeGradient() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 20000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 20000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    ).start();
  }, [t]);

  // Two crossfading gradients — swapping which pair of accent hues sit
  // where. The alpha values match the JARVIS Aura spec (0.08–0.15).
  const gradA: [string, string, string, string] = [
    "rgba(0,245,255,0.12)",
    "rgba(155,77,255,0.15)",
    "rgba(0,255,136,0.10)",
    "rgba(255,255,255,0.08)",
  ];
  const gradB: [string, string, string, string] = [
    "rgba(155,77,255,0.15)",
    "rgba(0,255,136,0.12)",
    "rgba(0,245,255,0.10)",
    "rgba(255,255,255,0.08)",
  ];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={gradA}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: t }]}>
        <LinearGradient
          colors={gradB}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Breathing top-edge glow — cyan ↔ purple, 4 s loop.
// ---------------------------------------------------------------------------
function BreathingTopEdge() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    ).start();
  }, [t]);

  return (
    <View pointerEvents="none" style={styles.topEdgeWrap}>
      <View style={[styles.topEdge, { backgroundColor: "rgba(0,245,255,0.55)" }]} />
      <Animated.View
        style={[
          styles.topEdge,
          {
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            backgroundColor: "rgba(155,77,255,0.55)",
            opacity: t,
          },
        ]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tiny twinkling sparkle dots inside the dock (4 by default).
// ---------------------------------------------------------------------------
const SPARKLES = [
  { left: "12%", top: 14, delay: 0 },
  { left: "38%", top: 22, delay: 700 },
  { left: "63%", top: 12, delay: 1400 },
  { left: "86%", top: 20, delay: 2100 },
] as const;

function Sparkle({ left, top, delay }: { left: string; top: number; delay: number }) {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(o, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(o, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o, delay]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sparkle,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { left: left as any, top, opacity: o },
      ]}
    />
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 4);
  // Visible tab bar height matches the prior 60 + safe area value so
  // TAB_BAR_BOTTOM_PAD stays honest. We render the shelf 20% taller and
  // translate the extra height below the screen edge for a "half-cut
  // shelf" silhouette.
  const visibleHeight = 60 + bottomPad;
  const shelfHeight = Math.round(visibleHeight * 1.2);
  const hiddenBelow = shelfHeight - visibleHeight;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: { display: "none", position: "absolute" },
        animation: "shift",
      }}
      tabBar={(props) => (
        <View
          style={[
            styles.wrap,
            {
              height: shelfHeight,
              bottom: -hiddenBelow,
              paddingBottom: bottomPad + hiddenBelow,
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Real gaussian blur on native, CSS blur on web via BlurView. */}
          <BlurView
            tint="dark"
            intensity={Platform.OS === "ios" ? 80 : 70}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Deep base tint so the frosted panel reads distinct from the
              ambient background even without live blur (Android <12). */}
          <View style={styles.baseTint} pointerEvents="none" />
          {/* Web extra saturation blur — matches spec blur(40px) saturate(220%). */}
          {Platform.OS === "web" ? <View style={styles.webBlurBoost} pointerEvents="none" /> : null}
          <NeonSmokeGradient />
          <BreathingTopEdge />
          {SPARKLES.map((s, i) => (
            <Sparkle key={`sp-${i}`} {...s} />
          ))}
          <View style={styles.row}>
            {TABS.map((tab) => {
              const route = props.state.routes.find((r) => r.name === tab.name);
              if (!route) return null;
              const focused = props.state.routes[props.state.index]?.name === tab.name;
              return (
                <TabButton
                  key={tab.name}
                  tab={tab}
                  focused={focused}
                  onPress={() => {
                    const event = props.navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!focused && !event.defaultPrevented) {
                      props.navigation.navigate(route.name, route.params);
                    }
                  }}
                />
              );
            })}
          </View>
        </View>
      )}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
      ))}
    </Tabs>
  );
}

function TabButton({
  tab,
  focused,
  onPress,
}: {
  tab: TabDef;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(glow, {
      toValue: focused ? 1 : 0,
      useNativeDriver: Platform.OS !== "web",
      stiffness: 200,
      damping: 20,
      mass: 0.4,
    }).start();
  }, [focused, glow]);

  // Press pulse: scale 0.92 → 1.08 → 1.0 in ~200 ms total.
  const pulse = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.92,
        duration: 70,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(scale, {
        toValue: 1.08,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 50,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  };

  const glowColor = TAB_GLOW[tab.name];
  const activeColor = glowColor;
  const inactiveColor = "rgba(255,255,255,0.45)";
  const tint = focused ? activeColor : inactiveColor;
  // Icon size: 20 base ± 10% per spec.
  const iconSize = focused ? 22 : 18;

  return (
    <Pressable
      onPress={() => {
        pulse();
        onPress();
      }}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.title}
      testID={`tab-${tab.name}`}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              opacity: glow,
              transform: [
                { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
              backgroundColor: hexA(glowColor, 0.14),
              borderColor: hexA(glowColor, 0.55),
              shadowColor: glowColor,
              ...(Platform.OS === "web"
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ({ boxShadow: `0 0 18px ${hexA(glowColor, 0.55)}` } as any)
                : {}),
            },
          ]}
        />
        <Ionicons name={tab.icon} size={iconSize} color={tint} />
        <Animated.Text
          style={[
            styles.label,
            {
              color: tint,
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
            },
          ]}
        >
          {tab.title}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// Helper — expand `#RRGGBB` to `rgba(r,g,b,a)`; passes rgba/hex through.
function hexA(hex: string, a: number): string {
  if (hex.startsWith("rgba") || hex.startsWith("rgb")) return hex;
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopColor: "rgba(255,255,255,0.10)",
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  baseTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,7,15,0.55)",
  },
  webBlurBoost: {
    ...StyleSheet.absoluteFillObject,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({
      backdropFilter: "blur(40px) saturate(220%)",
      WebkitBackdropFilter: "blur(40px) saturate(220%)",
    } as any),
  },
  topEdgeWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 1.5,
  },
  topEdge: {
    height: 1.5,
    width: "100%",
  },
  sparkle: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "0 0 6px rgba(255,255,255,0.9)" } as any),
      },
      default: {
        shadowColor: "#FFFFFF",
        shadowOpacity: 0.9,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  glow: {
    position: "absolute",
    top: -6,
    bottom: -6,
    left: -14,
    right: -14,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
