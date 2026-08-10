/**
 * RealtimeStatusBar — top-of-screen overlay strip that surfaces the
 * latest AI message + orb state on every non-dashboard screen.
 *
 * On the Dashboard the Now Brief card already shows the full transcript,
 * so this bar is auto-hidden there.
 *
 * Auto-dismiss: 4 seconds after the last assistant turn finishes
 * (state returns to `idle`). Tap × to dismiss immediately.
 */
import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useVoiceOrb } from "@/src/context/voice-orb-context";

const AUTO_DISMISS_MS = 4000;

export function RealtimeStatusBar() {
  const orb = useVoiceOrb();
  const pathname = usePathname() || "";
  const insets = useSafeAreaInsets();

  // Dashboard already shows the transcript inside NowBriefCard — skip.
  const onDashboard = pathname === "/" || pathname === "/(tabs)" || pathname === "" || pathname === "/index";
  const onSignIn = pathname.includes("sign-in");

  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  // Latest assistant turn text used as the bar's message.
  const latestAssistant = useMemo(() => {
    for (let i = orb.transcript.length - 1; i >= 0; i--) {
      if (orb.transcript[i].role === "assistant") return orb.transcript[i];
    }
    return null;
  }, [orb.transcript]);

  const status = orb.state;

  // Show whenever the orb is doing anything OR there's a fresh assistant
  // message that hasn't been dismissed.
  useEffect(() => {
    if (onDashboard || onSignIn) {
      setVisible(false);
      return;
    }
    const active =
      status === "listening" ||
      status === "processing" ||
      status === "speaking" ||
      status === "connecting" ||
      status === "error";
    if (active) {
      setDismissed(false);
      setVisible(true);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      return;
    }
    // Idle after activity — auto-dismiss after 4s unless already gone.
    if (latestAssistant && !dismissed) {
      setVisible(true);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    }
  }, [status, latestAssistant, dismissed, onDashboard, onSignIn]);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [visible, anim]);

  if (onDashboard || onSignIn) return null;
  if (!visible && !latestAssistant) return null;

  const label =
    status === "connecting"
      ? "Connecting…"
      : status === "listening"
        ? "Sun raha hoon…"
        : status === "processing"
          ? "Soch raha hoon…"
          : status === "speaking"
            ? (latestAssistant?.content || "Bol raha hoon…")
            : status === "error"
              ? "Dobara bolein"
              : latestAssistant?.content || "";

  return (
    <Animated.View
      pointerEvents="box-none"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={[
        styles.wrap,
        {
          top: insets.top,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
          ],
          ...(Platform.OS === "web" ? ({ position: "fixed" } as any) : {}),
        },
      ]}
      testID="realtime-status-bar"
    >
      <View style={styles.chip}>
        <Ionicons name="sparkles" size={14} color="#B98BFF" />
      </View>
      <Text style={styles.text} numberOfLines={2}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => {
          setDismissed(true);
          setVisible(false);
        }}
        hitSlop={10}
        style={styles.close}
        testID="realtime-status-close"
      >
        <Ionicons name="close" size={14} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 8,
    right: 8,
    zIndex: 90,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(24, 12, 44, 0.92)",
    borderColor: "rgba(155, 77, 255, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          backgroundImage:
            "linear-gradient(135deg, rgba(155,77,255,0.28) 0%, rgba(0,255,136,0.14) 50%, rgba(0,245,255,0.20) 100%)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
        } as any),
      },
      default: {
        shadowColor: "#9B4DFF",
        shadowOpacity: 0.45,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
      },
    }),
  },
  chip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(155,77,255,0.18)",
    borderColor: "rgba(185,139,255,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  close: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
