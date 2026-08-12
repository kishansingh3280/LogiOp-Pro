/**
 * Root Layout — Phase 3.
 *
 * Additions vs Phase 2:
 *   • Preloads Ionicons font via expo-font ⇒ tab bar icons no longer
 *     race the first frame. This is the safe pattern for using
 *     @expo/vector-icons on Android: block the initial render until
 *     the font is ready so no missing-glyph crash can happen.
 *   • Splash screen kept visible until fonts are loaded.
 *   • Dark JARVIS Aura theme applied everywhere.
 */
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/src/lib/auth-context";
import { AmbientBackground } from "@/src/lib/ambient-background";
import { ErrorBoundary } from "@/src/lib/error-boundary";
import { OpsiOrb } from "@/src/lib/opsi-orb";
import { colors } from "@/src/lib/theme";

// Keep the native splash up until we've loaded assets. Wrapped in a
// try/catch so that even if the module isn't yet available on the
// device (rare cold-start race), we don't crash.
try {
  SplashScreen.preventAutoHideAsync();
} catch {
  /* no-op */
}

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    ...Ionicons.font,
  });

  // Hide native splash once fonts are ready OR loading definitively
  // errored out (fall-through so we never leave the user staring at
  // a blank splash forever).
  useEffect(() => {
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync().catch(() => {
        /* no-op */
      });
    }
  }, [fontsLoaded, fontsError]);

  if (!fontsLoaded && !fontsError) {
    // Return a blank dark view instead of null so the splash pixel
    // matches our theme (no white flash).
    return <View style={styles.splashFallback} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary label="root">
          <AuthProvider>
            <StatusBar style="light" />
            {/* Slow-breathing purple / cyan / green orbs behind the app */}
            <AmbientBackground />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
                animation: "slide_from_right",
              }}
            />
            {/* Floating OPSI orb — sits over every screen. */}
            <OpsiOrb />
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSolid },
  splashFallback: { flex: 1, backgroundColor: colors.bgSolid },
});
