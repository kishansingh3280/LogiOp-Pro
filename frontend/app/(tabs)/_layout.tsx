/**
 * Tabs layout — Phase 5 JARVIS restoration.
 *
 * Responsive navigation shell:
 *   • Wide viewports (≥ 900px, tablets/landscape) → fixed left sidebar
 *     (220px expanded / 64px collapsed, toggleable). The sidebar is
 *     absolutely positioned and the scene is offset with matching
 *     `marginLeft` so nothing is hidden.
 *   • Narrow viewports (< 900px, phones) → floating bottom tab bar
 *     with icons only — no pill/outline box, just tint + top glow dot.
 */
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useCallback, useState } from "react";
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
const SIDEBAR_EXPANDED = 220;
const SIDEBAR_COLLAPSED = 64;

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
  const voice = useUiVoice();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.bg,
          marginLeft: isTablet ? sidebarWidth : 0,
        },
      }}
      tabBar={(props) =>
        isTablet ? (
          <SideBar
            {...props}
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
            width={sidebarWidth}
          />
        ) : (
          <FloatingBottomBar {...props} />
        )
      }
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
// Floating bottom tab bar (mobile).
// No pill outline box around active icon — only tint + tiny glow dot.
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

// ────────────────────────────────────────────────────────────────
// Fixed left sidebar (tablet).
// Absolutely positioned so the parent scene can size itself with
// matching `marginLeft`.
// ────────────────────────────────────────────────────────────────
function SideBar({
  state,
  descriptors,
  navigation,
  collapsed,
  onToggle,
  width,
}: BottomTabBarProps & { collapsed: boolean; onToggle: () => void; width: number }) {
  const toggle = useCallback(onToggle, [onToggle]);

  return (
    <View style={[styles.sidebar, { width }]}>
      <View style={styles.sidebarHeader}>
        <View style={styles.brandDot} />
        {!collapsed ? <Text style={styles.brandText}>LogiOp</Text> : null}
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={toggle}
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

      <View style={styles.sidebarNav}>
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
              activeOpacity={0.75}
              style={[styles.sidebarItem, focused && styles.sidebarItemActive]}
              accessibilityRole="button"
              accessibilityLabel={String(title)}
              accessibilityState={focused ? { selected: true } : {}}
            >
              {focused ? <View style={styles.sidebarActiveRail} /> : null}
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={20}
                color={focused ? colors.brand : colors.textDim}
                style={styles.sidebarIcon}
              />
              {!collapsed ? (
                <Text
                  style={[
                    styles.sidebarLabel,
                    { color: focused ? colors.brand : colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {String(title)}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sidebarFooter}>
        {!collapsed ? (
          <Text style={styles.sidebarFooterText}>JARVIS AURA</Text>
        ) : (
          <View style={styles.sidebarFooterDot} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Bottom bar (mobile) ────────────────────────────────────────
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

  // ─── Sidebar (tablet) ──────────────────────────────────────────
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(4,4,10,0.85)",
    borderRightColor: colors.cardBorder,
    borderRightWidth: 1,
    paddingVertical: spacing.md,
    justifyContent: "space-between",
  },
  sidebarHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
  sidebarNav: { flex: 1, gap: 4, paddingHorizontal: 8 },
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
});
