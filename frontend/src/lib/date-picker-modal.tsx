/**
 * DatePickerModal — Zero-dependency month-view calendar picker.
 *
 * Pure React Native. Renders a lightweight modal with a month
 * grid. Tap a day to select. Prev/next month buttons on the
 * header. Emits YYYY-MM-DD ISO date strings.
 *
 * Rendering only pure RN + Ionicons, so it works identically on
 * iOS, Android, and react-native-web without any new npm deps.
 */
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { colors, radii, spacing } from "@/src/lib/theme";

type Props = {
  visible: boolean;
  value: string; // "YYYY-MM-DD"
  onSelect: (iso: string) => void;
  onClose: () => void;
  title?: string;
};

const WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const parseIso = (iso: string): Date => {
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
    return new Date(y, m - 1, d);
  }
  return new Date();
};

const toIso = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export function DatePickerModal({
  visible,
  value,
  onSelect,
  onClose,
  title,
}: Props) {
  const [viewDate, setViewDate] = useState<Date>(parseIso(value));

  const grid = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstDayIdx = first.getDay();
    const daysInMonth = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() + 1,
      0,
    ).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDayIdx; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    // chunk into rows of 7
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [viewDate]);

  const today = new Date();
  const selectedIso = value;

  const shiftMonth = (delta: number) => {
    setViewDate(
      new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1),
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={12}>
              <Ionicons name="chevron-back" size={18} color={colors.brand} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </Text>
            <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={12}>
              <Ionicons name="chevron-forward" size={18} color={colors.brand} />
            </TouchableOpacity>
          </View>

          {title ? <Text style={styles.sub}>{title}</Text> : null}

          <View style={styles.weekRow}>
            {WEEK_LABELS.map((w) => (
              <Text key={w} style={styles.weekCell}>
                {w}
              </Text>
            ))}
          </View>

          {grid.map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map((cell, ci) => {
                if (!cell)
                  return <View key={ci} style={styles.dayCell} />;
                const iso = toIso(cell);
                const isSelected = iso === selectedIso;
                const isToday = iso === toIso(today);
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      !isSelected && isToday && styles.dayCellToday,
                    ]}
                    onPress={() => {
                      onSelect(iso);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        !isSelected && isToday && styles.dayTextToday,
                      ]}
                    >
                      {cell.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={() => {
                onSelect(toIso(new Date()));
                onClose();
              }}
              style={styles.todayBtn}
              activeOpacity={0.75}
            >
              <Text style={styles.todayBtnText}>Aaj</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.75}
            >
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  sub: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: "center",
    marginBottom: 8,
  },
  weekRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  weekCell: {
    flex: 1,
    textAlign: "center",
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    paddingVertical: 4,
  },
  gridRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 1,
    borderRadius: 999,
  },
  dayCellSelected: {
    backgroundColor: colors.brand,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.brand,
  },
  dayText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  dayTextSelected: { color: colors.bgSolid, fontWeight: "800" },
  dayTextToday: { color: colors.brand, fontWeight: "800" },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  todayBtnText: { color: colors.brand, fontSize: 12, fontWeight: "800" },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  closeBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
});
