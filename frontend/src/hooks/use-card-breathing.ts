/**
 * useCardBreathing — inline-style hook that gives any View the JARVIS
 * Aura v2 "breathing glow" (a 4 s cardBreathe CSS keyframe declared in
 * app/_layout.tsx) plus the standard 20 px / 160 % saturate backdrop
 * blur. Each mount consumes a monotonic index so the delays stagger
 * (0 s, 0.5 s, 1 s, … 3.5 s, wrap).
 *
 * On native the hook is a no-op — React Native ignores web-only style
 * keys, and cards there rely on the platform's <BlurView/> tint plus
 * static shadowColor for glow.
 */
import { useMemo, useRef } from "react";
import { Platform, type ViewStyle } from "react-native";

let COUNTER = 0;

export function useCardBreathing(opts?: { blur?: boolean }): ViewStyle {
  const applyBlur = opts?.blur !== false; // default: true
  const idx = useRef<number | null>(null);
  if (idx.current === null) idx.current = COUNTER++;
  return useMemo(() => {
    if (Platform.OS !== "web") return {};
    const delay = ((idx.current || 0) * 0.5) % 4;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any = {
      animation: "cardBreathe 4s ease-in-out infinite",
      animationDelay: `${delay.toFixed(1)}s`,
      willChange: "box-shadow",
    };
    if (applyBlur) {
      out.backdropFilter = "blur(20px) saturate(160%)";
      out.WebkitBackdropFilter = "blur(20px) saturate(160%)";
    }
    return out as ViewStyle;
  }, [applyBlur]);
}
