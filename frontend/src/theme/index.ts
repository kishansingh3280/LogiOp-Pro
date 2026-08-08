// Siri 2.0 dark theme — near-black base, ambient orb accents, glass tints.
// The lime accent stays as the primary CTA colour (brand continuity), but
// secondary metric colours now follow a purple/blue/lime/amber/cyan palette
// that harmonises with the drifting ambient orbs.

import { Platform } from "react-native";

export const colors = {
  // ------------------------------------------------------------------
  // Base surfaces
  // ------------------------------------------------------------------
  /** Global background — deep near-black so ambient orbs read as luminous. */
  bg: "#050505",
  /** Legacy alias — some existing components still reference this. */
  surface: "rgba(15, 15, 18, 0.72)",       // glass base — more opaque so text reads
  surfaceAlt: "rgba(22, 22, 26, 0.70)",
  glass: "rgba(20, 20, 24, 0.55)",         // low-elevation glass — dark tint
  glassStrong: "rgba(30, 30, 36, 0.65)",   // hover/active glass tint
  border: "rgba(255, 255, 255, 0.06)",
  borderStrong: "rgba(255, 255, 255, 0.12)",

  // ------------------------------------------------------------------
  // Typography
  // ------------------------------------------------------------------
  text: "#F5F5F7",
  textMuted: "#A1A1AA",
  textDim: "#6B7280",

  // ------------------------------------------------------------------
  // Primary brand (lime) — CTA colour
  // ------------------------------------------------------------------
  lime: "#C6FF00",
  limeSoft: "#A3E635",
  limeGlow: "rgba(198, 255, 0, 0.14)",

  // ------------------------------------------------------------------
  // Ambient orb palette — used by <AmbientBackground/> and metric glows.
  // ------------------------------------------------------------------
  purple: "#9F7AEA",       // headline / balance metrics
  purpleGlow: "rgba(159, 122, 234, 0.25)",
  blue: "#3B82F6",         // secondary info
  blueGlow: "rgba(59, 130, 246, 0.25)",
  cyan: "#22D3EE",         // THB / foreign currency
  cyanGlow: "rgba(34, 211, 238, 0.25)",
  amber: "#F5C518",        // Gold metrics
  amberGlow: "rgba(245, 197, 24, 0.25)",

  // ------------------------------------------------------------------
  // Status tints
  // ------------------------------------------------------------------
  danger: "#F87171",
  warn: "#F59E0B",
  ok: "#34D399",
  info: "#60A5FA",

  // Legacy compat
  chipBg: "rgba(255,255,255,0.04)",
  chipSelected: "#C6FF00",
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
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,      // ultra-rounded glass cards
  xxl: 34,
  pill: 999,
} as const;

/**
 * Font stack — leverages the OS's SF Pro (iOS/macOS) and Roboto (Android)
 * via `System`, with a modern web fallback. Sidesteps the ban on
 * `@expo-google-fonts/*` while still giving us Apple-grade rendering on
 * iOS and Safari.
 */
export const font = {
  display: Platform.select({
    web: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, sans-serif",
    default: "System",
  }) as string,
  mono: Platform.select({
    web: "'SF Mono', 'JetBrains Mono', ui-monospace, monospace",
    default: "Menlo",
  }) as string,
} as const;

/** Metric colour tokens — for the "glow-in-brand-colour" headline numbers.
 *  Consumers pick the semantic bucket rather than a raw hex. */
export const metric = {
  gold: { color: colors.amber, glow: colors.amberGlow },
  inr: { color: colors.lime, glow: colors.limeGlow },
  usd: { color: colors.lime, glow: colors.limeGlow },
  thb: { color: colors.cyan, glow: colors.cyanGlow },
  balance: { color: colors.purple, glow: colors.purpleGlow },
  info: { color: colors.blue, glow: colors.blueGlow },
  ok: { color: colors.ok, glow: "rgba(52, 211, 153, 0.25)" },
  danger: { color: colors.danger, glow: "rgba(248, 113, 113, 0.25)" },
} as const;

export const TABLET_WIDTH = 900;
