/**
 * FYBanner — global read-only banner shown on every authenticated screen
 * when the user is browsing a Financial Year that is NOT the current one.
 *
 *   ⚠ You are viewing FY <fy>  (Read-only)  [Switch to <current> →]
 *
 * Gold-tinted glass surface, one-tap CTA that resets FYContext to the
 * current FY. Hidden entirely when fy === currentFYKey(). Kept simple
 * and dependency-free so it can be mounted at the app shell root.
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/src/auth/context";
import { useFY } from "@/src/context/fy-context";
import { currentFYKey, fyLabel } from "@/src/utils/fy";

export function FYBanner() {
  const { fy, setFY } = useFY();
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const current = currentFYKey();
  if (!fy || fy === current) return null;
  // Non-admins: gate is HARD locked → show lock icon + Hinglish text
  // Admins: still show a soft "Read-only" nudge so they know they're in
  // history mode, but keep the icon accent as a warning triangle.
  return (
    <View
      style={[styles.wrap, !isAdmin ? styles.wrapLocked : null]}
      testID="fy-readonly-banner"
    >
      <Ionicons
        name={isAdmin ? "warning-outline" : "lock-closed"}
        size={16}
        color="#FFD700"
      />
      <Text style={styles.text}>
        {isAdmin ? (
          <>
            You are viewing {fyLabel(fy)}  <Text style={styles.dim}>(Read-only)</Text>
          </>
        ) : (
          <>
            {fyLabel(fy)} <Text style={styles.dim}>locked — only Admin can edit</Text>
          </>
        )}
      </Text>
      <TouchableOpacity
        onPress={() => setFY(current)}
        style={styles.cta}
        testID="fy-banner-switch-current"
      >
        <Text style={styles.ctaText}>Switch to {fyLabel(current)} →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 72, // leave clearance for the BlockerBell in the top-right
    paddingVertical: 8,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderColor: "rgba(255, 215, 0, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  wrapLocked: {
    backgroundColor: "rgba(255, 100, 100, 0.10)",
    borderColor: "rgba(255, 180, 0, 0.75)",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    flex: 1,
    minWidth: 0,
  },
  dim: { color: "rgba(255,255,255,0.75)", fontWeight: "600" },
  cta: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#00FF88",
  },
  ctaText: { color: "#000000", fontSize: 11, fontWeight: "900" },
});
