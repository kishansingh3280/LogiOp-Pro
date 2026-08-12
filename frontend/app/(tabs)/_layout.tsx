/**
 * Tabs layout — Phase 3.
 *
 * 5 primary tabs with proper Ionicons:
 *   • Overview   (grid dashboard)
 *   • Shipments  (aircraft / logistics)
 *   • Parties    (people)
 *   • Invoices   (receipt)
 *   • More       (menu)
 *
 * Dark JARVIS Aura tab bar with a neon-green active tint.
 */
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";

import { colors, spacing } from "@/src/lib/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function makeIcon(active: IconName, inactive: IconName) {
  const IconRenderer = ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
  IconRenderer.displayName = `TabIcon(${active}/${inactive})`;
  return IconRenderer;
}

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
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          tabBarIcon: makeIcon("grid", "grid-outline"),
        }}
      />
      <Tabs.Screen
        name="shipments"
        options={{
          title: "Shipments",
          tabBarIcon: makeIcon("airplane", "airplane-outline"),
        }}
      />
      <Tabs.Screen
        name="parties"
        options={{
          title: "Parties",
          tabBarIcon: makeIcon("people", "people-outline"),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          tabBarIcon: makeIcon("receipt", "receipt-outline"),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: makeIcon("menu", "menu-outline"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bgDeep,
    borderTopColor: colors.cardBorder,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginTop: spacing.xs,
  },
});
