/**
 * InvoiceDetailView — shared body component for the invoice detail
 * screen. Rendered inside:
 *   • /app/invoice/[id].tsx (mobile full screen, with back button)
 *   • /app/(tabs)/invoices.tsx (right side of tablet split view)
 *
 * Renders Bill To, items table, subtotal/tax/grand total, and share.
 * The OS share sheet includes "Print → Save as PDF" — no native
 * PDF module required.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { fmtCurrency, longDate, shortDate, titleCase } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, LabelValueRow, Pill } from "@/src/lib/ui";

type InvoiceItem = {
  description: string;
  quantity: number;
  unit?: string;
  rate: number;
};

type Invoice = {
  id: string;
  number: string;
  party_id: string;
  shipment_id?: string | null;
  date?: string;
  due_date?: string | null;
  currency?: "INR" | "THB";
  items: InvoiceItem[];
  tax_percent: number;
  status?: string;
  notes?: string | null;
  subtotal?: number;
  tax_amount?: number;
  total?: number;
  company?: string;
  created_at?: string;
};

type Party = {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  gstin?: string;
};

const STATUS: Record<string, { tint: string; soft: string }> = {
  draft: { tint: colors.textDim, soft: colors.divider },
  sent: { tint: colors.info, soft: colors.infoSoft },
  paid: { tint: colors.brand, soft: colors.brandSoft },
  cancelled: { tint: colors.danger, soft: colors.dangerSoft },
  overdue: { tint: colors.warn, soft: colors.warnSoft },
};

const COMPANY_LABELS: Record<string, string> = {
  awadh_enterprise: "Awadh Enterprise",
  singh_exports: "Singh Exports",
  aura_singh: "Aura Singh",
};

export function InvoiceDetailView({ id }: { id: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const inv = await apiGet<Invoice>(`/api/invoices/${id}`);
      setInvoice(inv);
      if (inv.party_id) {
        apiGet<Party>(`/api/parties/${inv.party_id}`)
          .then(setParty)
          .catch(() => setParty(null));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (token && id) {
      setInvoice(null);
      setParty(null);
      load();
    }
  }, [token, id, load]);

  const totals = useMemo(() => {
    if (!invoice) return { subtotal: 0, tax: 0, total: 0 };
    const sub =
      invoice.subtotal ??
      invoice.items.reduce(
        (s, it) => s + Number(it.quantity ?? 0) * Number(it.rate ?? 0),
        0,
      );
    const tax = invoice.tax_amount ?? sub * (Number(invoice.tax_percent ?? 0) / 100);
    const total = invoice.total ?? sub + tax;
    return { subtotal: sub, tax, total };
  }, [invoice]);

  const status = STATUS[(invoice?.status || "draft").toLowerCase()] ?? STATUS.draft;

  const buildShareText = useCallback((): string => {
    if (!invoice) return "";
    const cur = invoice.currency || "INR";
    const lines: string[] = [];
    lines.push(`INVOICE ${invoice.number}`);
    if (invoice.company) lines.push(`From: ${COMPANY_LABELS[invoice.company] || invoice.company}`);
    lines.push(`Date: ${longDate(invoice.date)}`);
    if (invoice.due_date) lines.push(`Due: ${longDate(invoice.due_date)}`);
    lines.push(`Status: ${(invoice.status || "draft").toUpperCase()}`);
    lines.push("");
    lines.push(`Bill To: ${party?.name || invoice.party_id}`);
    if (party?.address) lines.push(`Address: ${party.address}`);
    if (party?.phone) lines.push(`Phone: ${party.phone}`);
    if (party?.email) lines.push(`Email: ${party.email}`);
    if (party?.gstin) lines.push(`GSTIN: ${party.gstin}`);
    lines.push("");
    lines.push("Items:");
    lines.push("-------------------------------------------");
    invoice.items.forEach((it, i) => {
      const amount = Number(it.quantity ?? 0) * Number(it.rate ?? 0);
      lines.push(
        `${i + 1}. ${it.description}\n   ${it.quantity} × ${fmtCurrency(it.rate, cur)} = ${fmtCurrency(amount, cur)}`,
      );
    });
    lines.push("-------------------------------------------");
    lines.push(`Subtotal: ${fmtCurrency(totals.subtotal, cur)}`);
    if (invoice.tax_percent) {
      lines.push(`Tax (${invoice.tax_percent}%): ${fmtCurrency(totals.tax, cur)}`);
    }
    lines.push(`GRAND TOTAL: ${fmtCurrency(totals.total, cur)}`);
    if (invoice.notes) {
      lines.push("");
      lines.push(`Notes: ${invoice.notes}`);
    }
    return lines.join("\n");
  }, [invoice, party, totals]);

  const handleShare = useCallback(async () => {
    if (!invoice) return;
    try {
      await Share.share(
        {
          title: `Invoice ${invoice.number}`,
          message: buildShareText(),
        },
        { dialogTitle: `Share Invoice ${invoice.number}` },
      );
    } catch {
      /* user cancelled */
    }
  }, [invoice, buildShareText]);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
      }
      showsVerticalScrollIndicator={false}
    >
      {invoice === null && loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.dim}>Loading invoice…</Text>
        </View>
      ) : error ? (
        <GlassCard style={styles.errorCard}>
          <Ionicons name="alert-circle" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </GlassCard>
      ) : invoice ? (
        <>
          <GlassCard glow style={styles.headerCard}>
            <View style={styles.headerCardTop}>
              <Pill
                label={titleCase(invoice.status || "draft")}
                tint={status.tint}
                soft={status.soft}
              />
              <Text style={styles.dim}>{longDate(invoice.date)}</Text>
            </View>
            <Text style={styles.invNumber}>{invoice.number}</Text>
            {invoice.due_date ? (
              <Text style={styles.dueText}>Due {longDate(invoice.due_date)}</Text>
            ) : null}
          </GlassCard>

          <Text style={styles.section}>Bill To</Text>
          <GlassCard>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push(`/party/${invoice.party_id}` as any)}
              style={styles.billToRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.partyName}>{party?.name || "Loading…"}</Text>
                {party?.address ? (
                  <Text style={styles.partySub}>{party.address}</Text>
                ) : null}
                {party?.phone || party?.email ? (
                  <Text style={styles.partySub}>
                    {[party?.phone, party?.email].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
                {party?.gstin ? (
                  <Text style={styles.partySub}>GSTIN: {party.gstin}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </TouchableOpacity>
          </GlassCard>

          <Text style={styles.section}>Items</Text>
          <GlassCard padded={false} style={styles.itemsCard}>
            <View style={styles.itemsHeader}>
              <Text style={[styles.thText, { flex: 3 }]}>Description</Text>
              <Text style={[styles.thText, styles.thNum]}>Qty</Text>
              <Text style={[styles.thText, styles.thNum]}>Rate</Text>
              <Text style={[styles.thText, styles.thNum, { flex: 1.4 }]}>Amount</Text>
            </View>
            {invoice.items.map((it, idx) => {
              const amount = Number(it.quantity ?? 0) * Number(it.rate ?? 0);
              return (
                <View
                  key={idx}
                  style={[
                    styles.itemRow,
                    idx < invoice.items.length - 1 && styles.itemRowBorder,
                  ]}
                >
                  <View style={{ flex: 3 }}>
                    <Text style={styles.itemDesc} numberOfLines={3}>
                      {it.description}
                    </Text>
                    {it.unit ? <Text style={styles.itemUnit}>{it.unit}</Text> : null}
                  </View>
                  <Text style={[styles.itemVal, styles.thNum]} numberOfLines={1}>
                    {it.quantity}
                  </Text>
                  <Text style={[styles.itemVal, styles.thNum]} numberOfLines={1}>
                    {fmtCurrency(it.rate, invoice.currency)}
                  </Text>
                  <Text
                    style={[
                      styles.itemVal,
                      styles.thNum,
                      { flex: 1.4, fontWeight: "800" },
                    ]}
                    numberOfLines={1}
                  >
                    {fmtCurrency(amount, invoice.currency)}
                  </Text>
                </View>
              );
            })}
          </GlassCard>

          <GlassCard style={styles.totalsCard}>
            <LabelValueRow
              label="Subtotal"
              value={fmtCurrency(totals.subtotal, invoice.currency)}
            />
            {invoice.tax_percent ? (
              <LabelValueRow
                label={`Tax (${invoice.tax_percent}%)`}
                value={fmtCurrency(totals.tax, invoice.currency)}
              />
            ) : null}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
              <Text style={styles.grandTotalValue}>
                {fmtCurrency(totals.total, invoice.currency)}
              </Text>
            </View>
          </GlassCard>

          {invoice.shipment_id ? (
            <TouchableOpacity
              style={styles.linkCard}
              onPress={() => router.push(`/shipment/${invoice.shipment_id}` as any)}
              activeOpacity={0.75}
            >
              <Ionicons name="airplane" size={18} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Linked shipment</Text>
                <Text style={styles.linkSub}>Tap to view consignment details</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </TouchableOpacity>
          ) : null}

          {invoice.notes ? (
            <>
              <Text style={styles.section}>Notes</Text>
              <GlassCard>
                <Text style={styles.notes}>{invoice.notes}</Text>
              </GlassCard>
            </>
          ) : null}

          <Text style={styles.section}>Meta</Text>
          <GlassCard>
            <LabelValueRow label="Invoice ID" value={invoice.id} />
            <LabelValueRow label="Created" value={shortDate(invoice.created_at)} />
            {invoice.company ? (
              <LabelValueRow
                label="Company"
                value={COMPANY_LABELS[invoice.company] || invoice.company}
              />
            ) : null}
          </GlassCard>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={18} color={colors.bg} />
            <Text style={styles.primaryBtnText}>Share invoice · Save as PDF</Text>
          </TouchableOpacity>
          <Text style={styles.tipText}>
            Tip: from the share sheet, pick <Text style={styles.tipStrong}>Print</Text> and
            choose <Text style={styles.tipStrong}>Save as PDF</Text> on Android.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

// Export for potential use in tablet split header (e.g. share button)
export function useInvoiceShare(_id: string) {
  return null;
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  headerCard: { padding: spacing.lg, marginBottom: spacing.md },
  headerCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  invNumber: { color: colors.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  dueText: { color: colors.warn, fontSize: 12, fontWeight: "700", marginTop: 4 },
  section: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  billToRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  partyName: { color: colors.text, fontSize: 16, fontWeight: "800" },
  partySub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  itemsCard: { overflow: "hidden" },
  itemsHeader: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.divider,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 6,
  },
  thText: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  thNum: { flex: 1, textAlign: "right" },
  itemRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 6,
    alignItems: "center",
  },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  itemDesc: { color: colors.text, fontSize: 12, lineHeight: 16 },
  itemUnit: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  itemVal: { color: colors.text, fontSize: 12, fontWeight: "600" },
  totalsCard: { marginTop: spacing.md },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  grandTotalLabel: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  grandTotalValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  linkCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  linkTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  linkSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  notes: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.brand,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { color: colors.bg, fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
  tipText: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  tipStrong: { color: colors.brand, fontWeight: "800" },
  loading: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  dim: { color: colors.textDim, fontSize: 11 },
  errorCard: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderColor: colors.danger,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 12 },
  retry: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});
