/**
 * OPSI Daily Brief — silent, text-only briefing card.
 *
 * Reworked per the "OPSI Complete System" spec: no mic, no speaker,
 * no text input, no voice narration. Just a beautiful frosted-glass
 * card with a live briefing from `/api/now-brief`. OPSI's voice
 * behaviour has moved entirely into the OPSI Orb + panel — this
 * card is now the reading-mode surface.
 *
 * Design language (matches OPSI orb + panel):
 *   • Gradient: purple #9B4DFF · green #00FF88 · cyan #00F5FF
 *   • Frosted glass: rgba white 0.05 with a 20-30px blur
 *   • Border: rgba(255,255,255,0.14)
 *   • Breathing outer glow: 4s ease-in-out infinite (web only)
 *
 * Refresh button (↺) triggers a re-fetch; no other affordances.
 */
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { apiGet } from "@/src/api/client";
import { GlowingLogo } from "@/src/components/glowing-logo";
import { colors, radii, spacing } from "@/src/theme";

type Alert = { icon: string; text: string };
type BriefPayload = {
  greeting: string;
  time_of_day: "morning" | "afternoon" | "evening" | "night";
  stats: {
    pending_shipments: number;
    in_transit: number;
    unpaid_invoices: number;
    outstanding_inr: number;
  };
  alerts: Alert[];
  top_action: string;
  spoken_summary?: string;
};

type Props = { compact?: boolean };

// ---- Inject breathing keyframes for the outer purple→cyan glow (web only)
const BREATH_ANIM = "opsiCardBreath";
if (Platform.OS === "web" && typeof document !== "undefined" && !document.getElementById("opsi-card-breath")) {
  const el = document.createElement("style");
  el.id = "opsi-card-breath";
  el.textContent = `
@keyframes ${BREATH_ANIM} {
  0%,100% { box-shadow: 0 0 20px rgba(155,77,255,0.28), 0 0 40px rgba(0,245,255,0.14); }
  50%     { box-shadow: 0 0 28px rgba(0,255,136,0.24), 0 0 56px rgba(155,77,255,0.20); }
}
  `.trim();
  document.head.appendChild(el);
}

export function NowBriefCard(_props: Props) {
  const [data, setData] = useState<BriefPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use apiGet so the Authorization header is attached — otherwise
      // the backend can't personalize the greeting for the logged-in
      // user (falls back to hardcoded "Kishan Sir").
      const j = await apiGet<BriefPayload>("/api/now-brief");
      setData(j);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBrief();
  }, [fetchBrief]);

  const webAnim: object =
    Platform.OS === "web"
      ? ({
          animationName: BREATH_ANIM,
          animationDuration: "5s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        } as unknown as object)
      : {};

  return (
    <View style={[styles.card, webAnim]} testID="opsi-daily-brief">
      {/* Header row — icon + title + refresh */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <GlowingLogo variant="mark" size={22} />
          <Text style={styles.headerTitle}>✨ OPSI Daily Brief</Text>
        </View>
        <TouchableOpacity
          onPress={fetchBrief}
          style={styles.refreshBtn}
          testID="opsi-brief-refresh"
          accessibilityLabel="Refresh brief"
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons name="refresh" size={16} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      {/* Greeting + body */}
      {error ? (
        <Text style={styles.error}>Brief load nahi hua — retry karein.</Text>
      ) : !data ? (
        <View style={{ paddingVertical: spacing.md }}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={styles.greeting}>{data.greeting}</Text>
          {/* Bullet list of alerts */}
          {data.alerts.length ? (
            <View style={{ gap: 6 }}>
              {data.alerts.map((a, i) => (
                <View style={styles.alertRow} key={`alert-${i}`}>
                  <Text style={styles.alertIcon}>{a.icon}</Text>
                  <Text style={styles.alertText}>{a.text}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.alertText}>Sab clean hai — koi urgent kaam pending nahi.</Text>
          )}
          {/* Top action highlight */}
          <View style={styles.topActionWrap}>
            <Text style={styles.topActionText}>{data.top_action}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default NowBriefCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    // Frosted-glass with the tri-color OPSI gradient hinted through
    // multiple layered backgrounds (react-native supports single bg;
    // we use borderColor + shadowColor for the glow accents).
    backgroundColor: "rgba(155, 77, 255, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    ...Platform.select({
      ios: {
        shadowColor: "#9B4DFF",
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
    overflow: "hidden",
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  greeting: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertIcon: {
    fontSize: 16,
  },
  alertText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    lineHeight: 20,
  },
  topActionWrap: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  topActionText: {
    color: "#00FF88",
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  error: {
    color: "#FF6B6B",
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
});
