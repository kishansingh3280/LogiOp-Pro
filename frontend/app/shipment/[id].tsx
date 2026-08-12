/**
 * Shipment detail — deep-linked route.
 *
 * Full-screen wrapper with back button. Body renders via the shared
 * <ShipmentDetailView /> component (also reused inside the tablet
 * split view on /(tabs)/shipments).
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ShipmentDetailView } from "@/src/lib/shipment-detail-view";
import { colors, spacing } from "@/src/lib/theme";

export default function ShipmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Shipment
          </Text>
          <Text style={styles.subtitle}>{id}</Text>
        </View>
      </View>

      {id ? <ShipmentDetailView id={id} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textDim, fontSize: 10, marginTop: 2 },
});
