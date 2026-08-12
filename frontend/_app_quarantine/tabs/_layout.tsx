/**
 * (tabs)/_layout.tsx — routing shell for the 5 tab screens.
 *
 * The previous bottom tab bar has been retired in favour of the app-wide
 * <Sidebar/> (see /app/frontend/src/components/sidebar.tsx) rendered
 * from the root layout. To keep expo-router's file-based routing happy
 * we still declare a <Tabs> group with each screen, but the tabBar is
 * rendered as an empty View (display: none) so no bottom dock appears.
 *
 * Screen content, navigation targets, and route names are unchanged.
 */
import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";

// Legacy constant kept exported so screens that reserve bottom padding
// (paddingBottom: TAB_BAR_BOTTOM_PAD) continue to compile. The value is
// dropped to a tiny buffer since there's no dock anymore.
export const TAB_BAR_BOTTOM_PAD = 16;

const TAB_SCREENS = [
  { name: "index", title: "Overview" },
  { name: "shipments", title: "Shipments" },
  { name: "invoices", title: "Invoices" },
  { name: "bullion", title: "Trips" },
  { name: "more", title: "More" },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
        animation: "shift",
      }}
      tabBar={() => <View />}
    >
      {TAB_SCREENS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
      ))}
    </Tabs>
  );
}
