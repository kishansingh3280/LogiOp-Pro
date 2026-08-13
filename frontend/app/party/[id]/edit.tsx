/**
 * /party/[id]/edit — Full-page Edit Party form (Phase 3 · Fix 3c).
 * Fetches the existing party (with local meta overlay merged) and
 * pre-fills the shared PartyForm.
 */
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "@/src/lib/api";
import { PartyForm, type PartyFormValues } from "@/src/components/party-form";
import { colors } from "@/src/lib/theme";

export default function EditPartyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<PartyFormValues | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGet<PartyFormValues>(`/api/parties/${id}`)
      .then((p) =>
        setInitial({
          id: p.id,
          name: p.name,
          role: p.role,
          phone: p.phone,
          address: p.address,
          lat: p.lat != null ? String(p.lat) : undefined,
          lng: p.lng != null ? String(p.lng) : undefined,
          notes: p.notes || undefined,
          photo_url: p.photo_url ?? null,
        }),
      )
      .catch(() => setInitial({ id: id as string, name: "" }));
  }, [id]);

  if (!initial) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <PartyForm
      title="Edit Party"
      subtitle={initial.name || "Update party details"}
      submitLabel="Save Changes"
      initial={initial}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
