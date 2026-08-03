import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.panel },
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.ink, fontWeight: "700" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="party/[id]" options={{ title: "Party khata" }} />
        <Stack.Screen name="shipment/[id]" options={{ title: "Shipment" }} />
        <Stack.Screen name="shipment/new" options={{ title: "New shipment" }} />
        <Stack.Screen name="transport/index" options={{ title: "Transport" }} />
        <Stack.Screen name="transport/new" options={{ title: "Assign transport" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </>
  );
}

// Keep icon import referenced for Expo font loading if needed
void FontAwesome;
