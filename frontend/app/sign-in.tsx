import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/context";
import { GlassCard } from "@/src/components/glass-card";
import { colors, font, radii, spacing } from "@/src/theme";

/**
 * Sign-in screen. Dark, minimal, lime-accented. Includes a soft pulsing
 * orb behind the form so the screen feels alive even on the first launch.
 */
export default function SignInScreen() {
  const { user, signIn, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Keep a tiny pulse loop running purely for potential future use (kept
    // as a placeholder in case we want a foreground effect on the card).
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  const onSubmit = useCallback(async (overrideUsername?: string, overridePassword?: string) => {
    const u = (overrideUsername ?? username).trim();
    const p = overridePassword ?? password;
    if (!u || !p) {
      setError("Enter both username and password");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(u, p);
    } catch (e) {
      setError((e as Error).message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  }, [username, password, signIn]);

  // If already signed in, bounce to the tabs.
  if (!loading && user) return <Redirect href="/(tabs)" />;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      {/* Ambient background is mounted at root — we don't need a local orb. */}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.logoDot} />
              <Text style={styles.brand}>Logistics Hub</Text>
            </View>
            <Text style={styles.tagline}>Kishan Sir · Command Console</Text>
          </View>

          <GlassCard radius="xxl" tone="elevated" padded="lg">
            <Text style={styles.title}>Welcome, Kishan Sir</Text>
            <Text style={styles.subtitle}>
              Log in to open your dashboard, ledgers, bullion & Wingman AI.
            </Text>

            {/* Top-of-card CTA — always above the fold so the Login action
                is unmissable regardless of viewport height. Duplicate of
                the main submit button so tapping either logs in. */}
            <Pressable
              onPress={onSubmit}
              disabled={busy || !username || !password}
              style={({ pressed }) => [
                styles.buttonTop,
                (busy || !username || !password) && { opacity: 0.55 },
                pressed && { opacity: 0.85 },
              ]}
              testID="signin-top-cta"
              accessibilityLabel="Login"
              accessibilityRole="button"
            >
              <Ionicons name="log-in-outline" size={18} color="#000" />
              <Text style={styles.buttonTopText}>LOGIN</Text>
            </Pressable>

            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                value={username}
                onChangeText={(v) => {
                  setUsername(v);
                  if (error) setError(null);
                }}
                placeholder="e.g. kishan"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                style={styles.input}
                testID="signin-username"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.pwWrap}>
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    if (error) setError(null);
                  }}
                  placeholder="Your password"
                  placeholderTextColor={colors.textDim}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  style={[styles.input, { flex: 1 }]}
                  testID="signin-password"
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                />
                <Pressable onPress={() => setShowPw((v) => !v)} style={styles.eye} hitSlop={8}>
                  <Ionicons name={showPw ? "eye-off" : "eye"} size={18} color={colors.textDim} />
                </Pressable>
              </View>
            </View>

            {error && (
              <View style={styles.errorBar}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={onSubmit}
              disabled={busy}
              style={({ pressed }) => [
                styles.button,
                pressed && { opacity: 0.85 },
                busy && { opacity: 0.6 },
              ]}
              testID="signin-submit"
              accessibilityLabel="Login and go to dashboard"
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="arrow-forward-circle" size={20} color="#000" />
                  <Text style={styles.buttonText}>LOG IN &amp; OPEN DASHBOARD</Text>
                </>
              )}
            </Pressable>

            {/* Quick-fill demo credentials — one tap lands you inside the
                app without typing anything. Speeds up first-time review
                and helps if the user can't spot the primary button. */}
            <Pressable
              onPress={() => {
                setUsername("kishan");
                setPassword("Kishan@Boss2026");
                setError(null);
                // Pass credentials explicitly to bypass stale-closure race.
                onSubmit("kishan", "Kishan@Boss2026");
              }}
              style={styles.quickBtn}
              testID="signin-quick-demo"
              accessibilityLabel="Login as Kishan Sir with demo credentials"
            >
              <Ionicons name="flash" size={14} color={colors.lime} />
              <Text style={styles.quickBtnText}>Quick login as Kishan Sir (demo)</Text>
            </Pressable>

            <Text style={styles.hint}>
              New account? Ask an Admin to create one. Registration is
              Admin-controlled for audit compliance.
            </Text>
          </GlassCard>

          <Text style={styles.footer}>Powered by Wingman AI · v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },  // AmbientBackground provides the base
  orb: {
    position: "absolute",
    top: -180,
    left: -80,
    width: 460,
    height: 460,
    borderRadius: 260,
    overflow: "hidden",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: "center",
    gap: spacing.xl,
  },
  header: { alignItems: "center", gap: 6 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.lime,
    shadowColor: colors.lime,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
    fontFamily: font.display,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: font.display,
  },
  title: { fontSize: 26, fontWeight: "800", color: colors.text, letterSpacing: -0.5, fontFamily: font.display },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm, marginTop: 4, fontFamily: font.display },
  field: { gap: 6, marginTop: spacing.md },
  label: {
    fontSize: 10,
    color: colors.textDim,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: font.display,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
    fontFamily: font.display,
  },
  pwWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eye: {
    position: "absolute",
    right: 14,
    height: 44,
    justifyContent: "center",
  },
  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(248,113,113,0.10)",
    borderColor: "rgba(248,113,113,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    marginTop: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: 13, flex: 1, fontFamily: font.display },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.lime,
    paddingVertical: 17,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: colors.lime,
    shadowOpacity: 0.75,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    borderWidth: 2,
    borderColor: "rgba(0, 209, 255, 0.35)",
  },
  buttonText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.6,
    fontFamily: font.display,
  },
  buttonTop: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.lime,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: colors.lime,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  buttonTopText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1.5,
    fontFamily: font.display,
  },
  quickBtn: {
    marginTop: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0, 209, 255, 0.08)",
  },
  quickBtnText: {
    color: colors.lime,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.4,
    fontFamily: font.display,
  },
  hint: {
    marginTop: spacing.md,
    color: colors.textDim,
    fontSize: 11,
    textAlign: "center",
    fontFamily: font.display,
  },
  footer: {
    textAlign: "center",
    color: colors.textDim,
    fontSize: 11,
    letterSpacing: 0.5,
    fontFamily: font.display,
  },
});
