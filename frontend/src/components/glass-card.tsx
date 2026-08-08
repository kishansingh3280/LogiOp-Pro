/**
 * GlassCard — high-transparency card with a strong backdrop-blur and
 * ultra-rounded corners. Used to compose every containers in the
 * "Siri 2.0" theme so ambient orbs bleed through.
 *
 * Uses `expo-blur`'s BlurView on native for real gaussian blur, and CSS
 * `backdropFilter` on web (Safari + Chrome). Falls back to a
 * translucent surface when blur isn't supported (Android older APIs).
 */
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";

import { colors, radii } from "@/src/theme";

type Tone = "default" | "elevated" | "flat";

export type GlassCardProps = ViewProps & {
  /** Padding preset shortcut — omit to control padding via `style`. */
  padded?: boolean | "sm" | "md" | "lg";
  /** Rounded corner scale. Defaults to `xl` (28). */
  radius?: keyof typeof radii;
  /** Extra tint applied over the blur. `elevated` is brighter, `flat` has
   *  no border. */
  tone?: Tone;
};

const PAD: Record<string, number> = {
  sm: 12,
  md: 16,
  lg: 20,
};

/**
 * Web can use the real backdrop-filter; native falls back to expo-blur.
 * On both platforms we layer a very faint white tint on top to lift the
 * card off the ambient orbs.
 */
export function GlassCard({
  padded,
  radius = "xl",
  tone = "default",
  style,
  children,
  ...rest
}: GlassCardProps) {
  const padValue =
    padded === true ? PAD.md : padded === false || padded == null ? 0 : PAD[padded];
  const borderRadius = radii[radius];
  const border =
    tone === "flat"
      ? 0
      : StyleSheet.hairlineWidth;
  const tint = tone === "elevated" ? colors.glassStrong : colors.glass;

  // On web we use CSS `backdrop-filter` — cheaper than mounting a real
  // blur View, and lets ambient orbs animate under it smoothly.
  if (Platform.OS === "web") {
    const webStyle: ViewStyle = {
      backgroundColor: tint,
      borderRadius,
      borderColor: colors.borderStrong,
      borderWidth: border,
      padding: padValue,
      overflow: "hidden",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(({ backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)" } as any) ),
    };
    return (
      <View style={[webStyle, style]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius,
          overflow: "hidden",
          borderColor: colors.borderStrong,
          borderWidth: border,
        },
        style,
      ]}
      {...rest}
    >
      <BlurView
        intensity={60}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          backgroundColor: tint,
          padding: padValue,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * Compact glass pill for chips / stat tiles.
 */
export function GlassPill({ style, children, ...rest }: ViewProps) {
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          {
            backgroundColor: colors.glass,
            borderRadius: radii.pill,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.borderStrong,
            paddingHorizontal: 12,
            paddingVertical: 5,
            overflow: "hidden",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(({ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" } as any)),
          },
          style,
        ]}
        {...rest}
      >
        {children}
      </View>
    );
  }
  return (
    <View
      style={[
        {
          borderRadius: radii.pill,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.borderStrong,
        },
        style,
      ]}
      {...rest}
    >
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={{ paddingHorizontal: 12, paddingVertical: 5 }}>{children}</View>
    </View>
  );
}
