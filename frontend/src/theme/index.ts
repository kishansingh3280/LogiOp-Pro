// True Black + lime accent theme mirroring the web app.
export const colors = {
  bg: "#000000",
  surface: "#0a0a0a",
  surfaceAlt: "#111111",
  border: "#1c1c1c",
  borderStrong: "#262626",
  text: "#F5F5F5",
  textMuted: "#9CA3AF",
  textDim: "#6B7280",
  lime: "#C6FF00",
  limeSoft: "#A3E635",
  limeGlow: "rgba(198, 255, 0, 0.12)",
  danger: "#F87171",
  warn: "#F59E0B",
  ok: "#34D399",
  info: "#60A5FA",
  chipBg: "#141414",
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const font = {
  display: "System",
  mono: "System",
} as const;

export const TABLET_WIDTH = 900;
