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
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { fmtCurrency, longDate, shortDate, titleCase } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, Pill } from "@/src/lib/ui";

// ── API shapes ─────────────────────────────────────────────────────
type Party = {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  opening_balance_inr?: number;
  opening_balance_thb?: number;
};

type LedgerEntry = {
  id: string;
  party_id: string;
  date?: string;
  description: string;
  currency: "INR" | "THB";
  debit: number;
  credit: number;
  ref_type?: string;
};

type LedgerSummary = {
  receivable?: { inr?: number; thb?: number };
  payable?: { inr?: number; thb?: number };
  top_get?: { id: string; name: string; inr?: number; thb?: number }[];
  top_give?: { id: string; name: string; inr?: number; thb?: number }[];
};

type Shipment = {
  id: string;
  consignment_no: string;
  direction: "IN_TO_TH" | "TH_TO_IN";
  mode?: string;
  origin?: string;
  destination?: string;
  goods?: string;
  status: string;
  weight_kg: number;
  bag_count: number;
  freight: number;
  freight_currency: "INR" | "THB";
  party_id?: string;
  carrier_party_id?: string;
  dispatch_date?: string;
  created_at: string;
  notes?: string;
  bags?: {
    id: string;
    weight_kg?: number;
    contents?: string | null;
    carrier_party_id?: string | null;
    status?: string;
  }[];
};

type InvoiceItem = { description: string; quantity: number; rate: number; unit?: string };
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
  notes?: string;
};

type PickerKind = null | "party" | "shipment" | "invoice";

