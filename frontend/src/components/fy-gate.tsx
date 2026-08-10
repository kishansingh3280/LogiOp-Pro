/**
 * FYGate — helpers to gate create/edit UI on older Financial Years.
 *
 * `<FYLockedButton />`
 *   Drop-in replacement for a "New / Add" TouchableOpacity. When the
 *   current FY gate is locked (non-current FY + non-admin user), the
 *   button:
 *     • Shows a 🔒 lock icon inline
 *     • Dims to ~55 % opacity
 *     • On press, shows a warn toast instead of running `onPress`
 *   Otherwise it behaves exactly like the wrapped button.
 *
 * `<FYLockedIcon />`
 *   Just the 🔒 chip — useful when you want to overlay a lock badge
 *   next to an existing button/list-row.
 *
 * `guardOnPress(onPress)`
 *   Wraps a callback: if the gate is locked, fires a toast + returns.
 *   Otherwise calls the wrapped callback with all args.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { toast } from "@/src/components/toast";
import { useFYEditGate } from "@/src/hooks/use-fy-edit-gate";
import { colors } from "@/src/theme";

// ---------------------------------------------------------------------------
// Helper — call from any event handler to short-circuit when gated.
// ---------------------------------------------------------------------------
export function useFYGuard() {
  const gate = useFYEditGate();
  const guard = useCallback(
    (fn: () => void) => {
      if (gate.isReadOnly) {
        toast.warn(gate.blockReason || "Read-only FY");
        return;
      }
      fn();
    },
    [gate],
  );
  return { guard, gate };
}

// ---------------------------------------------------------------------------
// Locked button wrapper — same visual weight as the wrapped element, but
// tap is intercepted when the gate is closed.
// ---------------------------------------------------------------------------
interface LockedButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabledStyle?: StyleProp<ViewStyle>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  testID?: string;
  // Show the 🔒 badge in the top-right corner when locked. Defaults to true.
  showLockBadge?: boolean;
  accessibilityLabel?: string;
}

export function FYLockedButton({
  onPress,
  children,
  style,
  disabledStyle,
  testID,
  showLockBadge = true,
  accessibilityLabel,
}: LockedButtonProps) {
  const { gate, guard } = useFYGuard();

  if (!gate.isReadOnly) {
    return (
      <TouchableOpacity
        style={style}
        onPress={onPress}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[style, styles.locked, disabledStyle]}
      onPress={() => guard(onPress)}
      testID={testID}
      accessibilityState={{ disabled: true }}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={{ opacity: 0.75 }}>{children}</View>
      {showLockBadge ? (
        <View style={styles.lockBadge} pointerEvents="none" testID="fy-lock-badge">
          <Ionicons name="lock-closed" size={10} color="#000000" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Inline lock chip — mount anywhere to show that edits are gated.
// ---------------------------------------------------------------------------
export function FYLockedChip({ style, textStyle }: { style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  const { gate } = useFYGuard();
  if (!gate.isReadOnly) return null;
  return (
    <View style={[styles.chip, style]} testID="fy-locked-chip">
      <Ionicons name="lock-closed" size={11} color="#FFD700" />
      <Text style={[styles.chipText, textStyle]}>Locked</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  locked: {
    opacity: 0.55,
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ cursor: "not-allowed" } as any),
      },
      default: {},
    }),
  },
  lockBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#000000",
    borderWidth: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderColor: "rgba(255, 215, 0, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
  chipText: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
});

// Silence unused-var warning for `colors` (kept for future theme-linked overrides).
void colors;
