import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/src/auth/context";
import { AmbientBackground } from "@/src/components/ambient-background";
import { BlockerBell } from "@/src/components/blocker-bell";
import { FloatingJarvis } from "@/src/components/floating-jarvis";
import { GlassOverlay } from "@/src/components/glass-overlay";
import { Sidebar } from "@/src/components/sidebar";
import { ToastHost } from "@/src/components/toast";
import { CompanyProvider } from "@/src/context/company-context";
import { FYProvider } from "@/src/context/fy-context";
import { ScreenContextProvider } from "@/src/context/screen-context";
import { SidebarProvider, currentSidebarWidth, useSidebar } from "@/src/context/sidebar-context";
import { GhostUserProvider } from "@/src/ghost/ghost-user";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

// Web: patch the html/body background so the RN Web layout containers
// don't fall back to iOS system-grey (#F2F2F2) around our AmbientBackground.
if (Platform.OS === "web" && typeof document !== "undefined") {
  const css = `
    html, body, #root, #root > div { background-color: ${colors.bg} !important; }
    /* RN Web sometimes injects its iOS system-grey (#F2F2F2 / #f2f2f2 /
       rgb(242,242,242)) as the default page background — force transparent
       so our AmbientBackground bleeds through everywhere. */
    [style*="rgb(242, 242, 242)"], [style*="#F2F2F2"], [style*="#f2f2f2"] {
      background-color: transparent !important;
    }
    /* Extremely sharp Apple/Inter-style typography for the Siri 2.0 theme. */
    body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, sans-serif !important; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; letter-spacing: -0.01em; }

    /* JARVIS Aura v2 — breathing glow keyframe applied to every glass
       card. Each Card sets its own animation-delay via inline style so
       cards don't all pulse in lockstep. */
    @keyframes cardBreathe {
      0%   { box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 12px rgba(0,255,136,0.08); }
      50%  { box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 20px rgba(0,255,136,0.16); }
      100% { box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 12px rgba(0,255,136,0.08); }
    }
    .jarvis-breathe {
      animation: cardBreathe 4s ease-in-out infinite;
      will-change: box-shadow;
    }
  `;
  const style = document.createElement("style");
  style.setAttribute("data-app-theme", "siri");
  style.textContent = css;
  // Remove any prior instance in case of hot-reload
  const existing = document.head.querySelector('[data-app-theme="siri"]');
  if (existing) existing.remove();
  document.head.appendChild(style);
}

/**
 * AuthShell — renders the Sidebar + main content pane. Sidebar is
 * hidden on the /sign-in route; on tablet it's docked left and the
 * content pane shifts right to accommodate; on mobile it's an overlay
 * so the content pane keeps full width.
 */
function AuthShell({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const s = useSidebar();
  const onSignIn = segments[0] === "sign-in";
  const contentOffset = onSignIn ? 0 : currentSidebarWidth(s);
  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      {!onSignIn ? <Sidebar /> : null}
      <View style={{ flex: 1, marginLeft: s.isTablet ? 0 : 0, paddingLeft: contentOffset }}>
        {children}
      </View>
    </View>
  );
}

/**
 * Root layout — wraps everything in Auth + Screen-context providers.
 * `AuthGate` redirects between /sign-in and /(tabs) based on token state.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "sign-in";
    if (!user && !inAuthGroup) {
      router.replace("/sign-in");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <AmbientBackground />
        <GlassOverlay />
        <AuthProvider>
          <CompanyProvider>
            <FYProvider>
              <ScreenContextProvider>
                <GhostUserProvider>
                  <SidebarProvider>
                    <StatusBar style="light" />
                    <AuthGate>
                      <AuthShell>
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            // Transparent content lets the AmbientBackground bleed through.
                            contentStyle: { backgroundColor: "transparent" },
                            animation: "slide_from_right",
                          }}
                        />
                      </AuthShell>
                    </AuthGate>
                    <BlockerBell />
                    <FloatingJarvis />
                    <ToastHost />
                  </SidebarProvider>
                </GhostUserProvider>
              </ScreenContextProvider>
            </FYProvider>
          </CompanyProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
