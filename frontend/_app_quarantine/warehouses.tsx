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
import type { Warehouse } from "@/src/api/types";
import { Card } from "@/src/components/ui";
import { colors, radii, spacing } from "@/src/theme";

export default function WarehousesScreen() {
  const router = useRouter();
  const warehouses = useApi<Warehouse[]>("/api/warehouses");
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return Alert.alert("Missing", "Name required");
    setBusy(true);
    try {
      await apiPost("/api/warehouses", {
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        contact_phone: phone,
        is_default_pickup: false,
      });
      setModal(false);
      setName("");
      setCity("");
      setAddress("");
      setPhone("");
      warehouses.refresh();
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
          <Text style={styles.title}>Warehouses</Text>
          <Text style={styles.subtitle}>{warehouses.data?.length || 0} locations</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => setModal(true)} testID="new-warehouse-btn">
          <Ionicons name="add" size={18} color={colors.bg} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={warehouses.data || []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={<RefreshControl refreshing={warehouses.loading} onRefresh={warehouses.refresh} tintColor={colors.lime} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="business-outline" size={40} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No warehouses</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.is_default_pickup ? (
                    <View style={styles.defaultPill}>
                      <Text style={styles.defaultPillText}>Default</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.meta}>
                  <Ionicons name="location-outline" size={12} color={colors.textDim} /> {item.city}
                </Text>
                {item.address ? <Text style={styles.address}>{item.address}</Text> : null}
                {item.contact_phone ? <Text style={styles.address}>{item.contact_phone}</Text> : null}
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
              <Text style={styles.sheetTitle}>New warehouse</Text>
              <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.textDim} value={name} onChangeText={setName} />
              <View style={{ height: 10 }} />
              <TextInput style={styles.input} placeholder="City" placeholderTextColor={colors.textDim} value={city} onChangeText={setCity} />
              <View style={{ height: 10 }} />
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
                placeholder="Address"
                placeholderTextColor={colors.textDim}
                multiline
                value={address}
                onChangeText={setAddress}
              />
              <View style={{ height: 10 }} />
              <TextInput style={styles.input} placeholder="Contact phone" placeholderTextColor={colors.textDim} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={busy}>
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
  safe: { flex: 1, backgroundColor: "transparent" },
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
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  defaultPill: { backgroundColor: colors.limeGlow, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill, borderColor: colors.lime, borderWidth: 1 },
  defaultPillText: { color: colors.lime, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  address: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
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
  saveBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  saveText: { color: colors.bg, fontWeight: "800", fontSize: 14 },
});
