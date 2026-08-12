/**
 * /wingman/activity  — Wingman Activity Log
 *
 * Real-time audit of every AI-driven write. Each row shows:
 *   • Action type (create_party / create_shipment / add_bag / …)
 *   • Entity label ("Party: Lalit")
 *   • Timestamp (relative — "2 min ago")
 *   • Status pill (ok / error) with error message if applicable
 *
 * Tapping a successful row opens the affected entity's detail screen.
 * Failure rows are non-tappable (no route to open).
 *
 * Data source: GET /api/wingman/activity (auth-scoped). Polled on mount
 * + focus + pull-to-refresh. Clear-all button in the header.
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiDelete, apiGet } from "@/src/api/client";
import { colors, radii, spacing } from "@/src/theme";

type ActivityRow = {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  entity_label?: string;
  route?: string;
  method?: string;
  status?: "ok" | "error";
  error?: string;
  summary?: string;
  created_at: string;
};

// -------- helpers --------
function relTime(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - t);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  } catch {
    return "";
  }
}

const ACTION_LABEL: Record<string, string> = {
  create_party: "Party banaya",
  create_item: "Item banaya",
  create_shipment: "Shipment banaya",
  create_invoice: "Invoice banaya",
  create_ledger: "Ledger entry",
  create_bullion: "Bullion transaction",
  add_bag: "Bag joda",
  carrier_update: "Carrier update",
  update_ledger: "Ledger update",
  navigate: "Navigation",
  ai_action: "AI action",
};

const ACTION_ICON: Record<string, keyof typeof import("@expo/vector-icons/build/Ionicons").default.glyphMap> = {
  create_party: "person-add-outline",
  create_item: "pricetag-outline",
  create_shipment: "airplane-outline",
  create_invoice: "document-text-outline",
  add_bag: "cube-outline",
  carrier_update: "car-outline",
  update_ledger: "cash-outline",
  navigate: "compass-outline",
  ai_action: "sparkles-outline",
};

export default function WingmanActivityScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<ActivityRow[]>("/api/wingman/activity?limit=200");
      setRows(data || []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Refresh every 20s so the log stays live if the user leaves the
    // screen open while the AI is at work.
    const id = setInterval(() => void load(), 20_000);
    return () => clearInterval(id);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const clearAll = useCallback(() => {
    Alert.alert(
      "Clear activity log?",
      "Sir, poora log delete kar doon? Ye undo nahi ho sakta.",
      [
        { text: "Rehne do", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await apiDelete("/api/wingman/activity");
              setRows([]);
            } catch (e) {
              Alert.alert("Error", (e as Error).message);
            }
          },
        },
      ],
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Wingman Activity</Text>
          <Text style={styles.headerSub}>
            {rows.length === 0 ? "No AI actions yet" : `${rows.length} action${rows.length === 1 ? "" : "s"}`}
          </Text>
        </View>
        <Pressable
          onPress={clearAll}
          style={styles.headerBtn}
          hitSlop={10}
          testID="activity-clear"
          accessibilityLabel="Clear activity log"
        >
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {loading && rows.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptySub}>Loading…</Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconRing}>
              <Ionicons name="sparkles-outline" size={30} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>No AI actions yet</Text>
            <Text style={styles.emptySub}>
              Boliye Wingman se — jab bhi Wingman kuch action lega (party
              banayega, bag jodega, invoice banayega), wo yahaan record
              hoga.
            </Text>
          </View>
        ) : (
          rows.map((r) => <Row key={r.id} row={r} onOpen={(route) => router.push(route as never)} />)
        )}
        {error ? <Text style={styles.errText}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ row, onOpen }: { row: ActivityRow; onOpen: (route: string) => void }) {
  const label = ACTION_LABEL[row.action] || row.action.replace(/_/g, " ");
  const icon = ACTION_ICON[row.action] || "sparkles-outline";
  const isError = row.status === "error";
  const tint = isError ? colors.danger : colors.accent;
  const canOpen = !isError && !!row.route;
  const inner = (
    <View style={styles.row}>
      <View
        style={[
          styles.rowIcon,
          { borderColor: tint, backgroundColor: `${tint}22` },
        ]}
      >
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowHead}>
          <Text style={styles.rowLabel} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.rowTime}>{relTime(row.created_at)}</Text>
        </View>
        {row.entity_label ? (
          <Text style={styles.rowEntity} numberOfLines={1}>
            {row.entity_label}
          </Text>
        ) : null}
        {isError && row.error ? (
          <Text style={styles.rowError} numberOfLines={2}>
            ⚠ {row.error}
          </Text>
        ) : null}
      </View>
      {canOpen ? <Ionicons name="chevron-forward" size={16} color={colors.textDim} /> : null}
    </View>
  );
  if (canOpen && row.route) {
    return (
      <Pressable onPress={() => onOpen(row.route!)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 10,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 209, 255, 0.06)",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  headerSub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  list: {
    padding: spacing.md,
    paddingBottom: 120,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: "rgba(6, 12, 24, 0.65)",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  rowLabel: { color: colors.text, fontSize: 13, fontWeight: "800", flex: 1 },
  rowTime: { color: colors.textDim, fontSize: 10, letterSpacing: 0.4 },
  rowEntity: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  rowError: { color: colors.danger, fontSize: 11, marginTop: 4, lineHeight: 15 },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0, 209, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  emptySub: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 280,
  },
  errText: { color: colors.danger, fontSize: 12, textAlign: "center", marginTop: 12 },
});
