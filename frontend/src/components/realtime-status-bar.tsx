/**
 * RealtimeStatusBar — thin AI gradient strip pinned to the top of every
 * NON-dashboard screen. Shows the current Wingman state + latest
 * assistant message so the operator always knows what the AI is doing
 * even after they navigate away from the dashboard.
 *
 * Design spec (Phase 2):
 *   • Full width, ~52 px tall, sits below the safe-area inset
 *   • Background = AI gradient (purple → green → cyan) at 50% opacity so
 *     the underlying screen is still visible through it
 *   • Only a small orb icon + a single line of text — no chrome
 *   • Auto-dismiss 4 s after the last activity finishes
 *   • Hidden on the dashboard (Now Brief shows the full chat) and on
 *     the sign-in screen (nothing to summarise there yet).
 */
import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useVoiceOrb } from "@/src/context/voice-orb-context";

const AUTO_DISMISS_MS = 4000;

export function RealtimeStatusBar() {
  const orb = useVoiceOrb();
  const pathname = usePathname() || "";
  const insets = useSafeAreaInsets();

  const onDashboard =
    pathname === "/" ||
    pathname === "/(tabs)" ||
    pathname === "" ||
    pathname === "/index" ||
    pathname === "/(tabs)/index";
  const onSignIn = pathname.includes("sign-in");

  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  // Phase C: "Sun raha hoon" nudge — show exactly ONCE per session so
  // it doesn't repeatedly flash on every VAD silence. Reset when the
  // orb disconnects (session ends) so the next session can show it
  // again.
  const listenNudgeShownRef = useRef(false);
  const [showListenNudge, setShowListenNudge] = useState(false);
  useEffect(() => {
    if (!orb.isConnected) {
      listenNudgeShownRef.current = false;
      setShowListenNudge(false);
    }
  }, [orb.isConnected]);
  useEffect(() => {
    if (orb.state === "listening" && !listenNudgeShownRef.current) {
      listenNudgeShownRef.current = true;
      setShowListenNudge(true);
      const t = setTimeout(() => setShowListenNudge(false), 2200);
      return () => clearTimeout(t);
    }
  }, [orb.state]);

  const latestAssistant = useMemo(() => {
    for (let i = orb.transcript.length - 1; i >= 0; i--) {
      if (orb.transcript[i].role === "assistant") return orb.transcript[i];
    }
    return null;
  }, [orb.transcript]);

  const status = orb.state;

  useEffect(() => {
    if (onDashboard || onSignIn) {
      setVisible(false);
      return;
    }
    // Phase C behaviour:
    //   • listening     → show once (nudge), then hide
    //   • processing    → always show while thinking
    //   • speaking      → show transcript
    //   • connecting/error → show
    //   • idle          → hide
    const shouldShow =
      status === "processing" ||
      status === "speaking" ||
      status === "connecting" ||
      status === "error" ||
      (status === "listening" && showListenNudge);
    if (shouldShow) {
      setDismissed(false);
      setVisible(true);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      return;
    }
    if (latestAssistant && !dismissed && status !== "listening") {
      setVisible(true);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
      return;
    }
    setVisible(false);
  }, [status, showListenNudge, latestAssistant, dismissed, onDashboard, onSignIn]);

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
      ? "Wingman connecting…"
      : status === "listening"
        ? "Sun raha hoon…"
        : status === "processing"
          ? "Soch raha hoon…"
          : status === "speaking"
            ? latestAssistant?.content || "Bol raha hoon…"
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
          paddingTop: insets.top,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
          ],
          ...(Platform.OS === "web" ? ({ position: "fixed" } as any) : {}),
        },
      ]}
      testID="realtime-status-bar"
    >
      <Pressable
        onPress={() => {
          setDismissed(true);
          setVisible(false);
        }}
        style={styles.inner}
        accessibilityLabel="Dismiss Wingman status"
      >
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={14} color="#FFFFFF" />
        </View>
        <Text style={styles.text} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    // 50%-opacity AI gradient — see web block below for the actual
    // gradient. Native falls back to a semi-transparent purple wash.
    backgroundColor: "rgba(24, 12, 44, 0.50)",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          backgroundImage:
            "linear-gradient(90deg, rgba(155,77,255,0.50) 0%, rgba(0,255,136,0.50) 50%, rgba(0,245,255,0.50) 100%)",
          backdropFilter: "blur(14px) saturate(160%)",
          WebkitBackdropFilter: "blur(14px) saturate(160%)",
        } as any),
      },
      default: {},
    }),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.20)",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.45)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
    // High-contrast dark shadow so the text stays readable over the
    // 50%-opacity multi-hue gradient background.
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
