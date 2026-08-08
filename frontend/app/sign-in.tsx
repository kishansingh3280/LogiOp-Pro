import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { colors, radii, spacing } from "@/src/theme";

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

  const orbScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const orbOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.55] });

  const onSubmit = useCallback(async () => {
    if (!username || !password) {
      setError("Enter both username and password");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(username, password);
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
      {/* Background orb */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          { opacity: orbOpacity, transform: [{ scale: orbScale }] },
        ]}
      >
        <LinearGradient
          colors={["rgba(198,255,0,0.55)", "rgba(198,255,0,0.0)"]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

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

          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to access ledgers, bullion, and Wingman AI.
            </Text>

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
            >
              {busy ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>

            <Text style={styles.hint}>
              Ask an Admin to create your account. Default admin: kishan.
            </Text>
          </View>

          <Text style={styles.footer}>Powered by Wingman AI · v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
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
    letterSpacing: 0.5,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "rgba(15,15,15,0.85)",
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  field: { gap: 6 },
  label: {
    fontSize: 11,
    color: colors.textDim,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
  },
  pwWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eye: {
    position: "absolute",
    right: 14,
    height: 36,
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
  },
  errorText: { color: colors.danger, fontSize: 13, flex: 1 },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.lime,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: "center",
    shadowColor: colors.lime,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  buttonText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  hint: {
    marginTop: spacing.md,
    color: colors.textDim,
    fontSize: 11,
    textAlign: "center",
  },
  footer: {
    textAlign: "center",
    color: colors.textDim,
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
