// JARVIS Aura theme — dark #07070f base, four colour orbs (purple / gold /
// cyan / green) drifting behind glass, gold particles floating upward, and
// a neon-smoke tab bar. Numbers stay pure white; section headers glow
// neon-green. This file is COLOUR-ONLY: token names & shapes match the
// prior Cyber-Siri palette so no consumer needs to be touched.
//
// NOTE ON TOKEN NAMES: existing components use `colors.lime` / `limeGlow`
// as the primary accent. Rather than rename every reference across the
// codebase (hundreds of call sites), we keep the token names and point
// them to the JARVIS Aura palette. New code should prefer the semantic
// aliases `accent` / `accentGlow` / `accentSoft`.

import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Raw palette — JARVIS Aura
// ---------------------------------------------------------------------------
const NEON_GREEN = "#00FF88";         // primary accent (headers, active nav)
const NEON_GREEN_SOFT = "#4DFFAF";    // softer green for secondary UI
const NEON_CYAN = "#00F5FF";          // cyan orb + info glow
const NEON_PURPLE = "#9B4DFF";        // purple orb + balance metric
const NEON_GOLD = "#FFD700";          // gold particles + gold orb + gold metric
const DEEP_BASE = "#07070f";          // global background

export const colors = {
  // ------------------------------------------------------------------
  // Base surfaces
  // ------------------------------------------------------------------
  /** Global background — deep near-black with a hint of indigo. */
  bg: DEEP_BASE,
  /** Frosted card base — dark cool tint, semi-transparent so orbs bleed. */
  surface: "rgba(12, 12, 30, 0.82)",
  surfaceAlt: "rgba(14, 14, 34, 0.74)",
  glass: "rgba(12, 12, 30, 0.82)",         // low-elevation frosted card
  glassStrong: "rgba(16, 16, 38, 0.88)",   // hover/active glass tint
  /** Hair-line borders — subtle white tint, per JARVIS Aura spec. */
  border: "rgba(255, 255, 255, 0.10)",
  borderStrong: "rgba(255, 255, 255, 0.16)",

  // ------------------------------------------------------------------
  // Typography — numbers stay pure white always.
  // ------------------------------------------------------------------
  text: "#FFFFFF",
  textMuted: "rgba(255, 255, 255, 0.60)",
  textDim: "rgba(255, 255, 255, 0.45)",

  // ------------------------------------------------------------------
  // Primary accent — neon green.
  // Token names preserved for backwards compat across the app.
  // ------------------------------------------------------------------
  lime: NEON_GREEN,
  limeSoft: NEON_GREEN_SOFT,
  limeGlow: "rgba(0, 255, 136, 0.18)",

  /** Preferred aliases for new code. */
  accent: NEON_GREEN,
  accentSoft: NEON_GREEN_SOFT,
  accentGlow: "rgba(0, 255, 136, 0.18)",

  // ------------------------------------------------------------------
  // Ambient orb palette — used by <AmbientBackground/> and metric glows.
  // JARVIS Aura orbs: purple / gold / cyan / green.
  // ------------------------------------------------------------------
  purple: NEON_PURPLE,
  purpleSoft: "#B98BFF",
  purpleGlow: "rgba(155, 77, 255, 0.30)",
  blue: NEON_CYAN,
  blueDeep: "#1E1E4A",
  blueGlow: "rgba(0, 245, 255, 0.28)",
  cyan: NEON_CYAN,
  cyanGlow: "rgba(0, 245, 255, 0.28)",
  amber: NEON_GOLD,
  amberGlow: "rgba(255, 215, 0, 0.28)",

  // ------------------------------------------------------------------
  // Status tints
  // ------------------------------------------------------------------
  danger: "#FF6B8A",
  warn: "#FFB84D",
  ok: NEON_GREEN,
  info: NEON_CYAN,

  // Legacy compat
  chipBg: "rgba(0, 255, 136, 0.06)",
  chipSelected: NEON_GREEN,
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

/** Metric colour tokens — numbers are ALWAYS pure white per JARVIS Aura
 *  spec; only the surrounding glow carries the semantic colour so the
 *  number itself stays legible on any glass surface. */
export const metric = {
  gold: { color: "#FFFFFF", glow: colors.amberGlow },
  inr: { color: "#FFFFFF", glow: colors.accentGlow },
  usd: { color: "#FFFFFF", glow: colors.accentGlow },
  thb: { color: "#FFFFFF", glow: colors.cyanGlow },
  balance: { color: "#FFFFFF", glow: colors.purpleGlow },
  info: { color: "#FFFFFF", glow: colors.blueGlow },
  ok: { color: "#FFFFFF", glow: "rgba(0, 255, 136, 0.28)" },
  danger: { color: "#FFFFFF", glow: "rgba(255, 107, 138, 0.28)" },
} as const;

export const TABLET_WIDTH = 900;
