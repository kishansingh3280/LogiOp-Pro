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
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AmbientBackground } from "@/src/lib/ambient-background";
import { AuthProvider } from "@/src/lib/auth-context";
import { CompanyProvider } from "@/src/lib/company-context";
import { ErrorBoundary } from "@/src/lib/error-boundary";
import { GlobalSidebar } from "@/src/lib/global-sidebar";
import { OpsiOrb } from "@/src/lib/opsi-orb";
import { colors } from "@/src/lib/theme";

const TABLET_BREAKPOINT = 900;
const SIDEBAR_EXPANDED = 220;
const SIDEBAR_COLLAPSED = 64;
const MOBILE_SIDEBAR_WIDTH = 260;

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

  // Fix 6 · Mobile-only drawer state (sidebar hidden by default).
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(mobileAnim, {
      toValue: mobileOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [mobileOpen, mobileAnim]);

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

  const mobileTx = mobileAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-MOBILE_SIDEBAR_WIDTH, 0],
  });
  const backdropOpacity = mobileAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary label="root">
          <AuthProvider>
            <CompanyProvider>
            <StatusBar style="light" />
            <AmbientBackground />

            {/* Global sidebar — persistent on every route. Tablet: fixed
                left column. Mobile: rendered off-screen and slid in on
                hamburger tap; never unmounted on route change. */}
            {isTablet ? (
              <GlobalSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed((c) => !c)}
                width={sidebarWidth}
              />
            ) : (
              <>
                {/* Mobile backdrop — tap to close */}
                <Animated.View
                  pointerEvents={mobileOpen ? "auto" : "none"}
                  style={[styles.mobileBackdrop, { opacity: backdropOpacity }]}
                >
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => setMobileOpen(false)}
                    accessibilityLabel="Close menu"
                  />
                </Animated.View>
                {/* Mobile drawer wrapping the sidebar */}
                <Animated.View
                  pointerEvents={mobileOpen ? "auto" : "box-none"}
                  style={[
                    styles.mobileDrawer,
                    { width: MOBILE_SIDEBAR_WIDTH, transform: [{ translateX: mobileTx }] },
                  ]}
                >
                  <GlobalSidebar
                    collapsed={false}
                    onToggle={() => setMobileOpen(false)}
                    width={MOBILE_SIDEBAR_WIDTH}
                  />
                </Animated.View>
              </>
            )}

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

            {/* Mobile hamburger — top-left corner, always visible on mobile */}
            {!isTablet ? (
              <TouchableOpacity
                style={styles.hamburger}
                onPress={() => setMobileOpen(true)}
                activeOpacity={0.75}
                accessibilityLabel="Open menu"
                hitSlop={10}
              >
                <Ionicons name="menu" size={20} color={colors.text} />
              </TouchableOpacity>
            ) : null}

            {/* Floating OPSI orb — sits over every screen. */}
            <OpsiOrb />
            </CompanyProvider>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSolid },
  splashFallback: { flex: 1, backgroundColor: colors.bgSolid },
  hamburger: {
    position: "absolute",
    top: 44,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,15,40,0.75)",
    borderColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    zIndex: 60,
  },
  mobileBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 40,
  },
  mobileDrawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 50,
  },
});
