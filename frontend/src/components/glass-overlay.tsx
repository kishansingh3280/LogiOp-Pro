/**
 * GlassOverlay — JARVIS Aura v2 global "black-tinted blur glass" layer.
 *
 * Sits directly above <AmbientBackground/> (orbs + gold particles) and
 * BELOW every screen. Frost-diffuses the ambient colour bloom so the
 * blues/purples/greens read as a soft glow rather than sharp radial
 * gradients.
 *
 *   Layer stack (bottom → top):
 *     1. #07070f deep base
 *     2. Colour orbs + gold particles          (AmbientBackground)
 *     3. Black-tinted blur glass overlay       ← this component
 *     4. Screens (transparent)
 *     5. Frosted cards + tab bar + Wingman
 *
 * On web we use CSS `backdrop-filter: blur(40px)` so everything painted
 * behind the overlay (orbs, particles) is diffused. On native we render
 * `expo-blur` BlurView with a dark tint to achieve the same effect.
 */
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

export function GlassOverlay() {
  if (Platform.OS === "web") {
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "rgba(0, 0, 0, 0.50)",
            // On web, StyleSheet.absoluteFill maps to position:absolute
            // with inset:0. Because this component sits between
            // <AmbientBackground/> and the app <Stack/> in DOM order, it
            // paints AFTER the orbs+particles and BEFORE any screen
            // content — no explicit zIndex needed.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...({
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
            } as any),
          },
        ]}
      />
    );
  }
  // Native — real gaussian blur via expo-blur, tinted dark.
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0, 0, 0, 0.50)" }]}
      />
    </View>
  );
}
