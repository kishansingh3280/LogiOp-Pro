/**
 * JARVIS Aura — dark holographic theme.
 *
 * • Deep space background (#07070f)
 * • Neon-green primary accent (#00FF88) for credits / positive numbers
 * • Coral red (#FF4444) for debits / destructive actions
 * • Frosted-glass card surfaces rgba(12,12,30,0.65)
 * • White numeric readouts everywhere
 *
 * Colors are intentionally exposed as plain strings (not tokens or
 * palette objects) so every screen can consume them without wrapping.
 */
import { Platform } from "react-native";

export const colors = {
  // Surfaces
  bg: "transparent", // screens are transparent so ambient orbs show through
  bgSolid: "#07070F", // solid deep-black base painted at the root
  bgDeep: "#04040A",
  surface: "rgba(12,12,30,0.65)", // frosted glass
  surfaceSolid: "#0B0B18", // opaque fallback for Android where blur is expensive
  card: "rgba(12,12,30,0.65)",
  cardHover: "rgba(20,20,40,0.75)",
  cardBorder: "rgba(0,255,136,0.15)",
  divider: "rgba(255,255,255,0.06)",

  // Text
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.60)",
  textDim: "rgba(255,255,255,0.40)",

  // Brand + status
  brand: "#00FF88", // primary neon green
  brandGlow: "rgba(0,255,136,0.22)",
  brandSoft: "rgba(0,255,136,0.12)",
  brandBorder: "rgba(0,255,136,0.55)",

  ok: "#00FF88", // credit
  okSoft: "rgba(0,255,136,0.14)",

  warn: "#FFB84A",
  warnSoft: "rgba(255,184,74,0.14)",

  danger: "#FF4444", // debit / destructive
  dangerSoft: "rgba(255,68,68,0.14)",

  info: "#5CC8FF",
  infoSoft: "rgba(92,200,255,0.14)",

  // Specialised
  credit: "#00FF88",
  debit: "#FF4444",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const font = {
  system: Platform.select({
    ios: "System",
    android: "System",
    web: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif",
    default: "System",
  }) as string,
};

/**
 * Semantic helpers so screens can express intent, not raw color.
 */
export const money = {
  credit: colors.credit,
  debit: colors.debit,
  neutral: colors.text,
} as const;
