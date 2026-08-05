import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiPost } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { Item } from "@/src/api/types";
import { Card } from "@/src/components/ui";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency } from "@/src/utils/format";

export default function ItemsScreen() {
  const router = useRouter();
  const items = useApi<Item[]>("/api/items");
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [buy, setBuy] = useState("");
  const [sell, setSell] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return Alert.alert("Missing", "Name required");
    setBusy(true);
    try {
      await apiPost("/api/items", {
        name: name.trim(),
        unit: unit.trim() || "pcs",
        buying_price: Number(buy) || 0,
        selling_price: Number(sell) || 0,
      });
      setModal(false);
      setName("");
      setBuy("");
      setSell("");
      items.refresh();
    } catch (e) {
      Alert.alert("Failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Items</Text>
          <Text style={styles.subtitle}>{items.data?.length || 0} in catalog</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => setModal(true)} testID="new-item-btn">
          <Ionicons name="add" size={18} color={colors.bg} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items.data || []}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={items.loading} onRefresh={items.refresh} tintColor={colors.lime} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="pricetags-outline" size={40} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No items yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.unit} · buy {fmtCurrency(item.buying_price, "INR")} · sell {fmtCurrency(item.selling_price, "INR")}
                </Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{fmtCurrency(item.selling_price - item.buying_price, "INR")}</Text>
                <Text style={styles.pillLbl}>margin</Text>
              </View>
            </View>
          </Card>
        )}
      />

      {modal && (
        <Pressable style={styles.backdrop} onPress={() => setModal(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>New item</Text>
              <TextInput style={styles.input} placeholder="Item name" placeholderTextColor={colors.textDim} value={name} onChangeText={setName} />
              <View style={{ height: 10 }} />
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <TextInput style={styles.input} placeholder="Unit (pcs)" placeholderTextColor={colors.textDim} value={unit} onChangeText={setUnit} />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <TextInput style={styles.input} placeholder="Buying price" placeholderTextColor={colors.textDim} keyboardType="decimal-pad" value={buy} onChangeText={setBuy} />
                </View>
              </View>
              <View style={{ height: 10 }} />
              <TextInput style={styles.input} placeholder="Selling price" placeholderTextColor={colors.textDim} keyboardType="decimal-pad" value={sell} onChangeText={setSell} />
              <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={busy}>
                <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      )}
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
    gap: 4,
  },
  iconBtn: { padding: 8 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: 12 },
  newBtn: {
    backgroundColor: colors.lime,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  newBtnText: { color: colors.bg, fontWeight: "800", fontSize: 13 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.limeGlow,
    borderRadius: radii.md,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  pillText: { color: colors.lime, fontWeight: "800", fontSize: 13 },
  pillLbl: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  emptyBox: { padding: spacing.xxl, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  row2: { flexDirection: "row" },
  saveBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  saveText: { color: colors.bg, fontWeight: "800", fontSize: 14 },
});
