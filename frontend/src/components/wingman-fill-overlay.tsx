/**
 * WingmanFillOverlay — animated "✨ Opsi's magic is happening this form…"
 * banner that appears the moment a `fill_form` event lands on the
 * current screen. Auto-dismisses after ~3.5 s or when the operator
 * taps it.
 *
 * Design (Phase 4):
 *   • Full-width strip pinned to the top of the current screen
 *     (below the safe-area inset).
 *   • AI gradient background (purple → green → cyan) at 50 % opacity
 *     so the form's fields stay visible below.
 *   • Two rows: title + a scrolling field-name ticker that shows which
 *     field was just filled (e.g. "→ Destination: Bangkok").
 *   • Auto-dismisses ~3.5 s after the last field lands.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { subscribeFillForm } from "@/src/api/fill-form-bus";

const AUTO_DISMISS_MS = 3500;

// Human-readable labels for common field keys. Falls back to the raw
// key with underscores → spaces if not listed here.
const FIELD_LABELS: Record<string, string> = {
  source: "Source",
  origin: "Origin",
  destination: "Destination",
  direction: "Direction",
  mode: "Mode",
  freight: "Freight",
  currency: "Currency",
  weight_kg: "Weight",
  weight: "Weight",
  bag_count: "Bags",
  carrier_name: "Carrier",
  consignment_no: "Consignment #",
  notes: "Notes",
  description: "Description",
  party_name: "Party",
  invoice_no: "Invoice #",
  number: "Invoice #",
  amount: "Amount",
  tax_pct: "Tax %",
  name: "Name",
  role: "Role",
  country: "Country",
  phone: "Phone",
  email: "Email",
  gstin: "GSTIN",
  address: "Address",
  default_rate: "Default rate",
  route: "Route",
  currency_type: "Currency type",
  currency_amount: "Amount",
  gold_baht: "Gold (bt)",
  carry_charge_inr: "Carry charge",
  flight_number: "Flight #",
  kind: "Kind",
  date: "Date",
  note: "Note",
};

function prettyKey(key: string): string {
  return FIELD_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettyValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = String(v);
  return s.length > 24 ? s.slice(0, 24) + "…" : s;
}

/**
 * Formats one `fields` object into a chronological list of "→ Key: Value"
 * ticker lines. Field order follows the object insertion order.
 */
function fieldsToLines(fields: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(fields || {})) {
    if (v == null || v === "") continue;
    out.push(`${prettyKey(k)}: ${prettyValue(v)}`);
  }
  return out;
}

export function WingmanFillOverlay() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [lines, setLines] = useState<string[]>([]);
  const [tickerIdx, setTickerIdx] = useState(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = subscribeFillForm((p) => {
      const nextLines = fieldsToLines(p.fields || {});
      setLines(nextLines);
      setTickerIdx(0);
      setReason(p.reason || "Opsi's magic is happening this form…");
      setVisible(true);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    });
    return unsub;
  }, []);

  // Show/hide animation.
  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
    if (!visible) return;
    // Restart shimmer sweep while the overlay is visible.
    shimmer.setValue(0);
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }),
    ).start();
  }, [visible, anim, shimmer]);

  // Cycle through the field lines every ~800 ms.
  useEffect(() => {
    if (!visible || lines.length <= 1) {
      if (tickerTimerRef.current) clearInterval(tickerTimerRef.current);
      tickerTimerRef.current = null;
      return;
    }
    tickerTimerRef.current = setInterval(() => {
      setTickerIdx((i) => (i + 1) % lines.length);
    }, 800);
    return () => {
      if (tickerTimerRef.current) clearInterval(tickerTimerRef.current);
    };
  }, [visible, lines]);

  if (!visible && lines.length === 0) return null;

  const line = lines[tickerIdx] || "";
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-160, 240] });

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      testID="wingman-fill-overlay"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) },
          ],
          ...(Platform.OS === "web" ? ({ position: "fixed" } as any) : {}),
        },
      ]}
    >
      <Pressable
        onPress={() => setVisible(false)}
        style={styles.inner}
        accessibilityLabel="Dismiss Wingman fill overlay"
      >
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>
            ✨ {reason}
          </Text>
          {line ? (
            <Text style={styles.ticker} numberOfLines={1}>
              → {line}
            </Text>
          ) : null}
        </View>
        <View style={styles.dot} />
      </Pressable>
      {/* Shimmer sweep — a soft white gradient that slides across the
          strip while the ghost-typing is animating. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmer,
          {
            transform: [{ translateX: shimmerX }],
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 95,
    elevation: 22,
    backgroundColor: "rgba(24, 12, 44, 0.55)",
    overflow: "hidden",
    borderBottomColor: "rgba(255,255,255,0.28)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          backgroundImage:
            "linear-gradient(90deg, rgba(155,77,255,0.55) 0%, rgba(0,255,136,0.55) 50%, rgba(0,245,255,0.55) 100%)",
          backdropFilter: "blur(18px) saturate(180%)",
          WebkitBackdropFilter: "blur(18px) saturate(180%)",
        } as any),
      },
      default: {},
    }),
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ticker: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00FF88",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "0 0 8px #00FF88" } as any),
      },
      default: {
        shadowColor: "#00FF88",
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
    }),
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 120,
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
        } as any),
      },
      default: {
        backgroundColor: "rgba(255,255,255,0.10)",
      },
    }),
  },
});
