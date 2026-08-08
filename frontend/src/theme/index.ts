// Cyber-Siri dark theme — deep space #020202 base, blue/purple/cyan ambient
// orbs, and electric blue (#00D1FF) hair-line borders + CTAs. Replaces the
// prior "black + lime" palette.
//
// NOTE ON TOKEN NAMES: existing components use `colors.lime` / `limeGlow`
// as the primary accent. Rather than rename every reference across the
// codebase (hundreds of call sites), we keep the token names and point
// them to the new electric-blue palette. New code should prefer the
// semantic aliases `accent` / `accentGlow` / `accentSoft`.

import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Raw palette
// ---------------------------------------------------------------------------
const ELECTRIC_BLUE = "#00D1FF";       // primary CTA + hair-line border
const ELECTRIC_BLUE_SOFT = "#38BDF8";  // softer blue for secondary UI
const CYAN = "#00FFFF";                // ambient orb #1 + THB accent
const PURPLE = "#7C3AED";              // ambient orb #2 + balance metric
const PURPLE_SOFT = "#A78BFA";         // secondary purple
const DEEP_BLUE = "#1E3A8A";           // ambient orb #3 (dark base)

export const colors = {
  // ------------------------------------------------------------------
  // Base surfaces — deep space
  // ------------------------------------------------------------------
  /** Global background — deep space so blue/purple orbs read as luminous. */
  bg: "#020202",
  /** Glass base — very dark, semi-transparent so ambient orbs bleed through. */
  surface: "rgba(10, 12, 20, 0.62)",
  surfaceAlt: "rgba(14, 18, 28, 0.60)",
  glass: "rgba(12, 16, 26, 0.50)",         // low-elevation glass
  glassStrong: "rgba(16, 22, 34, 0.62)",   // hover/active glass tint
  /** Hair-line borders — subtle blue tint so the electric-blue glow reads */
  border: "rgba(0, 209, 255, 0.10)",
  borderStrong: "rgba(0, 209, 255, 0.22)",

  // ------------------------------------------------------------------
  // Typography
  // ------------------------------------------------------------------
  text: "#F5F7FA",
  textMuted: "#A5B4C4",
  textDim: "#64748B",

  // ------------------------------------------------------------------
  // Primary accent — was lime, now electric blue.
  // Token names preserved for backwards compat across the app.
  // ------------------------------------------------------------------
  lime: ELECTRIC_BLUE,
  limeSoft: ELECTRIC_BLUE_SOFT,
  limeGlow: "rgba(0, 209, 255, 0.18)",

  /** Preferred aliases for new code. */
  accent: ELECTRIC_BLUE,
  accentSoft: ELECTRIC_BLUE_SOFT,
  accentGlow: "rgba(0, 209, 255, 0.18)",

  // ------------------------------------------------------------------
  // Ambient orb palette — used by <AmbientBackground/> and metric glows.
  // Cyber-Siri swaps to Blue / Purple / Cyan for the drifting orbs.
  // ------------------------------------------------------------------
  purple: PURPLE,
  purpleSoft: PURPLE_SOFT,
  purpleGlow: "rgba(124, 58, 237, 0.30)",
  blue: ELECTRIC_BLUE,
  blueDeep: DEEP_BLUE,
  blueGlow: "rgba(0, 209, 255, 0.28)",
  cyan: CYAN,
  cyanGlow: "rgba(0, 255, 255, 0.28)",
  amber: "#F5C518",
  amberGlow: "rgba(245, 197, 24, 0.25)",

  // ------------------------------------------------------------------
  // Status tints
  // ------------------------------------------------------------------
  danger: "#F87171",
  warn: "#F59E0B",
  ok: "#34D399",
  info: ELECTRIC_BLUE_SOFT,

  // Legacy compat
  chipBg: "rgba(0, 209, 255, 0.06)",
  chipSelected: ELECTRIC_BLUE,
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
  inr: { color: colors.accent, glow: colors.accentGlow },
  usd: { color: colors.accent, glow: colors.accentGlow },
  thb: { color: colors.cyan, glow: colors.cyanGlow },
  balance: { color: colors.purple, glow: colors.purpleGlow },
  info: { color: colors.blue, glow: colors.blueGlow },
  ok: { color: colors.ok, glow: "rgba(52, 211, 153, 0.25)" },
  danger: { color: colors.danger, glow: "rgba(248, 113, 113, 0.25)" },
} as const;

export const TABLET_WIDTH = 900;
