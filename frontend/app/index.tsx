/**
 * MINIMAL LOADING SCREEN — Android APK bring-up test.
 *
 * Renders ONE white screen with "LogiOp Pro — Loading..." and nothing
 * else. No API calls, no state, no async imports. If this doesn't
 * launch on Android, the crash is in Expo/React Native native code
 * itself (rare) — otherwise the app was crashing because of a
 * downstream import we've now quarantined.
 */
import { SafeAreaView, StyleSheet, Text } from "react-native";

export default function LoadingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>LogiOp Pro</Text>
      <Text style={styles.subtitle}>Loading…</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#0A0A14",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "500",
  },
});
