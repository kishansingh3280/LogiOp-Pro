/**
 * MINIMAL ROOT LAYOUT — bring-up test.
 *
 * Intentionally the smallest possible React tree so we can prove the
 * Android APK launches without crashing. NO providers, NO context, NO
 * auth, NO voice orb, NO sidebar, NO error boundary. Only expo-router's
 * Stack navigator + React Native core.
 *
 * If this launches successfully on Android, we know the crash was in
 * one of the removed native modules / providers, and we can re-add
 * them one by one to bisect.
 */
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

export default function RootLayout() {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#FFFFFF" },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
