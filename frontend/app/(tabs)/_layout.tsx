/**
 * Phase-2 Tabs layout.
 *
 * Bottom-tab navigation for the primary app sections:
 *   • Overview  (dashboard)
 *   • Shipments (list)
 *   • Parties   (list)
 *   • More      (settings, ledger, invoices — placeholders for now)
 *
 * Text-only labels are used intentionally. Icon fonts (Ionicons /
 * @expo/vector-icons) will be introduced in Phase 3 once we're sure
 * the APK is stable with tab navigation.
 */
import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/src/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          tabBarIcon: ({ color, focused }) => (
            <TabDot color={color} focused={focused} label="◉" />
          ),
        }}
      />
      <Tabs.Screen
        name="shipments"
        options={{
          title: "Shipments",
          tabBarIcon: ({ color, focused }) => (
            <TabDot color={color} focused={focused} label="⇄" />
          ),
        }}
      />
      <Tabs.Screen
        name="parties"
        options={{
          title: "Parties",
          tabBarIcon: ({ color, focused }) => (
            <TabDot color={color} focused={focused} label="♟" />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <TabDot color={color} focused={focused} label="≡" />
          ),
        }}
      />
    </Tabs>
  );
}

// ── Simple unicode-symbol tab marker (avoids icon-font native load). ──
function TabDot({
  color,
  focused,
  label,
}: {
  color: string;
  focused: boolean;
  label: string;
}) {
  return (
    <View style={styles.tabDotWrap}>
      <Text
        style={[
          styles.tabDot,
          { color, opacity: focused ? 1 : 0.6, fontSize: focused ? 20 : 18 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.cardBorder,
    borderTopWidth: 1,
    height: 62,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 0,
  },
  tabDotWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 22,
    marginTop: spacing.xs,
  },
  tabDot: {
    fontWeight: "800",
    lineHeight: 22,
  },
});
