import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii } from "@/src/theme";

// True-Black glassmorphism tab bar. Each active tab gets a lime-green
// halo behind the icon and label; taps fire a spring-back pulse via
// Animated.spring — no external libraries, keeps things at native 60fps
// (and 120fps on ProMotion / high-refresh Android displays).

// Bottom-safe padding constant — every scrollable screen should apply this
// (or a value >= this) as `paddingBottom` so content never disappears
// under the sticky glassmorphic tab bar.
export const TAB_BAR_BOTTOM_PAD = 96;

type TabName = "index" | "shipments" | "invoices" | "assistant" | "bullion" | "more";

interface TabDef {
  name: TabName;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabDef[] = [
  { name: "index", title: "Overview", icon: "grid-outline" },
  { name: "shipments", title: "Shipments", icon: "cube-outline" },
  { name: "assistant", title: "Assistant", icon: "hardware-chip-outline" }, // centre brain
  { name: "invoices", title: "Invoices", icon: "document-text-outline" },
  { name: "bullion", title: "Bullion", icon: "diamond-outline" },
  { name: "more", title: "More", icon: "ellipsis-horizontal" },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 4);
  const barHeight = 60 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.textDim,
        // Overlay the tab bar so it NEVER scrolls with content; screens
        // are responsible for adding their own bottom padding (see
        // TAB_BAR_BOTTOM_PAD constant). display:none suppresses the
        // default bar since we render our own via `tabBar` below.
        tabBarStyle: { display: "none", position: "absolute" },
        // 120fps-friendly navigation animation.
        animation: "shift",
      }}
      tabBar={(props) => (
        <View style={[styles.wrap, { height: barHeight, paddingBottom: bottomPad }]} pointerEvents="box-none">
          <BlurView
            tint="dark"
            intensity={Platform.OS === "ios" ? 70 : 60}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.overlay} pointerEvents="none" />
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

  // Focus glow — animated on every focus change so switching tabs by any
  // means (deep link, back button, etc.) still lights up the pill.
  useEffect(() => {
    Animated.spring(glow, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      stiffness: 200,
      damping: 20,
      mass: 0.4,
    }).start();
  }, [focused, glow]);

  const pulse = () => {
    // Deterministic 2-step spring — instant feedback, no fixed timeouts.
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.88,
        useNativeDriver: true,
        stiffness: 400,
        damping: 15,
        mass: 0.3,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 300,
        damping: 12,
        mass: 0.3,
      }),
    ]).start();
  };

  const tint = focused ? colors.lime : colors.textDim;

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
              transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            },
          ]}
        />
        <Ionicons name={tab.icon} size={20} color={tint} />
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

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopColor: "rgba(0, 209, 255, 0.10)",
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 5, 5, 0.55)",
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
    backgroundColor: "rgba(0, 209, 255, 0.14)",
    borderColor: "rgba(0, 209, 255, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: colors.lime,
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
