import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  type TextInputProps,
  type ScrollViewProps,
} from "react-native";
import { colors } from "@/lib/theme";

export function Screen({
  children,
  style,
  contentContainerStyle,
  ...props
}: ScrollViewProps & { children: React.ReactNode }) {
  return (
    <ScrollView
      style={[styles.screen, style]}
      contentContainerStyle={[styles.screenContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export function Title({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <View style={styles.titleWrap}>
      <Text style={styles.title}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        variant === "primary" && styles.btnPrimary,
        variant === "secondary" && styles.btnSecondary,
        variant === "danger" && styles.btnDanger,
        (pressed || disabled) && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          styles.btnText,
          variant === "secondary" && { color: colors.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "ok" | "warn" | "accent" | "danger";
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === "ok" && { backgroundColor: "#ecfdf3" },
        tone === "warn" && { backgroundColor: "#fffaeb" },
        tone === "accent" && { backgroundColor: colors.accentSoft },
        tone === "danger" && { backgroundColor: "#fef3f2" },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === "ok" && { color: colors.ok },
          tone === "warn" && { color: colors.warn },
          tone === "accent" && { color: colors.accentInk },
          tone === "danger" && { color: colors.danger },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.subtitle}>Loading…</Text>
    </View>
  );
}

export function Money({
  amount,
  currency,
  large,
}: {
  amount: string;
  currency: "INR" | "THB";
  large?: boolean;
}) {
  return (
    <Text
      style={[
        large ? styles.moneyLarge : styles.money,
        { color: currency === "INR" ? colors.inr : colors.thb },
      ]}
    >
      {amount}
    </Text>
  );
}

export function Chip({
  label,
  active,
  onPress,
  tone = "accent",
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  tone?: "accent" | "danger" | "ok";
}) {
  const activeBg =
    tone === "danger" ? colors.danger : tone === "ok" ? colors.ok : colors.accent;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && { backgroundColor: activeBg, borderColor: activeBg },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: 16, paddingBottom: 40 },
  titleWrap: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: colors.ink },
  subtitle: { marginTop: 4, fontSize: 14, color: colors.muted },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: colors.accent },
  btnSecondary: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  btnDanger: { backgroundColor: colors.danger },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  field: { marginBottom: 12 },
  fieldLabel: { marginBottom: 6, color: colors.muted, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 16,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#f5f5f4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 40,
    backgroundColor: colors.bg,
  },
  money: { fontWeight: "600", fontVariant: ["tabular-nums"] },
  moneyLarge: { fontSize: 24, fontWeight: "700", fontVariant: ["tabular-nums"] },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.panel,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.muted, fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
});
