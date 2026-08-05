import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { LalamoveOrder } from "@/src/api/types";
import { Card } from "@/src/components/ui";
import { colors, radii, spacing } from "@/src/theme";
import { relTime } from "@/src/utils/format";

interface LalamoveConfig {
  configured: boolean;
  mode?: string;
  market?: string;
  sender_phone?: string;
}

export default function LalamoveScreen() {
  const router = useRouter();
  const orders = useApi<LalamoveOrder[]>("/api/lalamove/orders");
  const config = useApi<LalamoveConfig>("/api/lalamove/config");

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Lalamove</Text>
          <Text style={styles.subtitle}>Live delivery orders</Text>
        </View>
      </View>

      <View style={styles.configBox}>
        <View style={styles.configRow}>
          <View
            style={[
              styles.configDot,
              { backgroundColor: config.data?.configured ? colors.ok : colors.danger },
            ]}
          />
          <Text style={styles.configLabel}>
            {config.data?.configured
              ? `Live (${config.data?.mode || ""}) · ${config.data?.market || ""}`
              : "Not configured"}
          </Text>
          {config.data?.sender_phone ? (
            <Text style={styles.configPhone}>{config.data.sender_phone}</Text>
          ) : null}
        </View>
      </View>

      <FlatList
        data={orders.data || []}
        keyExtractor={(o, i) => o.id || String(i)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={<RefreshControl refreshing={orders.loading} onRefresh={orders.refresh} tintColor={colors.lime} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="bicycle-outline" size={40} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No Lalamove orders</Text>
            <Text style={styles.emptySub}>Auto-book from a shipment to see live progress</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderId}>{item.order_id || item.id}</Text>
                <Text style={styles.orderMeta}>{item.status || "unknown"} · {relTime(item.created_at)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  iconBtn: { padding: 8 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: 12 },
  configBox: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  configRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  configDot: { width: 8, height: 8, borderRadius: 4 },
  configLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
  configPhone: { color: colors.textDim, fontSize: 12, marginLeft: "auto" },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  orderId: { color: colors.text, fontSize: 14, fontWeight: "700" },
  orderMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  emptyBox: { padding: spacing.xxl, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
  emptySub: { color: colors.textDim, fontSize: 13, textAlign: "center" },
});
