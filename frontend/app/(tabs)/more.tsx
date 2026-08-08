import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE, flushQueue, getQueue, subscribeQueue } from "@/src/api/client";
import { useAuth } from "@/src/auth/context";
import { colors, radii, spacing } from "@/src/theme";

type Row = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: string;
  onPress?: () => void;
  hint?: string;
  danger?: boolean;
};

export default function MoreScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const load = () => getQueue().then((q) => setPending(q.length));
    load();
    return subscribeQueue(load);
  }, []);

  const forceSync = async () => {
    setSyncing(true);
    try {
      await flushQueue();
      setLastSync(new Date());
    } finally {
      setSyncing(false);
    }
  };

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: "Business",
      rows: [
        { key: "parties", label: "Parties", icon: "people-outline", href: "/parties" },
        { key: "items", label: "Items catalog", icon: "pricetags-outline", href: "/items" },
        { key: "warehouses", label: "Warehouses", icon: "business-outline", href: "/warehouses" },
        { key: "ledger", label: "Ledger", icon: "book-outline", href: "/ledger" },
        { key: "reports", label: "Reports console", icon: "document-text-outline", href: "/reports", hint: "PDFs · invoices · packing · bullion" },
      ],
    },
    {
      title: "Delivery",
      rows: [
        { key: "lalamove", label: "Lalamove orders", icon: "bicycle-outline", href: "/lalamove" },
      ],
    },
    ...(user?.role === "Admin"
      ? [
          {
            title: "Admin",
            rows: [
              {
                key: "admin",
                label: "Admin console",
                icon: "shield-checkmark-outline" as const,
                href: "/admin",
                hint: "Users · audit · health",
              },
            ] as Row[],
          },
        ]
      : []),
    {
      title: "Data",
      rows: [
        {
          key: "sync",
          label: syncing ? "Syncing…" : pending > 0 ? `Sync ${pending} pending` : "Sync now",
          icon: "sync-outline",
          onPress: forceSync,
          hint: lastSync ? `Last sync ${lastSync.toLocaleTimeString()}` : undefined,
        },
      ],
    },
    {
      title: "Account",
      rows: [
        {
          key: "profile",
          label: user ? `${user.display_name} ${user.honorific}` : "Guest",
          icon: "person-circle-outline",
          hint: user ? `${user.role} · @${user.username}` : undefined,
        },
        {
          key: "signout",
          label: "Sign out",
          icon: "log-out-outline",
          onPress: () => {
            signOut().catch(() => undefined);
          },
          danger: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Manage business, delivery &amp; sync</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {groups.map((g) => (
          <View key={g.title} style={{ marginBottom: spacing.lg }}>
            <Text style={styles.sectionTitle}>{g.title}</Text>
            <View style={styles.group}>
              {g.rows.map((r, i) => (
                <TouchableOpacity
                  key={r.key}
                  activeOpacity={0.7}
                  onPress={() => (r.href ? router.push(r.href as never) : r.onPress?.())}
                  style={[
                    styles.row,
                    i < g.rows.length - 1 && styles.rowBorder,
                  ]}
                  testID={`more-${r.key}`}
                >
                  <View style={[styles.rowIcon, r.danger && styles.rowIconDanger]}>
                    <Ionicons name={r.icon} size={18} color={r.danger ? colors.danger : colors.lime} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, r.danger && { color: colors.danger }]}>{r.label}</Text>
                    {r.hint ? <Text style={styles.rowHint}>{r.hint}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.about}>
          <Text style={styles.aboutTitle}>Logistics Hub</Text>
          <Text style={styles.aboutText}>Backend</Text>
          <Text style={styles.aboutValue}>{API_BASE.replace("https://", "")}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.limeGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconDanger: { backgroundColor: "rgba(248,113,113,0.12)" },
  rowLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  rowHint: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  about: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  aboutTitle: { color: colors.lime, fontSize: 15, fontWeight: "800" },
  aboutText: { color: colors.textDim, fontSize: 11, marginTop: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  aboutValue: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
