/**
 * Root Layout — Phase 10 · Fix 5 + Fix 6.
 *
 * The tablet sidebar lives at the ROOT so it persists on every
 * route (Ledger, Trips, Reports, Admin, etc.), not just tab screens.
 * The Stack content is offset with matching marginLeft on tablet.
 *
 * Fix 6 · Mobile viewport (< 900px): sidebar is still rendered at the
 * root but hidden off-screen by default. A small hamburger button in
 * the top-left corner slides the sidebar in from the left as an
 * overlay. Tap the backdrop to dismiss. Sidebar is NEVER conditionally
 * unmounted or re-animated on route change.
 */
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AmbientBackground } from "@/src/lib/ambient-background";
import { apiPost } from "@/src/lib/api";
import { AuthProvider, useAuth } from "@/src/lib/auth-context";
import { CompanyProvider } from "@/src/lib/company-context";
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
  const [fontsLoaded, fontsError] = useFonts({});

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
            <CompanyProvider>
              <NowBriefPrewarm />
            <StatusBar style="light" />
            <AmbientBackground />

            {/* Global sidebar — tablet only. Fix 1 (Phase 5) removed
                the mobile drawer/hamburger entirely; mobile relies on
                the bottom dock exclusively. */}
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
            </CompanyProvider>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Fix 2 (Phase 4) · Background pre-warm — fires a POST /api/dashboard/
 * now-brief request as soon as the user is authenticated so the LLM
 * response is already cached (5-min TTL) by the time they reach the
 * dashboard. No UI, no state; fire-and-forget.
 */
function NowBriefPrewarm() {
  const { token } = useAuth();
  useEffect(() => {
    if (!token) return;
    apiPost("/api/dashboard/now-brief", {}).catch(() => {
      /* silent — this is a background pre-warm */
    });
  }, [token]);
  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSolid },
  splashFallback: { flex: 1, backgroundColor: colors.bgSolid },
});
