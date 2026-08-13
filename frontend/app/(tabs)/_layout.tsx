/**
 * Tabs layout — Phase 7 · Batch C-1.
 *
 * Fix 1 (Phase 7) · The mobile bottom bar has been extracted to the
 * ROOT layout as `<GlobalBottomDock>` so it persists on every stack
 * screen — not just tab pages. This file now just declares which
 * routes belong to the tabs group and disables the built-in bar.
 */
import { Tabs } from "expo-router";
import React from "react";

import { colors } from "@/src/lib/theme";
import { useUiVoice } from "@/src/lib/papa-mode";

export default function TabsLayout() {
  const voice = useUiVoice();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.bg,
        },
      }}
      tabBar={() => null}
    >
      <Tabs.Screen name="index" options={{ title: voice.overview }} />
      <Tabs.Screen name="shipments" options={{ title: voice.shipments }} />
      {/* Fix 1 (Phase 5) · Parties no longer appears on the mobile
          bottom dock. It remains a real tab route so tablet sidebar +
          More-tab entry still work, but its dock button is hidden. */}
      <Tabs.Screen
        name="parties"
        options={{ title: voice.parties, href: null }}
      />
      <Tabs.Screen name="invoices" options={{ title: voice.invoices }} />
      <Tabs.Screen name="more" options={{ title: voice.more }} />
    </Tabs>
  );
}

// ────────────────────────────────────────────────────────────────
// Fix 1 (Phase 7 · Batch C-1) · Mobile bottom bar has been extracted
// to `src/lib/global-bottom-dock.tsx` and mounted at the ROOT layout
// so it persists on stack screens (party/[id], shipment/[id],
// invoice/new, etc.). The legacy FloatingBottomBar has been removed;
// the (tabs) group now passes `tabBar={() => null}` to Tabs.
// ────────────────────────────────────────────────────────────────

