/**
 * Root Layout — Phase 10 · Fix 5.
 *
 * The tablet sidebar now lives at the ROOT so it persists on every
 * route (Ledger, Trips, Reports, Admin, etc.), not just tab screens.
 * The Stack content is offset with matching marginLeft on tablet.
 * Mobile viewport (< 900px) keeps the FloatingBottomBar rendered by
 * (tabs)/_layout.tsx — no sidebar.
 */
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AmbientBackground } from "@/src/lib/ambient-background";
import { AuthProvider } from "@/src/lib/auth-context";
import { ErrorBoundary } from "@/src/lib/error-boundary";
import { GlobalSidebar } from "@/src/lib/global-sidebar";
import { OpsiOrb } from "@/src/lib/opsi-orb";
import { colors } from "@/src/lib/theme";

const TABLET_BREAKPOINT = 900;
const SIDEBAR_EXPANDED = 220;
const SIDEBAR_COLLAPSED = 64;

try {
  SplashScreen.preventAutoHideAsync();
} catch {
  /* no-op */
}

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    ...Ionicons.font,
  });

  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  useEffect(() => {
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync().catch(() => {
        /* no-op */
      });
    }
  }, [fontsLoaded, fontsError]);

  if (!fontsLoaded && !fontsError) {
    return <View style={styles.splashFallback} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary label="root">
          <AuthProvider>
            <StatusBar style="light" />
            <AmbientBackground />

            {/* Global tablet sidebar — renders on every route */}
            {isTablet ? (
              <GlobalSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed((c) => !c)}
                width={sidebarWidth}
              />
            ) : null}

            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: "transparent",
                  marginLeft: isTablet ? sidebarWidth : 0,
                },
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