// ── Screen ─────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const { token } = useAuth();
  const router = useRouter();

  const [parties, setParties] = useState<Party[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  // ── Load reference lists once. Ledger data is fetched on demand
  //    per-report so we don't waste bandwidth up-front.
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiGet<Party[]>("/api/parties").catch(() => []),
      apiGet<Shipment[]>("/api/shipments").catch(() => []),
      apiGet<Invoice[]>("/api/invoices").catch(() => []),
    ])
      .then(([p, s, i]) => {
        setParties(Array.isArray(p) ? p : []);
        setShipments(Array.isArray(s) ? s : []);
        setInvoices(Array.isArray(i) ? i : []);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const partyMap = useMemo(() => {
    const m: Record<string, Party> = {};
    for (const p of parties) m[p.id] = p;
    return m;
  }, [parties]);

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
      // Best-effort — a Share cancel throws too, silent is fine.
      console.warn("[reports] ledger summary failed:", (e as Error).message);
    } finally {
      setPending(null);
    }
  }, []);

  const runPartyStatement = useCallback(
    async (party: Party) => {
      setPending(`party:${party.id}`);
      setPicker(null);
      try {
        const entries = await apiGet<LedgerEntry[]>(
          `/api/ledger/entries?party_id=${party.id}`,
        );
        const sorted = (entries || [])
          .slice()
          .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        let balInr = party.opening_balance_inr ?? 0;
        let balThb = party.opening_balance_thb ?? 0;
        const lines: string[] = [];
        lines.push(`LEDGER STATEMENT — ${party.name}`);
        if (party.role) lines.push(`Role: ${titleCase(party.role)}`);
        if (party.phone) lines.push(`Phone: ${party.phone}`);
        if (party.email) lines.push(`Email: ${party.email}`);
        if (party.gstin) lines.push(`GSTIN: ${party.gstin}`);
        lines.push(`Generated: ${longDate(new Date().toISOString())}`);
        lines.push("─────────────────────────────────────────");
        if (balInr) lines.push(`Opening (INR): ${fmtCurrency(balInr, "INR")}`);
        if (balThb) lines.push(`Opening (THB): ${fmtCurrency(balThb, "THB")}`);
        lines.push("");
        lines.push("DATE       | DESCRIPTION                        |    DEBIT |   CREDIT |  BALANCE");
        lines.push("─────────────────────────────────────────────────────────────────────────");
        for (const e of sorted) {
          const cur = e.currency;
          if (cur === "THB") balThb += (e.debit || 0) - (e.credit || 0);
          else balInr += (e.debit || 0) - (e.credit || 0);
          const bal = cur === "THB" ? balThb : balInr;
          const dr = e.debit ? fmtCurrency(e.debit, cur) : "—";
          const cr = e.credit ? fmtCurrency(e.credit, cur) : "—";
          lines.push(
            `${shortDate(e.date).padEnd(10)} | ${(e.description || "").slice(0, 34).padEnd(34)} | ${dr.padStart(8)} | ${cr.padStart(8)} | ${fmtCurrency(bal, cur)}`,
          );
        }
        lines.push("─────────────────────────────────────────");
        lines.push(`Closing (INR): ${fmtCurrency(balInr, "INR")}`);
        lines.push(`Closing (THB): ${fmtCurrency(balThb, "THB")}`);
        const status =
          balInr > 0 || balThb > 0
            ? "THEY OWE US"
            : balInr < 0 || balThb < 0
              ? "WE OWE THEM"
              : "SETTLED";
        lines.push(`Status: ${status}`);
        await Share.share(
          { title: `Statement — ${party.name}`, message: lines.join("\n") },
          { dialogTitle: `Share statement for ${party.name}` },
        );
      } catch (e) {
        console.warn("[reports] statement failed:", (e as Error).message);
      } finally {
        setPending(null);
      }
    },
    [],
  );

  const runShipmentManifest = useCallback(
    async (sh: Shipment) => {
      setPending(`ship:${sh.id}`);
      setPicker(null);
      try {
        // Best-effort refetch for latest bag state.
        const full = await apiGet<Shipment>(`/api/shipments/${sh.id}`).catch(() => sh);
        const lines: string[] = [];
        lines.push(`SHIPMENT MANIFEST — ${full.consignment_no}`);
        lines.push(`Generated: ${longDate(new Date().toISOString())}`);
        lines.push("─────────────────────────────────────────");
        lines.push(`Direction: ${full.direction === "IN_TO_TH" ? "India → Thailand" : "Thailand → India"}`);
        lines.push(`Mode: ${titleCase(full.mode || "")}`);
        lines.push(`Origin: ${full.origin || "—"}`);
        lines.push(`Destination: ${full.destination || "—"}`);
        lines.push(`Status: ${(full.status || "").toUpperCase()}`);
        lines.push(`Dispatch: ${shortDate(full.dispatch_date)}`);
        lines.push("");
        lines.push(`Customer: ${partyMap[full.party_id || ""]?.name || "—"}`);
        lines.push(`Carrier: ${partyMap[full.carrier_party_id || ""]?.name || "—"}`);
        lines.push(`Goods: ${full.goods || "—"}`);
        lines.push(`Freight: ${fmtCurrency(full.freight, full.freight_currency)}`);
        lines.push(`Total weight: ${full.weight_kg} kg`);
        lines.push(`Bag count: ${full.bag_count}`);
        lines.push("");
        if ((full.bags || []).length) {
          lines.push("BAGS · PER-CARRIER");
          lines.push("BAG ID  | WEIGHT |  CARRIER              | CONTENTS");
          lines.push("──────────────────────────────────────────────────────");
          for (const b of full.bags!) {
            const carrier =
              (b.carrier_party_id && partyMap[b.carrier_party_id]?.name) ||
              partyMap[full.carrier_party_id || ""]?.name ||
              "—";
            lines.push(
              `${(b.id || "").slice(0, 6).padEnd(7)} | ${String(b.weight_kg ?? 0).padStart(5)}kg | ${carrier.slice(0, 20).padEnd(21)} | ${b.contents || "—"}`,
            );
          }
          lines.push("");
        }
        if (full.notes) {
          lines.push("NOTES");
          lines.push(full.notes);
        }
        await Share.share(
          { title: `Manifest — ${full.consignment_no}`, message: lines.join("\n") },
          { dialogTitle: `Share manifest for ${full.consignment_no}` },
        );
      } catch (e) {
        console.warn("[reports] manifest failed:", (e as Error).message);
      } finally {
        setPending(null);
      }
    },
    [partyMap],
  );

  const runInvoicePdf = useCallback(
    async (inv: Invoice) => {
      setPending(`inv:${inv.id}`);
      setPicker(null);
      try {
        const party = partyMap[inv.party_id];
        const cur = inv.currency || "INR";
        const sub = inv.items.reduce(
          (s, it) => s + Number(it.quantity ?? 0) * Number(it.rate ?? 0),
          0,
        );
        const tax = sub * (Number(inv.tax_percent ?? 0) / 100);
        const total = sub + tax;
        const lines: string[] = [];
        lines.push(`INVOICE ${inv.number}`);
        lines.push(`Date: ${longDate(inv.date)}`);
        if (inv.due_date) lines.push(`Due: ${longDate(inv.due_date)}`);
        lines.push(`Status: ${(inv.status || "draft").toUpperCase()}`);
        lines.push("─────────────────────────────────────────");
        lines.push(`Bill To: ${party?.name || inv.party_id}`);
        if (party?.address) lines.push(`Address: ${party.address}`);
        if (party?.phone) lines.push(`Phone: ${party.phone}`);
        if (party?.gstin) lines.push(`GSTIN: ${party.gstin}`);
        lines.push("");
        lines.push("DESCRIPTION                       |  QTY |    RATE |    AMOUNT");
        lines.push("───────────────────────────────────────────────────────────────");
        for (const it of inv.items) {
          const amt = Number(it.quantity ?? 0) * Number(it.rate ?? 0);
          lines.push(
            `${(it.description || "").slice(0, 32).padEnd(33)} | ${String(it.quantity ?? 0).padStart(4)} | ${fmtCurrency(it.rate, cur).padStart(8)} | ${fmtCurrency(amt, cur).padStart(10)}`,
          );
        }
        lines.push("───────────────────────────────────────────────────────────────");
        lines.push(`Subtotal:  ${fmtCurrency(sub, cur)}`);
        if (inv.tax_percent) lines.push(`Tax (${inv.tax_percent}%):  ${fmtCurrency(tax, cur)}`);
        lines.push(`GRAND TOTAL:  ${fmtCurrency(total, cur)}`);
        if (inv.notes) {
          lines.push("");
          lines.push(`Notes: ${inv.notes}`);
        }
        await Share.share(
          { title: `Invoice ${inv.number}`, message: lines.join("\n") },
          { dialogTitle: `Share invoice ${inv.number}` },
        );
      } catch (e) {
        console.warn("[reports] invoice pdf failed:", (e as Error).message);
      } finally {
        setPending(null);
      }
    },
    [partyMap],
  );

  // ── Picker item filter ─────────────────────────────────────────────
  const pickerItems: { id: string; title: string; sub: string }[] = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (picker === "party") {
      return parties
        .filter(
          (p) =>
            !q ||
            (p.name || "").toLowerCase().includes(q) ||
            (p.phone || "").toLowerCase().includes(q),
        )
        .map((p) => ({
          id: p.id,
          title: p.name,
          sub: `${titleCase(p.role || "")} · ${p.phone || p.email || "—"}`,
        }));
    }
    if (picker === "shipment") {
      return shipments
        .filter((s) => !q || s.consignment_no.toLowerCase().includes(q))
        .map((s) => ({
          id: s.id,
          title: s.consignment_no,
          sub: `${s.direction === "IN_TO_TH" ? "IN→TH" : "TH→IN"} · ${s.weight_kg} kg · ${titleCase(s.status)}`,
        }));
    }
    if (picker === "invoice") {
      return invoices
        .filter(
          (i) =>
            !q ||
            (i.number || "").toLowerCase().includes(q) ||
            (partyMap[i.party_id]?.name || "").toLowerCase().includes(q),
        )
        .map((i) => ({
          id: i.id,
          title: i.number,
          sub: `${partyMap[i.party_id]?.name || "—"} · ${titleCase(i.status || "draft")}`,
        }));
    }
    return [];
  }, [picker, pickerQuery, parties, shipments, invoices, partyMap]);

  const pickerTitle =
    picker === "party"
      ? "Pick a party"
      : picker === "shipment"
        ? "Pick a shipment"
        : picker === "invoice"
          ? "Pick an invoice"
          : "";

  const onPickerSelect = useCallback(
    (id: string) => {
      if (picker === "party") {
        const p = parties.find((x) => x.id === id);
        if (p) runPartyStatement(p);
      } else if (picker === "shipment") {
        const s = shipments.find((x) => x.id === id);
        if (s) runShipmentManifest(s);
      } else if (picker === "invoice") {
        const i = invoices.find((x) => x.id === id);
        if (i) runInvoicePdf(i);
      }
    },
    [picker, parties, shipments, invoices, runPartyStatement, runShipmentManifest, runInvoicePdf],
  );

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
          count={`${parties.length} parties`}
          pending={pending === "ledger"}
          onPress={runLedgerSummary}
        />

        <ReportTile
          icon="document-text"
          title="Party Statement"
          subtitle="Chronological running balance for one party"
          count={`${parties.length} to pick from`}
          pending={pending?.startsWith("party:") || false}
          onPress={() => {
            setPickerQuery("");
            setPicker("party");
          }}
        />

        <ReportTile
          icon="airplane"
          title="Shipment Manifest"
          subtitle="Consignment header + per-bag carrier breakdown"
          count={`${shipments.length} shipments`}
          pending={pending?.startsWith("ship:") || false}
          onPress={() => {
            setPickerQuery("");
            setPicker("shipment");
          }}
        />

        <ReportTile
          icon="receipt"
          title="Invoice PDF"
          subtitle="Item table, totals, GSTIN, notes"
          count={`${invoices.length} invoices`}
          pending={pending?.startsWith("inv:") || false}
          onPress={() => {
            setPickerQuery("");
            setPicker("invoice");
          }}
        />

        <Text style={styles.footNote}>Aura · Phase 8 online</Text>
      </ScrollView>

      {/* Picker modal */}
      <Modal
        visible={picker !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerPanel}>
            <View style={styles.pickerGrabber} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{pickerTitle}</Text>
              <TouchableOpacity
                onPress={() => setPicker(null)}
                style={styles.pickerClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearchWrap}>
              <Ionicons name="search" size={16} color={colors.textDim} />
              <TextInput
                style={styles.pickerSearch}
                placeholder="Search…"
                placeholderTextColor={colors.textDim}
                value={pickerQuery}
                onChangeText={setPickerQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                autoFocus
              />
            </View>
            <FlatList
              data={pickerItems}
              keyExtractor={(it) => it.id}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.pickerSep} />}
              contentContainerStyle={styles.pickerList}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.pickerItem}
                  onPress={() => onPickerSelect(item.id)}
                  android_ripple={{ color: colors.brandSoft }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.pickerItemSub} numberOfLines={1}>
                      {item.sub}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.pickerEmpty}>
                  <Text style={styles.dim}>Nothing to show</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
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
