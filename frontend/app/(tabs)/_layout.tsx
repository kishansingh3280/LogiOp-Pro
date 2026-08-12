/**
 * Tabs layout — Phase 10 · Fix 5.
 *
 * The tablet sidebar was moved to the ROOT layout so it persists on
 * every route. This file now only handles the mobile bottom bar; on
 * tablet we render null so the global sidebar owns navigation.
 */
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { colors, radii, spacing } from "@/src/lib/theme";
import { useUiVoice } from "@/src/lib/papa-mode";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: "grid", inactive: "grid-outline" },
  shipments: { active: "airplane", inactive: "airplane-outline" },
  parties: { active: "people", inactive: "people-outline" },
  invoices: { active: "receipt", inactive: "receipt-outline" },
  more: { active: "menu", inactive: "menu-outline" },
};

const TABLET_BREAKPOINT = 900;

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const voice = useUiVoice();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.bg,
        },
      }}
      tabBar={(props) => (isTablet ? null : <FloatingBottomBar {...props} />)}
    >
      <Tabs.Screen name="index" options={{ title: voice.overview }} />
      <Tabs.Screen name="shipments" options={{ title: voice.shipments }} />
      <Tabs.Screen name="parties" options={{ title: voice.parties }} />
      <Tabs.Screen name="invoices" options={{ title: voice.invoices }} />
      <Tabs.Screen name="more" options={{ title: voice.more }} />
    </Tabs>
  );
}

// ────────────────────────────────────────────────────────────────
// Floating bottom tab bar (mobile only).
// ────────────────────────────────────────────────────────────────
function FloatingBottomBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.bottomBar} pointerEvents="box-none">
      <View style={styles.bottomBarInner}>
        {state.routes.map((route, idx) => {
          const focused = state.index === idx;
          const icons = TAB_ICONS[route.name] || TAB_ICONS.index;
          const title = descriptors[route.key]?.options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never, route.params as never);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItemMobile}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={String(title)}
            >
              {focused ? <View style={styles.activeDot} /> : <View style={styles.dotSpacer} />}
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={focused ? 24 : 22}
                color={focused ? colors.brand : colors.textDim}
              />
              <Text
                style={[
                  styles.tabLabelMobile,
                  { color: focused ? colors.brand : colors.textDim },
                ]}
                numberOfLines={1}
              >
                {String(title)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    paddingTop: 6,
    backgroundColor: "transparent",
  },
  bottomBarInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    backgroundColor: "rgba(4,4,10,0.85)",
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  tabItemMobile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 4,
    gap: 3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
    marginBottom: 2,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 3,
  },
  dotSpacer: { height: 6 },
  tabLabelMobile: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});
