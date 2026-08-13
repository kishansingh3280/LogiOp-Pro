/**
 * Reports — Phase 8 (final).
 *
 * A single hub with four PDF-ready exports:
 *   1. Ledger summary report — receivable/payable totals + top-3 lists
 *   2. Party statement       — pick a party, get running-balance PDF
 *   3. Shipment manifest     — pick a shipment, get consignment PDF
 *   4. Invoice PDF           — pick an invoice, get pro forma PDF
 *
 * Each report is rendered as neatly-formatted plain text and handed
 * to React Native's core `Share.share()` API — from the OS share
 * sheet the user picks **Print → Save as PDF** on Android to produce
 * a real PDF file. Zero new native modules; only core RN.
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { fmtCurrency, longDate } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, Pill } from "@/src/lib/ui";

// ── API shapes (minimal — used for tile counts + ledger summary) ──
type LedgerSummary = {
  receivable?: { inr?: number; thb?: number };
  payable?: { inr?: number; thb?: number };
  top_get?: { id: string; name: string; inr?: number; thb?: number }[];
  top_give?: { id: string; name: string; inr?: number; thb?: number }[];
};

// ── Screen ─────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const { token } = useAuth();
  const router = useRouter();

  const [partyCount, setPartyCount] = useState(0);
  const [shipmentCount, setShipmentCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  // ── Load lightweight counts once so tiles show real totals.
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiGet<unknown[]>("/api/parties").catch(() => []),
      apiGet<unknown[]>("/api/shipments").catch(() => []),
      apiGet<unknown[]>("/api/invoices").catch(() => []),
    ])
      .then(([p, s, i]) => {
        setPartyCount(Array.isArray(p) ? p.length : 0);
        setShipmentCount(Array.isArray(s) ? s.length : 0);
        setInvoiceCount(Array.isArray(i) ? i.length : 0);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // ── Report generators ─────────────────────────────────────────────

  const runLedgerSummary = useCallback(async () => {
    setPending("ledger");
    try {
      const s = await apiGet<LedgerSummary>("/api/dashboard/ledger-summary");
      const lines: string[] = [];
      lines.push("LEDGER SUMMARY REPORT");
      lines.push(`Generated: ${longDate(new Date().toISOString())}`);
      lines.push("─────────────────────────────────────────");
      lines.push("");
      lines.push("RECEIVABLE (they owe us)");
      lines.push(`  INR: ${fmtCurrency(s.receivable?.inr ?? 0, "INR")}`);
      lines.push(`  THB: ${fmtCurrency(s.receivable?.thb ?? 0, "THB")}`);
      lines.push("");
      lines.push("PAYABLE (we owe them)");
      lines.push(`  INR: ${fmtCurrency(s.payable?.inr ?? 0, "INR")}`);
      lines.push(`  THB: ${fmtCurrency(s.payable?.thb ?? 0, "THB")}`);
      lines.push("");
      if ((s.top_get || []).length) {
        lines.push("TOP RECEIVABLES");
        for (const p of s.top_get!.slice(0, 5)) {
          const parts: string[] = [];
          if (p.inr) parts.push(fmtCurrency(p.inr, "INR"));
          if (p.thb) parts.push(fmtCurrency(p.thb, "THB"));
          lines.push(`  • ${p.name}: ${parts.join(" · ")}`);
        }
        lines.push("");
      }
      if ((s.top_give || []).length) {
        lines.push("TOP PAYABLES");
        for (const p of s.top_give!.slice(0, 5)) {
          const parts: string[] = [];
          if (p.inr) parts.push(fmtCurrency(Math.abs(p.inr), "INR"));
          if (p.thb) parts.push(fmtCurrency(Math.abs(p.thb), "THB"));
          lines.push(`  • ${p.name}: ${parts.join(" · ")}`);
        }
      }
      await Share.share(
        { title: "Ledger Summary", message: lines.join("\n") },
        { dialogTitle: "Share ledger summary" },
      );
    } catch (e) {
      console.warn("[reports] ledger summary failed:", (e as Error).message);
    } finally {
      setPending(null);
    }
  }, []);

  const runPartyStatement = useCallback(() => {
    router.push("/reports/pick-party" as any);
  }, [router]);

  const runShipmentManifest = useCallback(() => {
    router.push("/reports/pick-shipment" as any);
  }, [router]);

  const runInvoicePdf = useCallback(() => {
    router.push("/reports/pick-invoice" as any);
  }, [router]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>PDF exports · share sheet · print</Text>
        </View>
        <Pill label="PDF" tint={colors.brand} soft={colors.brandSoft} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <GlassCard glow style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="document-attach" size={20} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Save as PDF from any report</Text>
            <Text style={styles.introBody}>
              Pick a report below → the OS share sheet opens →{" "}
              <Text style={styles.tipStrong}>Print</Text> →{" "}
              <Text style={styles.tipStrong}>Save as PDF</Text>.
            </Text>
          </View>
        </GlassCard>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.dim}>Loading reference data…</Text>
          </View>
        ) : null}

        {/* Report tiles */}
        <ReportTile
          icon="stats-chart"
          title="Ledger Summary"
          subtitle="Receivable + payable totals + top parties"
          count={`${partyCount} parties`}
          pending={pending === "ledger"}
          onPress={runLedgerSummary}
        />

        <ReportTile
          icon="document-text"
          title="Party Statement"
          subtitle="Chronological running balance for one party"
          count={`${partyCount} to pick from`}
          pending={false}
          onPress={runPartyStatement}
        />

        <ReportTile
          icon="airplane"
          title="Shipment Manifest"
          subtitle="Consignment header + per-bag carrier breakdown"
          count={`${shipmentCount} shipments`}
          pending={false}
          onPress={runShipmentManifest}
        />

        <ReportTile
          icon="receipt"
          title="Invoice PDF"
          subtitle="Item table, totals, GSTIN, notes"
          count={`${invoiceCount} invoices`}
          pending={false}
          onPress={runInvoicePdf}
        />

        <Text style={styles.footNote}>Aura · Phase 8 online</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── ReportTile ────────────────────────────────────────────────────────
function ReportTile({
  icon,
  title,
  subtitle,
  count,
  pending,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  count: string;
  pending: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={onPress}
      disabled={pending}
      activeOpacity={0.85}
    >
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={22} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSub}>{subtitle}</Text>
        <Text style={styles.tileCount}>{count}</Text>
      </View>
      {pending ? (
        <ActivityIndicator color={colors.brand} />
      ) : (
        <View style={styles.tileGo}>
          <Ionicons name="share-outline" size={16} color={colors.bg} />
        </View>
      )}
    </TouchableOpacity>
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
  title: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  intro: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  introIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  introTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  introBody: { color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  tipStrong: { color: colors.brand, fontWeight: "800" },
  loading: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  dim: { color: colors.textDim, fontSize: 12 },

  tile: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tileTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  tileSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  tileCount: {
    color: colors.textDim,
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  tileGo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.6,
    elevation: 6,
  },
  footNote: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: spacing.xl,
  },

  // ─ Picker
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  pickerPanel: {
    backgroundColor: colors.bgSolid,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.brandBorder,
    maxHeight: "85%",
    minHeight: "55%",
    paddingBottom: spacing.md,
  },
  pickerGrabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textDim,
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.6,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  pickerTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "800" },
  pickerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  pickerSearchWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  pickerSearch: {
    flex: 1,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  pickerList: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  pickerSep: { height: 1, backgroundColor: colors.divider },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: spacing.sm,
  },
  pickerItemTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  pickerItemSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  pickerEmpty: { padding: spacing.xl, alignItems: "center" },
});
