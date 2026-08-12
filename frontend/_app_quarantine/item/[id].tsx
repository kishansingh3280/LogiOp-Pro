import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiDelete, apiPost, apiPut } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { Item, Party } from "@/src/api/types";
import { toast } from "@/src/components/toast";
import { useGhostFill } from "@/src/ghost/use-ghost-fill";
import { colors, radii, spacing } from "@/src/theme";
import { stripExifToBase64Async } from "@/src/utils/exif";
import { fmtCurrency } from "@/src/utils/format";

// Full editable Item profile — used both for creating new items (id="new")
// and editing an existing catalog entry. Handles photo capture via
// expo-image-picker (stored as data-uri base64 on the item record), free
// text tags, and supplier linking to a Party in the "supplier" role.
export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = params.id === "new";
  const id = isNew ? null : params.id;

  const catalog = useApi<Item[]>("/api/items");
  const existing = useMemo(() => {
    if (!id) return null;
    return (catalog.data || []).find((it) => it.id === id) || null;
  }, [id, catalog.data]);
  const catalogLoading = catalog.loading && !catalog.data;
  const parties = useApi<Party[]>("/api/parties");

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [buy, setBuy] = useState("");
  const [sell, setSell] = useState("");
  const [description, setDescription] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [pickSupplier, setPickSupplier] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const suppliers = useMemo(
    () => (parties.data || []).filter((p) => p.role === "supplier"),
    [parties.data],
  );
  const supplier = suppliers.find((p) => p.id === supplierId);

  // Ghost-Fill: when the Assistant dispatched us here via /item/new, the
  // Ghost store has a payload like { name, unit, hsn_code, notes }. This
  // hook types each field char-by-char and fires the confirmation banner.
  // We track HSN and notes in refs so combined fields (both → description)
  // reflect the actual state at any moment without the buggy accumulator
  // pattern.
  const hsnBufRef = useRef("");
  const notesBufRef = useRef("");
  const composeDescription = () => {
    const h = hsnBufRef.current;
    const n = notesBufRef.current;
    if (h && n) return `HSN: ${h}\n${n}`;
    if (h) return `HSN: ${h}`;
    return n || "";
  };
  useGhostFill({
    name: (v) => setName(String(v ?? "")),
    unit: (v) => setUnit(String(v ?? "pcs")),
    hsn_code: (v) => {
      hsnBufRef.current = String(v ?? "");
      setDescription(composeDescription());
    },
    notes: (v) => {
      notesBufRef.current = String(v ?? "");
      setDescription(composeDescription());
    },
  });

  // Autocomplete: union of every tag ever used across the catalog.
  const suggestedTags = useMemo(() => {
    const set = new Set<string>();
    (catalog.data || []).forEach((it) => (it.tags || []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [catalog.data]);

  useEffect(() => {
    if (isNew || hydrated || !existing) return;
    const it = existing;
    setName(it.name || "");
    setUnit(it.unit || "pcs");
    setBuy(String(it.buying_price ?? ""));
    setSell(String(it.selling_price ?? ""));
    setDescription(it.description || "");
    setSupplierId(it.supplier_party_id || null);
    setPhotoUri(it.photo_url || null);
    setTags(Array.isArray(it.tags) ? it.tags : []);
    setHydrated(true);
  }, [existing, isNew, hydrated]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      if (perm.canAskAgain === false) {
        Alert.alert(
          "Photo access needed",
          "Enable Photos permission from Settings to attach product images.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
      } else {
        toast.warn("Photo access denied");
      }
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      base64: false,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    // Route through the EXIF stripper before persisting — this removes
    // GPS coords, camera identifiers, timestamps, and everything else the
    // OS embedded on capture. Also resizes huge photos so we don't bloat
    // the DB with 12MP raws when a thumbnail will do.
    try {
      const cleaned = await stripExifToBase64Async(asset.uri);
      setPhotoUri(cleaned);
    } catch (e) {
      // Fall back to the original if the manipulator fails (rare on
      // supported formats); worst case we skip stripping but never lose
      // the photo the operator picked.
      console.warn("EXIF strip failed, using original:", (e as Error).message);
      setPhotoUri(asset.uri);
    }
  };

  const addTag = () => {
    const t = tagDraft.trim();
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setTagDraft("");
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagDraft("");
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Missing", "Name is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        unit: unit.trim() || "pcs",
        buying_price: Number(buy) || 0,
        selling_price: Number(sell) || 0,
        description: description.trim() || null,
        supplier_party_id: supplierId,
        photo_url: photoUri,
        tags,
      };
      if (isNew) {
        await apiPost<Item>("/api/items", payload);
        toast.success(`${name.trim()} added to catalog`);
      } else {
        await apiPut<Item>(`/api/items/${id}`, payload);
        toast.success(`${name.trim()} updated`);
      }
      router.back();
    } catch (e) {
      Alert.alert("Failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (isNew || !id) return;
    Alert.alert("Delete item", `Remove "${name}" from the catalog?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiDelete(`/api/items/${id}`);
            toast.info(`${name} deleted`);
            router.back();
          } catch (e) {
            Alert.alert("Failed", (e as Error).message);
          }
        },
      },
    ]);
  };

  if (!isNew && catalogLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.lime} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headTitle} numberOfLines={1}>
          {isNew ? "New item" : name || "Item"}
        </Text>
        {!isNew ? (
          <TouchableOpacity onPress={remove} style={styles.iconBtn} testID="delete-item">
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <TouchableOpacity onPress={save} disabled={busy} style={styles.saveBtn} testID="save-item">
          <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Big photo hero */}
          <TouchableOpacity style={styles.photoWrap} onPress={pickImage} activeOpacity={0.85} testID="pick-photo">
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={styles.photoPh}>
                <Ionicons name="camera-outline" size={40} color={colors.lime} />
                <Text style={styles.photoPhText}>Tap to add photo</Text>
              </View>
            )}
            {photoUri ? (
              <View style={styles.photoOverlay}>
                <Ionicons name="camera" size={14} color={colors.text} />
                <Text style={styles.photoOverlayText}>Change</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <Field label="Name">
            <TextInput
              style={styles.input}
              placeholder="e.g. Cotton bedsheets — king size"
              placeholderTextColor={colors.textDim}
              value={name}
              onChangeText={setName}
              testID="item-name"
            />
          </Field>

          <Field label="Description">
            <TextInput
              style={[styles.input, styles.multi]}
              placeholder="Material, dimensions, colour options…"
              placeholderTextColor={colors.textDim}
              value={description}
              onChangeText={setDescription}
              multiline
              testID="item-description"
            />
          </Field>

          <Field label="Supplier">
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setPickSupplier(true)}
              testID="item-supplier"
            >
              <Text style={[styles.selectText, !supplier && styles.selectPh]} numberOfLines={1}>
                {supplier?.name || "Choose supplier from Parties"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textDim} />
            </TouchableOpacity>
            {suppliers.length === 0 ? (
              <Text style={styles.hint}>
                No suppliers yet. Add a party with role &quot;supplier&quot; to link one.
              </Text>
            ) : null}
          </Field>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Unit">
                <TextInput style={styles.input} placeholder="pcs, kg, m…" placeholderTextColor={colors.textDim} value={unit} onChangeText={setUnit} />
              </Field>
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Field label="Buying">
                <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textDim} value={buy} onChangeText={setBuy} />
              </Field>
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Field label="Selling">
                <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textDim} value={sell} onChangeText={setSell} />
              </Field>
            </View>
          </View>

          <Field label="Tags · OPSI looks these up">
            <View style={styles.tagWrap}>
              {tags.map((t) => (
                <TouchableOpacity key={t} style={styles.tagChip} onPress={() => removeTag(t)}>
                  <Text style={styles.tagText}>{t}</Text>
                  <Ionicons name="close" size={12} color={colors.lime} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.tagInputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="e.g. Bedsheets, Cushion Covers"
                placeholderTextColor={colors.textDim}
                value={tagDraft}
                onChangeText={setTagDraft}
                onSubmitEditing={addTag}
                returnKeyType="done"
                testID="item-tag-input"
              />
              <TouchableOpacity style={styles.addTagBtn} onPress={addTag} testID="add-tag">
                <Ionicons name="add" size={18} color={colors.bg} />
              </TouchableOpacity>
            </View>
            {suggestedTags.length > 0 && suggestedTags.some((s) => !tags.includes(s)) ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {suggestedTags
                  .filter((s) => !tags.includes(s))
                  .slice(0, 12)
                  .map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.suggestChip}
                      onPress={() => setTags((prev) => [...prev, s])}
                    >
                      <Ionicons name="add-circle-outline" size={11} color={colors.textDim} />
                      <Text style={styles.suggestText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            ) : null}
          </Field>

          {!isNew && id ? (
            <Text style={styles.idHint} selectable>
              ID · {id}
            </Text>
          ) : null}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {pickSupplier && (
        <Pressable style={styles.backdrop} onPress={() => setPickSupplier(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose supplier</Text>
            {suppliers.length === 0 ? (
              <Text style={styles.emptyPicker}>
                No suppliers yet. Add a party with role &quot;supplier&quot; first.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                {suppliers.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.pickRow}
                    onPress={() => {
                      setSupplierId(p.id);
                      setPickSupplier(false);
                    }}
                  >
                    <Text style={styles.pickName}>{p.name}</Text>
                    <Text style={styles.pickMeta}>
                      {p.country} · {p.default_currency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setPickSupplier(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 4,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: 8 },
  headTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "800" },
  saveBtn: { backgroundColor: colors.lime, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill },
  saveText: { color: colors.bg, fontWeight: "800", fontSize: 13 },
  content: { padding: spacing.lg },
  field: { marginBottom: spacing.md },
  label: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
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
  multi: { minHeight: 80, textAlignVertical: "top" },
  row2: { flexDirection: "row" },
  photoWrap: {
    aspectRatio: 1,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
    marginBottom: spacing.lg,
    position: "relative",
  },
  photo: { width: "100%", height: "100%" },
  photoPh: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderWidth: 0,
  },
  photoPhText: { color: colors.textDim, fontSize: 13, fontWeight: "700" },
  photoOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  photoOverlayText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  selectBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectText: { color: colors.text, fontSize: 15 },
  selectPh: { color: colors.textDim },
  hint: { color: colors.textDim, fontSize: 11, marginTop: 6 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagText: { color: colors.lime, fontSize: 12, fontWeight: "700" },
  tagInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  addTagBtn: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 6,
  },
  suggestText: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  idHint: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 0.3,
    textAlign: "center",
    marginTop: spacing.lg,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  emptyPicker: { color: colors.textDim, textAlign: "center", padding: spacing.lg },
  pickRow: {
    paddingVertical: 12,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pickName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  pickMeta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  sheetCancel: {
    marginTop: spacing.md,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
  },
  sheetCancelText: { color: colors.text, fontWeight: "700" },
});
// Unused imports guard — keeps `fmtCurrency` in the graph in case we
// add price previews later without triggering a lint warning right now.
void fmtCurrency;
