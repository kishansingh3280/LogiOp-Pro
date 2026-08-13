/**
 * GlobalBottomDock — Fix 1 · Phase 7 · Batch C-1.
 *
 * Persistent mobile bottom dock that renders at the ROOT layout so
 * every screen — tab pages, stack pages (party/[id], shipment/[id],
 * invoice/new, trips/new, etc.), modals — shows the same dock.
 *
 * Order (final, do NOT change):
 *   Overview · Shipments · Ledger · Invoices · More
 * Trips is intentionally NOT in the dock — it lives inside More.
 *
 * Hidden on tablet-sized viewports (≥900px) where the sidebar takes
 * over. Auth-guarded via useAuth() so it never renders before login.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/lib/auth-context";
import { colors } from "@/src/lib/theme";
import { useIsTablet } from "@/src/hooks/use-is-tablet";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type DockItem = {
  key: string;
  title: string;
  route: string;
  icons: { active: IconName; inactive: IconName };
  matches: (path: string | null | undefined) => boolean;
};

const ITEMS: DockItem[] = [
  {
    key: "overview",
    title: "Overview",
    route: "/",
    icons: { active: "grid", inactive: "grid-outline" },
    matches: (p) => p === "/" || p === "/index",
  },
  {
    key: "shipments",
    title: "Shipments",
    route: "/shipments",
    icons: { active: "airplane", inactive: "airplane-outline" },
    matches: (p) =>
      !!p && (p === "/shipments" || p.startsWith("/shipments") || p.startsWith("/shipment")),
  },
  {
    key: "ledger",
    title: "Ledger",
    route: "/ledger",
    icons: { active: "book", inactive: "book-outline" },
    matches: (p) => !!p && (p === "/ledger" || p.startsWith("/ledger")),
  },
  {
    key: "invoices",
    title: "Invoices",
    route: "/invoices",
    icons: { active: "receipt", inactive: "receipt-outline" },
    matches: (p) =>
      !!p && (p === "/invoices" || p.startsWith("/invoices") || p.startsWith("/invoice")),
  },
  {
    key: "more",
    title: "More",
    route: "/more",
    icons: { active: "ellipsis-horizontal-circle", inactive: "ellipsis-horizontal-circle-outline" },
    matches: (p) =>
      !!p &&
      (p === "/more" ||
        p.startsWith("/more") ||
        p.startsWith("/parties") ||
        p.startsWith("/party") ||
        p.startsWith("/trips") ||
        p.startsWith("/bullion")),
  },
];

// Height used elsewhere (e.g. content padding) so scrollable content
// doesn't hide behind the dock.
export const GLOBAL_DOCK_HEIGHT = 66;

export function GlobalBottomDock() {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();

  // Hide on tablet (sidebar takes over) and before authentication.
  if (isTablet) return null;
  if (!token) return null;

  return (
    <View
      style={[
        styles.dock,
        {
          paddingBottom: Math.max(6, insets.bottom),
          height: GLOBAL_DOCK_HEIGHT + insets.bottom,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.dockInner}>
        {ITEMS.map((item) => {
          const active = item.matches(pathname);
          const iconName = active ? item.icons.active : item.icons.inactive;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => {
                if (item.key === "overview") router.push("/" as never);
                else router.push(item.route as never);
              }}
              activeOpacity={0.75}
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={iconName}
                size={20}
                color={active ? colors.brand : colors.textDim}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(6, 12, 12, 0.92)",
    borderTopWidth: 1,
    borderColor: "rgba(0,255,136,0.18)",
    paddingHorizontal: 6,
    paddingTop: 6,
    zIndex: 20,
    // subtle top-shadow so the dock lifts above content on light bg.
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 10,
    elevation: 22,
  },
  dockInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: 54,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingTop: 4,
    minHeight: 48,
  },
  label: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  labelActive: {
    color: colors.brand,
    fontWeight: "800",
  },
});
