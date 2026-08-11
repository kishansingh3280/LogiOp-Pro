/**
 * ShareActionBar — 4-icon row for PDF / WhatsApp / LINE / Email share
 * of any document (invoice, shipment packing list, ledger statement).
 *
 * Each button is a colored pill with an emoji + label. Tapping fires
 * the corresponding callback. The parent decides what "share" means
 * for its context (generate PDF, open share sheet, POST to the
 * broadcast log, etc.).
 *
 * Design language: matches OPSI — frosted glass tiles with each
 * platform's brand tint (WhatsApp green, LINE lime, Email blue,
 * PDF neutral gray). Tap targets are ≥ 44px per platform HIG.
 */
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, radii } from "@/src/theme";

type Props = {
  onPdf?: () => void;
  onWhatsapp?: () => void;
  onLine?: () => void;
  onEmail?: () => void;
  loading?: string | null; // key of button currently in-flight
};

export function ShareActionBar({ onPdf, onWhatsapp, onLine, onEmail, loading }: Props) {
  return (
    <View style={styles.row} testID="share-action-bar">
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "rgba(148,163,184,0.18)", borderColor: "rgba(148,163,184,0.35)" }]}
        onPress={onPdf}
        disabled={!onPdf || loading === "pdf"}
        activeOpacity={0.8}
        testID="share-pdf"
        accessibilityLabel="Get PDF"
      >
        <Ionicons name="document-text-outline" size={18} color="#CBD5E1" />
        <Text style={[styles.label, { color: "#CBD5E1" }]}>{loading === "pdf" ? "…" : "PDF"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "rgba(37,211,102,0.18)", borderColor: "rgba(37,211,102,0.4)" }]}
        onPress={onWhatsapp}
        disabled={!onWhatsapp || loading === "whatsapp"}
        activeOpacity={0.8}
        testID="share-whatsapp"
        accessibilityLabel="Send via WhatsApp"
      >
        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
        <Text style={[styles.label, { color: "#25D366" }]}>{loading === "whatsapp" ? "…" : "WhatsApp"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "rgba(0,195,0,0.16)", borderColor: "rgba(0,195,0,0.4)" }]}
        onPress={onLine}
        disabled={!onLine || loading === "line"}
        activeOpacity={0.8}
        testID="share-line"
        accessibilityLabel="Send via LINE"
      >
        <Ionicons name="chatbubbles-outline" size={18} color="#00C300" />
        <Text style={[styles.label, { color: "#00C300" }]}>{loading === "line" ? "…" : "LINE"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "rgba(59,130,246,0.18)", borderColor: "rgba(59,130,246,0.4)" }]}
        onPress={onEmail}
        disabled={!onEmail || loading === "email"}
        activeOpacity={0.8}
        testID="share-email"
        accessibilityLabel="Send via Email"
      >
        <Ionicons name="mail-outline" size={18} color="#60A5FA" />
        <Text style={[styles.label, { color: "#60A5FA" }]}>{loading === "email" ? "…" : "Email"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    minWidth: 88,
    minHeight: 44,
    flex: 1,
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    ...(colors ? {} : {}),
  },
  label: {
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

export default ShareActionBar;
