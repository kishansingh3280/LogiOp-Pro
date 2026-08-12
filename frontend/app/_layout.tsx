/**
 * Phase-1 Root Layout — brings back the essentials but nothing risky:
 *   • SafeAreaProvider (already installed)
 *   • GestureHandlerRootView (already installed, required for expo-router)
 *   • AuthProvider (auto-logs in as Kishan via /api/auth/auto-login)
 *   • ErrorBoundary (top-level guard)
 *   • expo-router Stack (file-based routing)
 *
 * DELIBERATELY OMITTED (will restore progressively in later phases):
 *   • Sidebar / VoiceOrb / AmbientBackground (need expo-linear-gradient, expo-audio)
 *   • Company / FY / Screen contexts (not needed until multi-screen)
 *   • Icon font loading (may crash on cold start on some devices)
 */
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/src/lib/auth-context";
import { ErrorBoundary } from "@/src/lib/error-boundary";
import { colors } from "@/src/lib/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary label="root">
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: "slide_from_right",
              }}
            />
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
