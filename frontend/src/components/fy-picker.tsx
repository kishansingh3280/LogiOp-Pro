// Reusable Financial Year picker — a compact pill that opens a bottom
// sheet listing recent FY keys. Selecting one updates the global FYContext
// so every screen re-filters at once.

import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useFY } from "@/src/context/fy-context";
import { useAuth } from "@/src/auth/context";
import { colors, radii, spacing } from "@/src/theme";
import { currentFYKey, fyLabel, listFYKeys, type FYKey } from "@/src/utils/fy";

interface Props {
  /** Optional earliest FY to include (e.g., date of first shipment). */
  earliest?: string | Date | null;
  compact?: boolean;
}

export function FYPicker({ earliest, compact }: Props) {
  const { fy, setFY } = useFY();
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const currentFY = currentFYKey();
  const isReadOnlyNow = fy !== currentFY && !isAdmin;
  const [open, setOpen] = useState(false);
  const options = useMemo(() => listFYKeys(earliest), [earliest]);

  return (
    <>
      <TouchableOpacity
        style={[styles.chip, compact && styles.chipCompact]}
        onPress={() => setOpen(true)}
        testID="fy-picker"
      >
        <Ionicons
          name={isReadOnlyNow ? "lock-closed" : "calendar-outline"}
          size={12}
          color={isReadOnlyNow ? "#FFD700" : colors.lime}
        />
        <Text style={[styles.chipText, isReadOnlyNow ? styles.chipTextLocked : null]}>{fyLabel(fy)}</Text>
        <Ionicons name="chevron-down" size={12} color={colors.textDim} />
      </TouchableOpacity>

      {open && (
        <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Financial Year</Text>
              <Text style={styles.sheetSub}>
                India FY runs April 1 → March 31. Every total on the app
                filters to the year you pick here.
              </Text>
              <ScrollView style={{ maxHeight: 340 }}>
                {options.map((k: FYKey) => {
                  const active = fy === k;
                  const isCurrent = k === currentFYKey();
                  // Non-current FYs are locked for non-admin users.
                  const isLockedForUser = !isCurrent && !isAdmin;
                  return (
                    <TouchableOpacity
                      key={k}
                      style={[styles.row, active && styles.rowActive]}
                      onPress={() => {
                        setFY(k);
                        setOpen(false);
                      }}
                      testID={`fy-option-${k}`}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                        {isLockedForUser ? (
                          <Ionicons name="lock-closed" size={13} color="#FFD700" />
                        ) : null}
                        <Text style={[styles.rowText, active && styles.rowTextActive]}>
                          {fyLabel(k)}
                        </Text>
                        {isCurrent ? (
                          <View style={styles.tagCurrent}>
                            <Text style={styles.tagCurrentText}>CURRENT</Text>
                          </View>
                        ) : (
                          <View style={styles.tagReadonly}>
                            <Ionicons name="lock-closed" size={9} color="#FFD700" />
                            <Text style={styles.tagReadonlyText}>
                              {isAdmin ? "Read-only" : "Locked"}
                            </Text>
                          </View>
                        )}
                      </View>
                      {active ? <Ionicons name="checkmark" size={16} color={colors.lime} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={styles.cancel} onPress={() => setOpen(false)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipCompact: { paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { color: colors.lime, fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
  chipTextLocked: { color: "#FFD700" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  sheetSub: { color: colors.textDim, fontSize: 12, lineHeight: 16, marginTop: 4, marginBottom: spacing.md },
  row: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowActive: {},
  rowText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  rowTextActive: { color: colors.lime },
  cancel: {
    marginTop: spacing.md,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
  },
  cancelText: { color: colors.text, fontWeight: "700" },
  tagCurrent: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#00FF88",
  },
  tagCurrentText: { color: "#000000", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  tagReadonly: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,215,0,0.18)",
    borderColor: "rgba(255,215,0,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagReadonlyText: { color: "#FFD700", fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
});
