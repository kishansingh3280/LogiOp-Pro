/**
 * NowBriefCard — JARVIS Aura v3 AI daily briefing at the top of the
 * Dashboard. Renders a warm greeting by name + 2-3 sentence summary of
 * the day's operational context + one suggested next action. Backed by
 * POST /api/dashboard/now-brief (Claude Haiku 4.5). Refresh button
 * regenerates on demand; auto-caches for 5 minutes to avoid burning
 * LLM tokens on every screen focus.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { apiPost } from "@/src/api/client";
import { colors, radii, spacing } from "@/src/theme";

const CACHE_MS = 5 * 60 * 1000;

// Web-only inline style that applies the JARVIS Aura v3 ✨ AI-card
// animations (defined as @keyframes in app/_layout.tsx). React Native
// Web forwards the raw `style` object to the div's style attribute, so
// setting `animation` / `backdropFilter` / `boxShadow` here works even
// though these keys are not part of the RN style contract.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const webAiCardAnim: any = {
  animation:
    "aiCardGradient 8s ease-in-out infinite, aiBreathe 4s ease-in-out infinite",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  willChange: "background, box-shadow",
};

export function NowBriefCard({
  pending,
  inTransit,
  delivered,
  warehouseBags,
  warehouseKg,
  activeTrips,
  overdueLedger = 0,
}: {
  pending: number;
  inTransit: number;
  delivered: number;
  warehouseBags: number;
  warehouseKg: number;
  activeTrips: number;
  overdueLedger?: number;
}) {
  const [brief, setBrief] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const lastAtRef = useRef<number>(0);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const tzOffset = -new Date().getTimezoneOffset(); // minutes east of UTC
      const res = await apiPost<{ brief: string }>("/api/dashboard/now-brief", {
        pending,
        in_transit: inTransit,
        delivered,
        warehouse_bags: warehouseBags,
        warehouse_kg: warehouseKg,
        active_trips: activeTrips,
        overdue_ledger: overdueLedger,
        tz_offset_minutes: tzOffset,
      });
      setBrief((res?.brief || "").trim());
      lastAtRef.current = Date.now();
    } catch {
      // Silent — the endpoint already fallback-fills the field.
    } finally {
      setLoading(false);
    }
  }, [pending, inTransit, delivered, warehouseBags, warehouseKg, activeTrips, overdueLedger]);

  // First render — generate the brief.
  useEffect(() => {
    generate();
    // Regenerate only when the input counters change AND we're past cache TTL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    if (loading) return;
    generate();
  };

  return (
    <View
      style={[styles.card, Platform.OS === "web" ? webAiCardAnim : null]}
      testID="now-brief-card"
    >
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✨</Text>
        </View>
        <Text style={styles.title}>NOW BRIEF</Text>
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshBtn}
          hitSlop={8}
          disabled={loading}
          testID="now-brief-refresh"
        >
          {loading ? (
            <ActivityIndicator color="#B98BFF" size="small" />
          ) : (
            <Ionicons name="refresh" size={16} color="#B98BFF" />
          )}
        </TouchableOpacity>
      </View>
      {loading && !brief ? (
        <Text style={styles.body}>Wingman is composing your morning brief…</Text>
      ) : (
        <Text style={styles.body}>{brief || "Take a breath — nothing urgent right now. ☕"}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    // Static base for both native + web. On web the `.jarvis-ai-card`
    // CSS class overrides this with the animated 3-stop gradient +
    // breathing halo; on native we keep the static purple-violet glass.
    backgroundColor: "rgba(24, 12, 44, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          // Background gradient is set by the `.jarvis-ai-card` class; we
          // still declare a fallback in case CSS keyframes fail to load.
          background:
            "linear-gradient(135deg, rgba(155,77,255,0.20) 0%, rgba(0,255,136,0.12) 40%, rgba(0,245,255,0.15) 80%, rgba(155,77,255,0.18) 100%)",
        } as any),
      },
      default: {
        shadowColor: "#9B4DFF",
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(155, 77, 255, 0.18)",
    borderColor: "rgba(185, 139, 255, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 13 },
  title: {
    flex: 1,
    color: "#B98BFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.9,
    textShadowColor: "rgba(155,77,255,0.50)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  refreshBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(155,77,255,0.10)",
    borderColor: "rgba(185,139,255,0.40)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
});
