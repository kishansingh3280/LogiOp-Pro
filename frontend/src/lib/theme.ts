/**
 * Phase-1 minimal theme.
 *
 * A trimmed, dependency-free palette used by the freshly restored
 * shell. Once we're confident the APK is stable, we'll swap this out
 * for the full JARVIS Aura theme in `src/theme/index.ts`.
 */
import { Platform } from "react-native";

export const colors = {
  // Surfaces
  bg: "#F8FAFB",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#E5E7EB",
  divider: "#F1F5F9",

  // Text
  text: "#0A0A14",
  textMuted: "#4B5563",
  textDim: "#9CA3AF",

  // Brand + status
  brand: "#0066FF",
  brandSoft: "#EAF1FF",
  ok: "#10B981",
  okSoft: "#ECFDF5",
  warn: "#F59E0B",
  warnSoft: "#FFFBEB",
  danger: "#EF4444",
  dangerSoft: "#FEF2F2",
  info: "#0EA5E9",
  infoSoft: "#F0F9FF",
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
