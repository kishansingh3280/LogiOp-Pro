/**
 * ModeCompanyBlock — Universal Mode-First form block (Phase 7 · Fix 5).
 *
 * Renders the transaction Mode selector (Informal | Formal) at the
 * TOP of a form. When Mode = Informal → the Company field is hidden
 * entirely (removed from the tree, not just dimmed). When Mode =
 * Formal → the Company field appears with Awadh | Singh Exp. pills.
 *
 * Defaults:
 *   • mode    = "informal"  → Company field hidden
 *   • company = "awadh"     → only visible in Formal mode
 *
 * Consumers hold their own state and pass it in as controlled props.
 * This keeps the block agnostic of context vs. local state and makes
 * it trivially reusable across every create-form in the app.
 */
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/src/lib/theme";

export type FormMode = "informal" | "formal";
export type FormCompany = "awadh" | "singh_exports";

const MODES: { key: FormMode; label: string }[] = [
  { key: "informal", label: "Informal" },
  { key: "formal", label: "Formal" },
];

const COMPANIES: { key: FormCompany; label: string }[] = [
  { key: "awadh", label: "Awadh" },
  { key: "singh_exports", label: "Singh Exp." },
];

export function ModeCompanyBlock({
  mode,
  company,
  onModeChange,
  onCompanyChange,
  compact,
  showLabel = true,
}: {
  mode: FormMode;
  company: FormCompany;
  onModeChange: (m: FormMode) => void;
  onCompanyChange: (c: FormCompany) => void;
  compact?: boolean;
  showLabel?: boolean;
}) {
  const showCompany = useMemo(() => mode === "formal", [mode]);
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {showLabel ? <Text style={styles.label}>Mode</Text> : null}
      <View style={styles.pillRow}>
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              onPress={() => onModeChange(m.key)}
              activeOpacity={0.75}
              style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={active ? styles.pillTextActive : styles.pillTextIdle}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showCompany ? (
        <>
          {showLabel ? <Text style={[styles.label, styles.labelSpaced]}>Company</Text> : null}
          <View style={styles.pillRow}>
            {COMPANIES.map((c) => {
              const active = company === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => onCompanyChange(c.key)}
                  activeOpacity={0.75}
                  style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={active ? styles.pillTextActive : styles.pillTextIdle}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Sits at the very top of forms — spacing consistent w/ other
    // form section blocks.
  },
  wrapCompact: {},
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  labelSpaced: { marginTop: 14 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillIdle: {
    borderColor: colors.cardBorder,
    backgroundColor: "transparent",
  },
  pillActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  pillTextIdle: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "700",
  },
  pillTextActive: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "800",
  },
});
