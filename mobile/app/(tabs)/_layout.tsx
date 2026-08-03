import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, Link } from "expo-router";
import { Pressable } from "react-native";
import { colors } from "@/lib/theme";

function TabIcon(props: { name: React.ComponentProps<typeof FontAwesome>["name"]; color: string }) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.line,
        },
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.ink,
        headerRight: () => (
          <Link href="/settings" asChild>
            <Pressable style={{ marginRight: 16 }}>
              {({ pressed }) => (
                <FontAwesome
                  name="cog"
                  size={22}
                  color={colors.accent}
                  style={{ opacity: pressed ? 0.5 : 1 }}
                />
              )}
            </Pressable>
          </Link>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <TabIcon name="home" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: "Ledger",
          tabBarIcon: ({ color }) => <TabIcon name="book" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="shipments"
        options={{
          title: "Shipments",
          tabBarIcon: ({ color }) => <TabIcon name="cubes" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="bags"
        options={{
          title: "Bags",
          tabBarIcon: ({ color }) => <TabIcon name="archive" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="parties"
        options={{
          title: "Parties",
          tabBarIcon: ({ color }) => <TabIcon name="users" color={String(color)} />,
        }}
      />
    </Tabs>
  );
}
