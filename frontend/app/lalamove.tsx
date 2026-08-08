/**
 * Lalamove screen — status banner, orders list, and a "Book new" bottom-sheet.
 *
 * When credentials aren't configured (LALAMOVE_API_KEY missing on the
 * backend) the banner turns red and the Book CTA becomes a hint linking
 * Admin to add keys. When live, tapping "Book new" opens a form with:
 *   - Sender & recipient contacts (auto-filled if user picks a party)
 *   - Pickup / drop-off addresses + coordinates (parties can supply lat/lng)
 *   - Service type picker (Motorcycle / Car / Van)
 *   - Get quote → shows price + expiry
 *   - Book → creates the Lalamove order + persists locally with audit
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { LalamoveOrder, Party } from "@/src/api/types";
import { getAuthTokenSync, useAuth } from "@/src/auth/context";
import { colors, radii, spacing } from "@/src/theme";
import { relTime } from "@/src/utils/format";

type LalamoveConfig = {
  configured: boolean;
  market?: string;
  base_url?: string;
  sandbox?: boolean;
};

const SERVICES: { key: string; label: string; icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap }[] = [
  { key: "MOTORCYCLE", label: "Motorcycle", icon: "bicycle-outline" },
  { key: "CAR", label: "Car", icon: "car-outline" },
  { key: "VAN", label: "Van", icon: "cube-outline" },
];

async function callApi(path: string, init?: RequestInit) {
  const token = getAuthTokenSync();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (body && typeof body.detail === "string" && body.detail) ||
      (body?.detail?.message as string) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export default function LalamoveScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const orders = useApi<LalamoveOrder[]>("/api/lalamove/orders");
  const config = useApi<LalamoveConfig>("/api/lalamove/config");
  const [bookOpen, setBookOpen] = useState(false);

  const configured = !!config.data?.configured;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Lalamove</Text>
          <Text style={styles.subtitle}>Live delivery orders</Text>
        </View>
        <Pressable
          onPress={() => {
            if (!configured) {
              Alert.alert(
                "Lalamove not configured",
                "Please add LALAMOVE_API_KEY and LALAMOVE_API_SECRET to backend/.env, then restart the backend. See /app/backend/lalamove.py.",
              );
              return;
            }
            setBookOpen(true);
          }}
          style={[styles.bookBtn, !configured && styles.bookBtnDim]}
          testID="lalamove-book"
        >
          <Ionicons name="add" size={16} color={configured ? "#000" : colors.textMuted} />
          <Text style={[styles.bookBtnText, !configured && { color: colors.textMuted }]}>
            Book
          </Text>
        </Pressable>
      </View>

      <View style={styles.configBox}>
        <View style={styles.configRow}>
          <View
            style={[
              styles.configDot,
              { backgroundColor: configured ? colors.ok : colors.danger },
            ]}
          />
          <Text style={styles.configLabel}>
            {configured
              ? `Live · ${config.data?.market || ""} · ${
                  config.data?.sandbox ? "SANDBOX" : "PROD"
                }`
              : "Not configured — Admin: add API keys to backend/.env"}
          </Text>
        </View>
      </View>

      <FlatList
        data={orders.data || []}
        keyExtractor={(o, i) => o.id || o.order_id || String(i)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={
          <RefreshControl refreshing={orders.loading} onRefresh={orders.refresh} tintColor={colors.lime} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="bicycle-outline" size={40} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No Lalamove orders yet</Text>
            <Text style={styles.emptySub}>
              {configured
                ? "Tap Book to dispatch a driver"
                : "Add API keys to enable booking"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderId}>{item.order_id || item.id}</Text>
              <Text style={styles.orderMeta}>
                {(item.status || "unknown").toString().toLowerCase()} ·{" "}
                {relTime((item.created_at as string) || (item.created_at_ms ? new Date(Number(item.created_at_ms)).toISOString() : new Date().toISOString()))}
              </Text>
              {item.entry_source ? (
                <View style={styles.srcRow}>
                  <View style={[styles.srcChip, item.entry_source === "ai" && styles.srcChipAi]}>
                    <Text style={styles.srcChipText}>
                      {String(item.entry_source).toUpperCase()}
                    </Text>
                  </View>
                  {item.created_by ? (
                    <Text style={styles.srcMeta}>by {String(item.created_by)}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
          </View>
        )}
      />

      <BookSheet
        visible={bookOpen}
        onClose={() => setBookOpen(false)}
        onBooked={async () => {
          setBookOpen(false);
          await orders.refresh();
        }}
        defaultSender={{ name: user?.display_name || "Sender", phone: "" }}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Book sheet
// ---------------------------------------------------------------------------

type QuoteResp = {
  data?: {
    quotationId?: string;
    price?: { amount?: string; currency?: string };
    expiresAt?: string;
    distance?: { value?: string; unit?: string };
  };
};

function BookSheet({
  visible,
  onClose,
  onBooked,
  defaultSender,
}: {
  visible: boolean;
  onClose: () => void;
  onBooked: () => void;
  defaultSender: { name: string; phone: string };
}) {
  const insets = useSafeAreaInsets();
  const parties = useApi<Party[]>("/api/parties");
  const [service, setService] = useState("MOTORCYCLE");
  const [pickupLL, setPickupLL] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [dropLL, setDropLL] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [dropText, setDropText] = useState("");
  const [senderName, setSenderName] = useState(defaultSender.name);
  const [senderPhone, setSenderPhone] = useState(defaultSender.phone);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [remarks, setRemarks] = useState("");
  const [quote, setQuote] = useState<QuoteResp | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [booking, setBooking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPartyPicker, setShowPartyPicker] = useState<null | "pickup" | "drop">(null);

  useEffect(() => {
    if (!visible) {
      setQuote(null);
      setErr(null);
      setPickupLL(null);
      setDropLL(null);
      setPickupText("");
      setDropText("");
      setRecipientName("");
      setRecipientPhone("");
      setRemarks("");
      setBooking(false);
      setQuoting(false);
    }
  }, [visible]);

  const parseLatLng = (s: string): { lat: number; lng: number } | null => {
    // Accept "12.34, 56.78" or "lat=12.34, lng=56.78" or a Google Maps
    // pasted URL like "https://maps.google.com/?q=12.34,56.78"
    const m = s.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (!m) return null;
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  };

  const applyText = (kind: "pickup" | "drop", text: string) => {
    if (kind === "pickup") setPickupText(text);
    else setDropText(text);
    const ll = parseLatLng(text);
    if (ll) {
      if (kind === "pickup") setPickupLL({ ...ll, address: text });
      else setDropLL({ ...ll, address: text });
    } else {
      // Keep the address; coordinates may come from party pick.
      if (kind === "pickup" && pickupLL) setPickupLL({ ...pickupLL, address: text });
      if (kind === "drop" && dropLL) setDropLL({ ...dropLL, address: text });
    }
  };

  const canQuote = pickupLL && dropLL && senderName && senderPhone && recipientName && recipientPhone;

  const runQuote = useCallback(async () => {
    if (!canQuote || !pickupLL || !dropLL) return;
    setQuoting(true);
    setErr(null);
    try {
      const body = {
        pickup: pickupLL,
        dropoff: dropLL,
        service_type: service,
        sender_name: senderName,
        sender_phone: senderPhone,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        remarks,
      };
      const res = (await callApi("/api/lalamove/quote", {
        method: "POST",
        body: JSON.stringify(body),
      })) as QuoteResp;
      setQuote(res);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setQuoting(false);
    }
  }, [canQuote, pickupLL, dropLL, service, senderName, senderPhone, recipientName, recipientPhone, remarks]);

  const runBook = useCallback(async () => {
    if (!quote || !quote.data?.quotationId || !pickupLL || !dropLL) return;
    setBooking(true);
    setErr(null);
    try {
      await callApi("/api/lalamove/order", {
        method: "POST",
        headers: { "X-Entry-Source": "manual" },
        body: JSON.stringify({
          pickup: pickupLL,
          dropoff: dropLL,
          service_type: service,
          sender_name: senderName,
          sender_phone: senderPhone,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          remarks,
          quotation_id: quote.data.quotationId,
          quoted_total_fee: quote.data.price,
        }),
      });
      onBooked();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBooking(false);
    }
  }, [quote, pickupLL, dropLL, service, senderName, senderPhone, recipientName, recipientPhone, remarks, onBooked]);

  const pickParty = (kind: "pickup" | "drop", p: Party) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyP = p as any;
    const addr = [anyP.address, anyP.city].filter(Boolean).join(", ") || p.name;
    const lat = typeof anyP.lat === "number" ? anyP.lat : null;
    const lng = typeof anyP.lng === "number" ? anyP.lng : null;
    if (kind === "pickup") {
      setPickupText(addr + (lat && lng ? ` (${lat}, ${lng})` : ""));
      if (lat != null && lng != null) setPickupLL({ lat, lng, address: addr });
      setSenderName(p.name);
      if (anyP.phone) setSenderPhone(anyP.phone);
    } else {
      setDropText(addr + (lat && lng ? ` (${lat}, ${lng})` : ""));
      if (lat != null && lng != null) setDropLL({ lat, lng, address: addr });
      setRecipientName(p.name);
      if (anyP.phone) setRecipientPhone(anyP.phone);
    }
    setShowPartyPicker(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.sheetKb}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Book a delivery</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {/* Service */}
            <Text style={styles.label}>Service</Text>
            <View style={styles.svcRow}>
              {SERVICES.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => {
                    setService(s.key);
                    setQuote(null);
                  }}
                  style={[styles.svc, service === s.key && styles.svcActive]}
                >
                  <Ionicons
                    name={s.icon}
                    size={18}
                    color={service === s.key ? "#000" : colors.textMuted}
                  />
                  <Text style={[styles.svcText, service === s.key && styles.svcTextActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Pickup */}
            <View style={styles.rowLabel}>
              <Text style={styles.label}>Pickup (lat, lng)</Text>
              <Pressable onPress={() => setShowPartyPicker("pickup")} style={styles.pickPartyBtn} hitSlop={4}>
                <Ionicons name="people-outline" size={12} color={colors.lime} />
                <Text style={styles.pickPartyBtnText}>Party</Text>
              </Pressable>
            </View>
            <TextInput
              value={pickupText}
              onChangeText={(t) => applyText("pickup", t)}
              placeholder="Paste address or 12.9716, 77.5946"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              testID="lalamove-pickup"
            />
            {pickupLL ? (
              <Text style={styles.coordHint}>
                ✓ Lat/Lng detected: {pickupLL.lat}, {pickupLL.lng}
              </Text>
            ) : null}

            {/* Dropoff */}
            <View style={[styles.rowLabel, { marginTop: spacing.md }]}>
              <Text style={styles.label}>Drop-off (lat, lng)</Text>
              <Pressable onPress={() => setShowPartyPicker("drop")} style={styles.pickPartyBtn} hitSlop={4}>
                <Ionicons name="people-outline" size={12} color={colors.lime} />
                <Text style={styles.pickPartyBtnText}>Party</Text>
              </Pressable>
            </View>
            <TextInput
              value={dropText}
              onChangeText={(t) => applyText("drop", t)}
              placeholder="Paste address or 12.9716, 77.5946"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              testID="lalamove-drop"
            />
            {dropLL ? (
              <Text style={styles.coordHint}>
                ✓ Lat/Lng detected: {dropLL.lat}, {dropLL.lng}
              </Text>
            ) : null}

            {/* Contacts */}
            <Text style={[styles.label, { marginTop: spacing.md }]}>Sender</Text>
            <View style={styles.row2}>
              <TextInput
                value={senderName}
                onChangeText={setSenderName}
                placeholder="Name"
                placeholderTextColor={colors.textDim}
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                value={senderPhone}
                onChangeText={setSenderPhone}
                placeholder="+91…"
                placeholderTextColor={colors.textDim}
                keyboardType="phone-pad"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <Text style={[styles.label, { marginTop: spacing.sm }]}>Recipient</Text>
            <View style={styles.row2}>
              <TextInput
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="Name"
                placeholderTextColor={colors.textDim}
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                value={recipientPhone}
                onChangeText={setRecipientPhone}
                placeholder="+91…"
                placeholderTextColor={colors.textDim}
                keyboardType="phone-pad"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <Text style={[styles.label, { marginTop: spacing.sm }]}>Remarks (optional)</Text>
            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Fragile · leave at reception · etc."
              placeholderTextColor={colors.textDim}
              style={styles.input}
              multiline
            />

            {err ? (
              <View style={styles.errBar}>
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={styles.errText}>{err}</Text>
              </View>
            ) : null}

            {/* Quote CTA */}
            <Pressable
              onPress={runQuote}
              disabled={!canQuote || quoting}
              style={[styles.cta, (!canQuote || quoting) && { opacity: 0.5 }]}
              testID="lalamove-quote"
            >
              {quoting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.ctaText}>{quote ? "Refresh quote" : "Get quote"}</Text>
              )}
            </Pressable>

            {quote?.data ? (
              <View style={styles.quoteBox}>
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteKey}>Price</Text>
                  <Text style={styles.quoteVal}>
                    {quote.data.price?.currency || "INR"} {quote.data.price?.amount || "?"}
                  </Text>
                </View>
                {quote.data.distance ? (
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteKey}>Distance</Text>
                    <Text style={styles.quoteVal}>
                      {quote.data.distance.value} {quote.data.distance.unit}
                    </Text>
                  </View>
                ) : null}
                {quote.data.expiresAt ? (
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteKey}>Expires</Text>
                    <Text style={styles.quoteVal}>
                      {new Date(quote.data.expiresAt).toLocaleTimeString()}
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={runBook}
                  disabled={booking}
                  style={[styles.confirmCta, booking && { opacity: 0.6 }]}
                  testID="lalamove-confirm"
                >
                  {booking ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.confirmCtaText}>Confirm & book driver</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Party picker overlay */}
      {showPartyPicker && (
        <PartyPicker
          parties={parties.data || []}
          onCancel={() => setShowPartyPicker(null)}
          onPick={(p) => pickParty(showPartyPicker, p)}
        />
      )}
    </Modal>
  );
}

