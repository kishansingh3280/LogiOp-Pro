import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { generateInvoicePdf } from "@/src/utils/invoice-pdf";

import { API_BASE, apiPut } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { Invoice, Party, Shipment, ShipmentBag } from "@/src/api/types";
import { ShareActionBar } from "@/src/components/share-action-bar";
import { toast } from "@/src/components/toast";
import { Card, KV, StatusPill } from "@/src/components/ui";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

export default function InvoiceDetail({
  idOverride,
  embedded,
}: {
  idOverride?: string;
  embedded?: boolean;
} = {}) {
  const params = useLocalSearchParams<{ id: string }>();
  const id = idOverride || params.id;
  const router = useRouter();
  const inv = useApi<Invoice>(id ? `/api/invoices/${id}` : null);
  const [shareLoading, setShareLoading] = useState<string | null>(null);
  // Status-change modal — Alert.alert is a no-op on RN Web, so we render
  // our own bottom-sheet-style picker that works on all platforms.
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [statusChanging, setStatusChanging] = useState<Invoice["status"] | null>(null);
  const parties = useApi<Party[]>("/api/parties");
  const party = useMemo(
    () => (parties.data || []).find((p) => p.id === inv.data?.party_id),
    [parties.data, inv.data?.party_id],
  );
  // Only fetch the linked shipment + its bags when we actually have one —
  // avoids a wasted round-trip for invoice-only records. `useApi` returns
  // `{ data: null }` when the path is null so downstream reads stay safe.
  const linkedShipment = useApi<Shipment>(
    inv.data?.shipment_id ? `/api/shipments/${inv.data.shipment_id}` : null,
  );
  const linkedBags = useApi<ShipmentBag[]>(
    inv.data?.shipment_id ? `/api/shipments/${inv.data.shipment_id}/bags` : null,
  );

  const Wrapper: React.ComponentType<{ children: React.ReactNode }> = embedded
    ? ({ children }) => <View style={{ flex: 1 }}>{children}</View>
    : ({ children }) => (
        <SafeAreaView edges={["top"]} style={styles.safe}>
          {children}
        </SafeAreaView>
      );

  if (inv.loading && !inv.data) {
    return (
      <Wrapper>
        {!embedded && (
          <View style={styles.headBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headTitle}>Invoice</Text>
            <View style={{ width: 32 }} />
          </View>
        )}
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.lime} />
      </Wrapper>
    );
  }
  if (!inv.data) {
    // Distinguish "record deleted / never existed" (404) from a general
    // network error so the operator knows whether to retry or move on.
    const is404 = inv.status === 404;
    return (
      <Wrapper>
        {!embedded && (
          <View style={styles.headBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headTitle}>Invoice</Text>
            <View style={{ width: 32 }} />
          </View>
        )}
        <View style={styles.errorBox}>
          <Ionicons
            name={is404 ? "alert-circle-outline" : "cloud-offline-outline"}
            size={40}
            color={is404 ? colors.warn : colors.danger}
          />
          <Text style={styles.errorTitle}>
            {is404 ? "Invoice not found" : "Couldn't load invoice"}
          </Text>
          <Text style={styles.errorSub}>
            {is404
              ? `The record with id ${(id || "").slice(0, 8)}… no longer exists on the server. It may have been deleted or replaced by a data reset.`
              : (inv.error || "Something went wrong reaching the server.")}
          </Text>
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.errorRetryBtn}
              onPress={() => inv.refresh()}
              testID="invoice-error-retry"
            >
              <Ionicons name="refresh-outline" size={14} color={colors.bg} />
              <Text style={styles.errorRetryText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.errorSecondaryBtn}
              onPress={() => router.replace("/(tabs)/invoices" as never)}
              testID="invoice-error-back-to-list"
            >
              <Text style={styles.errorSecondaryText}>Back to list</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Wrapper>
    );
  }

  const i = inv.data;

  return (
    <Wrapper>
      {!embedded && (
        <View style={styles.headBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headTitle}>{i.number}</Text>
          <TouchableOpacity
            onPress={async () => {
              try {
                await generateInvoicePdf({
                  invoice: i,
                  party,
                  shipTo: linkedShipment.data
                    ? {
                        name: linkedShipment.data.destination || party?.name,
                        route: `${linkedShipment.data.origin || "?"} → ${linkedShipment.data.destination || "?"}`,
                        consignment_no: linkedShipment.data.consignment_no,
                      }
                    : null,
                });
              } catch (e) {
                // eslint-disable-next-line no-console
                console.warn("[invoice-pdf] failed:", e);
              }
            }}
            style={styles.iconBtn}
            testID="invoice-pdf-btn"
            accessibilityLabel="Generate invoice PDF"
          >
            <Ionicons name="document-attach-outline" size={22} color={colors.lime} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Invoice</Text>
              <Text style={styles.big}>{i.number}</Text>
              <Text style={styles.sub}>{party?.name || "Unknown party"} · {shortDate(i.date)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setStatusPickerOpen(true)}
              testID="invoice-status-toggle"
              accessibilityLabel="Change invoice status"
              activeOpacity={0.75}
            >
              <StatusPill status={i.status} />
              <Text style={styles.statusHint}>tap to change</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.totalRow}>
            <View style={styles.totalCol}>
              <Text style={styles.totalLbl}>Subtotal</Text>
              <Text style={styles.totalVal}>{fmtCurrency(i.subtotal, i.currency)}</Text>
            </View>
            <View style={styles.totalCol}>
              <Text style={styles.totalLbl}>Total</Text>
              <Text style={[styles.totalVal, styles.glowGreen]}>
                {fmtCurrency(i.total, i.currency)}
              </Text>
            </View>
          </View>
          {/* 4-way share bar — PDF · WhatsApp · LINE · Email */}
          <ShareActionBar
            loading={shareLoading}
            onPdf={async () => {
              setShareLoading("pdf");
              try {
                await generateInvoicePdf({
                  invoice: i,
                  party,
                  shipTo: linkedShipment.data
                    ? {
                        name: linkedShipment.data.destination || party?.name,
                        route: `${linkedShipment.data.origin || "?"} → ${linkedShipment.data.destination || "?"}`,
                        consignment_no: linkedShipment.data.consignment_no,
                      }
                    : null,
                });
              } catch (e) {
                console.warn("[invoice-pdf] failed:", e);
              } finally {
                setShareLoading(null);
              }
            }}
            onWhatsapp={async () => {
              if (!party?.phone) {
                Alert.alert("No phone", "Party ka WhatsApp number save nahi hai.");
                return;
              }
              setShareLoading("whatsapp");
              try {
                await fetch(`${API_BASE}/api/whatsapp/send`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to_phone: party.phone,
                    message: `Invoice ${i.number} — ${fmtCurrency(i.total, i.currency)} due ${i.due_date || ""}. Please pay at earliest. LogiOp Pro.`,
                    party_id: party.id,
                    party_name: party.name,
                  }),
                });
                Alert.alert("Queued", `WhatsApp to ${party.name} queued.`);
              } catch (e) {
                Alert.alert("Failed", String(e));
              } finally {
                setShareLoading(null);
              }
            }}
            onLine={async () => {
              const lineId = (party as unknown as { line_id?: string })?.line_id;
              if (!lineId) {
                Alert.alert("No LINE ID", "Party ka LINE user id save nahi hai.");
                return;
              }
              setShareLoading("line");
              try {
                await fetch(`${API_BASE}/api/line/send`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to_line_id: lineId,
                    message: `Invoice ${i.number} — ${fmtCurrency(i.total, i.currency)} due ${i.due_date || ""}. — LogiOp Pro`,
                    party_id: party?.id,
                    party_name: party?.name,
                  }),
                });
                Alert.alert("Queued", `LINE to ${party?.name || "party"} queued.`);
              } catch (e) {
                Alert.alert("Failed", String(e));
              } finally {
                setShareLoading(null);
              }
            }}
            onEmail={async () => {
              const email = (party as unknown as { email?: string })?.email;
              if (!email) {
                Alert.alert("No email", "Party ka email save nahi hai.");
                return;
              }
              const subject = encodeURIComponent(`Invoice ${i.number}`);
              const body = encodeURIComponent(
                `Namaste ${party?.name || ""},\n\nPlease find your invoice ${i.number} for ${fmtCurrency(i.total, i.currency)}.\n\nRegards,\nLogiOp Pro`,
              );
              Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {
                Alert.alert("Failed", "Email client nahi khula.");
              });
            }}
          />
        </Card>

        {/* ─── Bill To · Ship To split ───────────────────────────────
            Bill-to is the party being invoiced. Ship-to is the linked
            shipment's destination + carrier (if a shipment is linked). */}
        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.addrRow}>
            <View style={styles.addrCol}>
              <Text style={styles.addrLabel}>Bill To</Text>
              <Text style={styles.addrName}>{party?.name || "—"}</Text>
              {party?.address ? (
                <Text style={styles.addrLine}>{party.address}</Text>
              ) : null}
              {party?.country ? (
                <Text style={styles.addrLine}>{party.country}</Text>
              ) : null}
              {party?.phone ? (
                <Text style={styles.addrLine}>📞 {party.phone}</Text>
              ) : null}
              {party?.gstin ? (
                <Text style={styles.addrLine}>GSTIN: {party.gstin}</Text>
              ) : null}
            </View>
            <View style={styles.addrDivider} />
            <View style={styles.addrCol}>
              <Text style={styles.addrLabel}>Ship To</Text>
              {linkedShipment.data ? (
                <>
                  <Text style={styles.addrName}>
                    {linkedShipment.data.destination || party?.name || "—"}
                  </Text>
                  <Text style={styles.addrLine}>
                    Via {linkedShipment.data.mode?.toUpperCase()} ·{" "}
                    {linkedShipment.data.origin || "?"} → {linkedShipment.data.destination || "?"}
                  </Text>
                  <Text style={styles.addrLine}>
                    Consignment {linkedShipment.data.consignment_no || "—"}
                  </Text>
                </>
              ) : (
                <Text style={styles.addrLine}>Same as Bill To</Text>
              )}
            </View>
          </View>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Items</Text>
          {/* Table header — Sr | Description | Qty | Rate | Amount */}
          <View style={styles.itemTableHead}>
            <Text style={[styles.itemTh, styles.itemColSr]}>#</Text>
            <Text style={[styles.itemTh, styles.itemColDesc]}>Description</Text>
            <Text style={[styles.itemTh, styles.itemColQty]}>Qty</Text>
            <Text style={[styles.itemTh, styles.itemColRate]}>Rate</Text>
            <Text style={[styles.itemTh, styles.itemColAmt]}>Amount</Text>
          </View>
          {i.items.map((it, idx) => (
            <View key={idx} style={styles.itemTr}>
              <Text style={[styles.itemTd, styles.itemColSr]}>{idx + 1}</Text>
              <View style={[styles.itemColDesc, { paddingRight: 6 }]}>
                <Text style={styles.itemTdDesc} numberOfLines={2}>{it.description}</Text>
                {it.unit ? <Text style={styles.itemTdMeta}>{it.unit}</Text> : null}
              </View>
              <Text style={[styles.itemTd, styles.itemColQty]}>{it.quantity}</Text>
              <Text style={[styles.itemTd, styles.itemColRate]}>
                {fmtCurrency(it.rate, i.currency)}
              </Text>
              <Text style={[styles.itemTdAmt, styles.itemColAmt]}>
                {fmtCurrency(it.quantity * it.rate, i.currency)}
              </Text>
            </View>
          ))}
          {i.items.length === 0 ? (
            <Text style={styles.dim}>No line items</Text>
          ) : null}
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Details</Text>
          <KV label="Currency" value={i.currency} />
          <KV label="Date" value={shortDate(i.date)} />
          {i.due_date ? <KV label="Due" value={shortDate(i.due_date)} /> : null}
          {i.notes ? <KV label="Notes" value={i.notes} /> : null}
        </Card>

        {/* Shipment fulfilment section — swaps between two modes:
              · Not yet created  → prominent CTA to spawn a shipment
                                    with invoice items pre-loaded.
              · Already linked   → rich summary card + Edit / Open CTAs.
            No more "Yes — see shipment" placeholder row. */}
        {i.shipment_id ? (
          <LinkedShipmentCard
            shipment={linkedShipment.data}
            bags={linkedBags.data || []}
            loading={linkedShipment.loading}
            onEdit={() =>
              router.push(`/shipment/new?editId=${i.shipment_id}` as never)
            }
            onOpen={() =>
              router.push(`/shipment/${i.shipment_id}` as never)
            }
          />
        ) : (
          <TouchableOpacity
            style={styles.createShipmentBtn}
            onPress={() => router.push(
              `/shipment/new?fromInvoice=${i.id}` as never,
            )}
            testID="create-shipment-from-invoice"
          >
            <Ionicons name="cube-outline" size={16} color={colors.bg} />
            <Text style={styles.createShipmentText}>
              Create shipment from this invoice
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Status Picker Modal (cross-platform) ─────────────────────
          Alert.alert is a no-op on RN Web, so we render this custom
          bottom-sheet-style modal that works on iOS/Android/Web. */}
      <Modal
        visible={statusPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusPickerOpen(false)}
      >
        <Pressable
          style={statusModalStyles.backdrop}
          onPress={() => setStatusPickerOpen(false)}
        >
          <Pressable
            style={statusModalStyles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={statusModalStyles.title}>Change status</Text>
            <Text style={statusModalStyles.subtitle}>
              Current · {i.status.toUpperCase()}
            </Text>
            {(["draft", "sent", "paid", "cancelled"] as Invoice["status"][]).map((s) => {
              const active = s === i.status;
              const busy = statusChanging === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    statusModalStyles.row,
                    active && statusModalStyles.rowActive,
                  ]}
                  disabled={active || !!statusChanging}
                  onPress={async () => {
                    if (active) return;
                    setStatusChanging(s);
                    try {
                      await apiPut(`/api/invoices/${i.id}`, { status: s });
                      toast.success(`Marked ${s.toUpperCase()}`);
                      inv.refresh();
                      setStatusPickerOpen(false);
                    } catch (e) {
                      toast.warn((e as Error).message || "Update failed");
                    } finally {
                      setStatusChanging(null);
                    }
                  }}
                  testID={`invoice-status-option-${s}`}
                >
                  <Text
                    style={[
                      statusModalStyles.rowText,
                      active && statusModalStyles.rowTextActive,
                    ]}
                  >
                    {busy
                      ? "Saving…"
                      : `${s.charAt(0).toUpperCase()}${s.slice(1)}`}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark" size={16} color={colors.lime} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={statusModalStyles.cancelBtn}
              onPress={() => setStatusPickerOpen(false)}
            >
              <Text style={statusModalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Wrapper>
  );
}

/**
 * Compact but information-dense summary of the shipment linked to this
 * invoice. Shows status pill, route, weight/bag totals, and a peek at the
 * first few bags with their bag_no + recipient. Two CTAs — "Edit" jumps
 * back into the shipment form for corrections; "Open" navigates to the
 * shipment detail page for status timeline and Lalamove booking.
 */
function LinkedShipmentCard({
  shipment,
  bags,
  loading,
  onEdit,
  onOpen,
}: {
  shipment: Shipment | null;
  bags: ShipmentBag[];
  loading: boolean;
  onEdit: () => void;
  onOpen: () => void;
}) {
  if (loading && !shipment) {
    return (
      <Card style={{ marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.xl }}>
        <ActivityIndicator color={colors.lime} />
        <Text style={styles.dim}>Loading linked shipment…</Text>
      </Card>
    );
  }
  if (!shipment) {
    return (
      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.dim}>Linked shipment could not be loaded.</Text>
      </Card>
    );
  }
  const totalWeight = bags.length
    ? bags.reduce((s, b) => s + (Number(b.weight_kg) || 0), 0)
    : Number(shipment.weight_kg) || 0;
  const bagCount = bags.length || shipment.bag_count || 0;
  const route = `${shipment.origin || "?"} → ${shipment.destination || "?"}`;
  return (
    <Card style={{ marginTop: spacing.md }}>
      <View style={styles.shipHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Linked shipment</Text>
          <Text style={styles.shipNo}>{shipment.consignment_no}</Text>
          <Text style={styles.shipRoute}>{route}</Text>
        </View>
        <StatusPill status={shipment.status || "pending"} />
      </View>

      <View style={styles.shipStatsRow}>
        <View style={styles.shipStat}>
          <Text style={styles.shipStatLbl}>Bags</Text>
          <Text style={styles.shipStatVal}>{bagCount}</Text>
        </View>
        <View style={styles.shipStat}>
          <Text style={styles.shipStatLbl}>Weight</Text>
          <Text style={styles.shipStatVal}>{totalWeight.toFixed(1)} kg</Text>
        </View>
        <View style={styles.shipStat}>
          <Text style={styles.shipStatLbl}>Freight</Text>
          <Text style={[styles.shipStatVal, styles.glowGreen]}>
            {fmtCurrency(Number(shipment.freight) || 0, shipment.freight_currency)}
          </Text>
        </View>
      </View>

      {bags.length > 0 ? (
        <View style={styles.shipBagList}>
          {bags.slice(0, 4).map((b) => (
            <View key={b.id} style={styles.shipBagRow}>
              <Ionicons name="cube-outline" size={13} color={colors.lime} />
              <Text style={styles.shipBagText} numberOfLines={1}>
                {b.bag_no} · {b.weight_kg} kg
                {b.items && b.items.length
                  ? ` · ${b.items.length} item${b.items.length === 1 ? "" : "s"}`
                  : ""}
              </Text>
            </View>
          ))}
          {bags.length > 4 ? (
            <Text style={styles.shipBagMore}>
              +{bags.length - 4} more bag{bags.length - 4 === 1 ? "" : "s"}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.shipCtaRow}>
        <TouchableOpacity
          style={styles.shipEditBtn}
          onPress={onEdit}
          testID="edit-linked-shipment"
        >
          <Ionicons name="create-outline" size={14} color={colors.lime} />
          <Text style={styles.shipEditText}>Edit shipment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shipOpenBtn}
          onPress={onOpen}
          testID="open-linked-shipment"
        >
          <Text style={styles.shipOpenText}>Open</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.bg} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconBtn: { padding: 8, width: 36 },
  headTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: "800", textAlign: "center" },
  content: { padding: spacing.lg },
  dim: { color: colors.textDim, textAlign: "center", padding: spacing.xl },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  eyebrow: { color: colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  big: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 2 },
  sub: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  totalRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  totalCol: {
    flex: 1,
    backgroundColor: colors.chipBg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
  },
  totalLbl: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  totalVal: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 4 },
  // ---- JARVIS Aura number-glow (white text + green text-shadow) --------
  glowGreen: {
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 255, 136, 0.75)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  sectionTitle: {
    color: colors.lime,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    textShadowColor: "rgba(0, 255, 136, 0.45)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  itemDesc: { color: colors.text, fontSize: 14, fontWeight: "600" },
  itemMeta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  itemTotal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    textShadowColor: "rgba(0, 255, 136, 0.65)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  // ─── Invoice Professional Redesign · Table + Bill To / Ship To ──────
  statusHint: {
    color: colors.textDim,
    fontSize: 9,
    marginTop: 4,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  addrRow: {
    flexDirection: "row",
    gap: 12,
  },
  addrCol: {
    flex: 1,
    gap: 3,
  },
  addrDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  addrLabel: {
    color: colors.lime,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  addrName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  addrLine: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  itemTableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomColor: colors.lime,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  itemTh: {
    color: colors.lime,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemTr: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemTd: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  itemTdDesc: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  itemTdMeta: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  itemTdAmt: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    textShadowColor: "rgba(0, 255, 136, 0.65)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    textAlign: "right",
  },
  itemColSr: {
    width: 22,
    textAlign: "left",
  },
  itemColDesc: {
    flex: 1,
    paddingLeft: 4,
  },
  itemColQty: {
    width: 34,
    textAlign: "right",
  },
  itemColRate: {
    width: 68,
    textAlign: "right",
  },
  itemColAmt: {
    width: 74,
    textAlign: "right",
  },
  createShipmentBtn: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.lime,
  },
  createShipmentText: {
    color: colors.bg,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  openShipmentBtn: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radii.pill,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.chipBg,
  },
  openShipmentText: { color: colors.lime, fontSize: 12, fontWeight: "800" },
  // Linked shipment card
  shipHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  shipNo: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  shipRoute: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  shipStatsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  shipStat: {
    flex: 1,
    backgroundColor: colors.chipBg,
    borderRadius: radii.md,
    padding: 10,
    alignItems: "center",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shipStatLbl: {
    color: colors.textDim,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  shipStatVal: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  shipBagList: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  shipBagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  shipBagText: {
    color: colors.textMuted,
    fontSize: 12,
    flex: 1,
  },
  shipBagMore: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 4,
  },
  shipCtaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  shipEditBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radii.pill,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.chipBg,
  },
  shipEditText: { color: colors.lime, fontSize: 12, fontWeight: "800" },
  shipOpenBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
  },
  shipOpenText: { color: colors.bg, fontSize: 12, fontWeight: "800" },
  // Error / not-found state
  errorBox: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 10,
  },
  errorTitle: { color: colors.text, fontSize: 17, fontWeight: "800", marginTop: 6 },
  errorSub: { color: colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 18 },
  errorActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  errorRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.lime,
    borderRadius: 999,
  },
  errorRetryText: { color: colors.bg, fontSize: 13, fontWeight: "800" },
  errorSecondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
  },
  errorSecondaryText: { color: colors.text, fontSize: 13, fontWeight: "700" },
});

// ─── Status Picker Modal styles ────────────────────────────────────
const statusModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: 8,
  },
  title: {
    color: colors.lime,
    fontSize: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.chipBg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowActive: {
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
  },
  rowText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  rowTextActive: {
    color: colors.lime,
  },
  cancelBtn: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: "700",
  },
});
