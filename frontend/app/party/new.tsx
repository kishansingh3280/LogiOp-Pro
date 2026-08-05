import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiPost } from "@/src/api/client";
import type { Currency, Party, PartyRole } from "@/src/api/types";
import { colors, radii, spacing } from "@/src/theme";

const ROLES: PartyRole[] = ["customer", "supplier", "carrier", "vendor", "other"];

export default function NewPartyScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState<PartyRole>("customer");
  const [country, setCountry] = useState<"IN" | "TH">("IN");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return Alert.alert("Missing", "Name is required");
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        role,
        country,
        default_currency: currency,
        phone,
        email,
        gstin,
        address,
      };
      const res = await apiPost<Party>("/api/parties", payload);
      if ((res as { queued?: boolean }).queued) {
        Alert.alert("Queued", "Saved locally — syncing when back online.");
      }
      router.back();
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
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headTitle}>New party</Text>
        <TouchableOpacity onPress={save} disabled={busy} style={styles.saveBtn} testID="save-party-btn">
          <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Field label="Name">
            <TextInput style={styles.input} placeholder="Client name" placeholderTextColor={colors.textDim} value={name} onChangeText={setName} testID="input-name" />
          </Field>

          <Field label="Role">
            <View style={styles.segRow}>
              {ROLES.map((r) => {
                const active = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    style={[styles.seg, active && styles.segActive]}
                  >
                    <Text style={[styles.segText, active && styles.segTextActive]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Country">
                <View style={styles.segRow}>
                  {(["IN", "TH"] as const).map((c) => {
                    const active = country === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setCountry(c)}
                        style={[styles.seg, active && styles.segActive]}
                      >
                        <Text style={[styles.segText, active && styles.segTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Currency">
                <View style={styles.segRow}>
                  {(["INR", "THB"] as Currency[]).map((c) => {
                    const active = currency === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setCurrency(c)}
                        style={[styles.seg, active && styles.segActive]}
                      >
                        <Text style={[styles.segText, active && styles.segTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Field>
            </View>
          </View>

          <Field label="Phone">
            <TextInput style={styles.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="+91…" placeholderTextColor={colors.textDim} />
          </Field>

          <Field label="Email">
            <TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="name@example.com" placeholderTextColor={colors.textDim} />
          </Field>

          <Field label="GSTIN">
            <TextInput style={styles.input} autoCapitalize="characters" value={gstin} onChangeText={setGstin} placeholder="15-digit GSTIN" placeholderTextColor={colors.textDim} />
          </Field>

          <Field label="Address">
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={address}
              onChangeText={setAddress}
              placeholder="Full address"
              placeholderTextColor={colors.textDim}
            />
          </Field>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  safe: { flex: 1, backgroundColor: colors.bg },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
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
  multiline: { minHeight: 80, textAlignVertical: "top" },
  segRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  seg: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  segActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  segText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  segTextActive: { color: colors.bg },
  row2: { flexDirection: "row" },
});