function PartyPicker({
  parties,
  onPick,
  onCancel,
}: {
  parties: Party[];
  onPick: (p: Party) => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return parties.slice(0, 40);
    return parties.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 40);
  }, [parties, q]);
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.pickerCard, { marginTop: insets.top + 40 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Pick party</Text>
            <Pressable onPress={onCancel} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search…"
            placeholderTextColor={colors.textDim}
            style={[styles.input, { margin: spacing.md }]}
          />
          <ScrollView style={{ maxHeight: 360 }}>
            {filtered.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => onPick(p)}
                style={styles.pickerRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerName}>{p.name}</Text>
                  <Text style={styles.pickerMeta}>
                    {p.role}
                    {(p as unknown as { city?: string }).city
                      ? ` · ${(p as unknown as { city?: string }).city}`
                      : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
              </Pressable>
            ))}
            {filtered.length === 0 ? (
              <Text style={{ padding: spacing.lg, color: colors.textMuted, textAlign: "center" }}>
                No matches.
              </Text>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
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
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.lime,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    marginRight: spacing.md,
  },
  bookBtnDim: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
  bookBtnText: { color: "#000", fontWeight: "800", fontSize: 13 },
  configBox: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  configRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  configDot: { width: 8, height: 8, borderRadius: 4 },
  configLabel: { color: colors.text, fontSize: 12, fontWeight: "600", flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  orderId: { color: colors.text, fontSize: 14, fontWeight: "700" },
  orderMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  srcRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  srcChip: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: radii.pill,
    backgroundColor: "rgba(125,249,255,0.12)",
  },
  srcChipAi: { backgroundColor: colors.limeGlow },
  srcChipText: { color: colors.text, fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
  srcMeta: { color: colors.textDim, fontSize: 10 },
  emptyBox: { padding: spacing.xxl, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
  emptySub: { color: colors.textDim, fontSize: 13, textAlign: "center" },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  sheetKb: { position: "absolute", left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "92%",
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: 8,
    marginBottom: 4,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  body: { padding: spacing.lg, gap: 6 },
  label: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 14,
  },
  rowLabel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickPartyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.limeGlow,
  },
  pickPartyBtnText: { color: colors.lime, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  coordHint: { color: colors.ok, fontSize: 11, marginTop: 2 },
  row2: { flexDirection: "row", gap: 6 },
  svcRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  svc: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface,
  },
  svcActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  svcText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  svcTextActive: { color: "#000" },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  ctaText: { color: "#000", fontWeight: "800", fontSize: 14 },
  errBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: "rgba(248,113,113,0.10)",
    borderColor: "rgba(248,113,113,0.30)",
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  errText: { color: colors.danger, fontSize: 12, flex: 1 },
  quoteBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: "rgba(0, 209, 255, 0.06)",
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    gap: 6,
  },
  quoteRow: { flexDirection: "row", justifyContent: "space-between" },
  quoteKey: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  quoteVal: { color: colors.text, fontSize: 13, fontWeight: "700" },
  confirmCta: {
    marginTop: 8,
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  confirmCtaText: { color: "#000", fontWeight: "800", fontSize: 14 },

  pickerCard: {
    width: "88%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "#0a0a0a",
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerName: { color: colors.text, fontSize: 14, fontWeight: "700" },
  pickerMeta: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
});
