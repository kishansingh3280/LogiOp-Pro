import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing } from "@/src/theme";

/**
 * Tiny app-wide toast singleton.
 *
 * Any code can call `toast.success("Saved!")` — the ToastHost mounted at
 * the app root subscribes and renders the message with the right tint.
 * No context/provider gymnastics required; there's exactly one host.
 */

export type ToastKind = "success" | "error" | "info" | "warn";

interface ToastPayload {
  id: number;
  kind: ToastKind;
  message: string;
  durationMs: number;
}

type Listener = (t: ToastPayload) => void;
const subscribers = new Set<Listener>();
let seq = 1;

function emit(kind: ToastKind, message: string, durationMs = 3000) {
  const p: ToastPayload = { id: seq++, kind, message, durationMs };
  subscribers.forEach((l) => l(p));
}

export const toast = {
  success: (msg: string, ms?: number) => emit("success", msg, ms),
  error:   (msg: string, ms?: number) => emit("error", msg, ms ?? 5000),
  info:    (msg: string, ms?: number) => emit("info", msg, ms),
  warn:    (msg: string, ms?: number) => emit("warn", msg, ms ?? 4000),
};

/** Mount ONCE at the app root (below the RootLayout stack). */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastPayload | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => setCurrent(null));
  }, [anim]);

  useEffect(() => {
    const listener: Listener = (t) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCurrent(t);
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      timeoutRef.current = setTimeout(dismiss, t.durationMs);
    };
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [anim, dismiss]);

  if (!current) return null;

  const tint =
    current.kind === "success" ? colors.ok :
    current.kind === "error"   ? colors.danger :
    current.kind === "warn"    ? colors.warn :
    colors.info;

  const icon: keyof typeof Ionicons.glyphMap =
    current.kind === "success" ? "checkmark-circle" :
    current.kind === "error"   ? "alert-circle" :
    current.kind === "warn"    ? "warning" :
    "information-circle";

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { paddingBottom: insets.bottom + spacing.md, transform: [{ translateY }], opacity },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={dismiss}
        style={[styles.card, { borderColor: tint }]}
        testID={`toast-${current.kind}`}
      >
        <Ionicons name={icon} size={18} color={tint} />
        <Text style={styles.msg} numberOfLines={3}>{current.message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    zIndex: 9999,
    elevation: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    maxWidth: 460,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  msg: { color: colors.text, fontSize: 13, fontWeight: "600", flexShrink: 1 },
});
