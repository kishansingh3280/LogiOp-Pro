import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { apiPost } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { Item } from "@/src/api/types";
import { toast } from "@/src/components/toast";
import { colors, radii, spacing } from "@/src/theme";

const UNITS = ["pcs", "meters", "yards", "kg", "grams", "boxes", "rolls", "sets"];

/**
 * Modal picker with autocomplete + inline "Add new item" affordance.
 * `onPick` is fired with the chosen (or newly created) Item.
 */
export function ItemPicker({
  visible,
  onClose,
  onPick,
  title = "Choose item",
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (item: Item) => void;
  title?: string;
}) {
  const items = useApi<Item[]>("/api/items");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUnit, setNewUnit] = useState<string>("pcs");
  const [newCategory, setNewCategory] = useState("");

  const filtered = useMemo(() => {
    const list = items.data || [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list.slice(0, 30);
    return list
      .filter((it) =>
        [it.name, it.category || "", it.unit, it.hs_code || ""]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 30);
  }, [items.data, q]);

  const exactMatch = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return null;
    return (items.data || []).find((it) => it.name.toLowerCase() === n) || null;
  }, [items.data, q]);

  const canCreate = q.trim().length > 0 && !exactMatch;

  const createItem = async () => {
    const name = q.trim();
    if (!name) return;
    setCreating(true);
    try {
      const payload = {
        name,
        unit: newUnit,
        category: newCategory.trim() || undefined,
        buying_price: 0,
        selling_price: 0,
      };
      const created = await apiPost<Item>("/api/items", payload);
      // Refresh the parent list — the useApi hook re-fetches on next mount,
      // but for immediate reflection we call refresh().
      await items.refresh?.();
      toast.success(`Item "${created.name}" added`);
      onPick(created);
      onClose();
    } catch (e) {
      toast.error(`Add item failed: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  };

  if (!visible) return null;

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textDim} />
          <TextInput
            style={styles.searchInput}
            value={q}
            onChangeText={setQ}
            placeholder="Type to search or add new…"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoFocus
            testID="item-search-input"
          />
        </View>

        {items.loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.lime} />
          </View>
        ) : filtered.length === 0 && !canCreate ? (
          <Text style={styles.empty}>No items yet. Start typing to add one.</Text>
        ) : (
          <ScrollView style={{ maxHeight: 260 }}>
            {filtered.map((it) => (
              <TouchableOpacity
                key={it.id}
                style={styles.row}
                onPress={() => {
                  onPick(it);
                  onClose();
                }}
                testID={`item-row-${it.id}`}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name="cube-outline" size={14} color={colors.lime} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{it.name}</Text>
                  <Text style={styles.rowMeta}>
                    {it.unit}{it.category ? ` · ${it.category}` : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {canCreate && (
          <View style={styles.newBox}>
            <Text style={styles.newTitle}>Add new item</Text>
            <Text style={styles.newSub}>&quot;{q.trim()}&quot;</Text>
            <View style={styles.unitRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  onPress={() => setNewUnit(u)}
                  style={[styles.unitChip, newUnit === u && styles.unitChipOn]}
                >
                  <Text style={[styles.unitChipTxt, newUnit === u && styles.unitChipTxtOn]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.catInput}
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="Category (optional)"
              placeholderTextColor={colors.textDim}
            />
            <TouchableOpacity
              style={[styles.createBtn, creating && { opacity: 0.5 }]}
              onPress={createItem}
              disabled={creating}
              testID="item-create-btn"
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.bg} />
              <Text style={styles.createTxt}>
                {creating ? "Adding…" : `Add "${q.trim()}"`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    zIndex: 9998,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  handle: {
    alignSelf: "center", width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.chipBg,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md, paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 12, fontSize: 14 },
  loading: { paddingVertical: spacing.xl, alignItems: "center" },
  empty: { color: colors.textDim, fontSize: 13, textAlign: "center", paddingVertical: spacing.lg },
  row: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10,
    borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: colors.limeGlow, alignItems: "center", justifyContent: "center",
  },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  rowMeta: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  newBox: {
    marginTop: spacing.md, padding: spacing.md,
    borderRadius: radii.md, backgroundColor: colors.chipBg,
    borderColor: colors.lime, borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
  },
  newTitle: { color: colors.lime, fontSize: 11, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  newSub: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 4, marginBottom: 10 },
  unitRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  unitChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface,
  },
  unitChipOn: { borderColor: colors.lime, backgroundColor: colors.limeGlow },
  unitChipTxt: { color: colors.textDim, fontSize: 11, fontWeight: "700" },
  unitChipTxtOn: { color: colors.lime },
  catInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text, fontSize: 13, marginBottom: 10,
  },
  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.lime, borderRadius: radii.pill, paddingVertical: 10,
  },
  createTxt: { color: colors.bg, fontSize: 13, fontWeight: "900" },
  cancel: {
    marginTop: spacing.md, paddingVertical: 12, alignItems: "center",
    borderRadius: radii.pill, backgroundColor: colors.chipBg,
  },
  cancelTxt: { color: colors.text, fontWeight: "700" },
});

export { UNITS };
