/**
 * Admin → Users — Phase 7.
 *
 * Read-only list of every user in the system (from /api/auth/users).
 * Shows role, status, last-login. Creation flow will come from the
 * desktop console; this screen is for visibility only.
 */
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { shortDate, titleCase } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { Pill } from "@/src/lib/ui";

type SysUser = {
  id: string;
  username: string;
  email?: string;
  display_name?: string;
  role: string;
  honorific?: string;
  disabled?: boolean;
  last_login_at?: string | null;
  created_at?: string;
};

const ROLE: Record<string, { tint: string; soft: string }> = {
  admin: { tint: colors.brand, soft: colors.brandSoft },
  papa: { tint: colors.warn, soft: colors.warnSoft },
  staff: { tint: colors.info, soft: colors.infoSoft },
  carrier: { tint: colors.info, soft: colors.infoSoft },
  other: { tint: colors.textMuted, soft: colors.divider },
};

export default function AdminUsers() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<SysUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<SysUser[]>("/api/auth/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  if (!user || user.role !== "Admin") return <Redirect href="/(tabs)" />;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Users</Text>
          <Text style={styles.subtitle}>
            {users?.length ?? 0} total · admins, staff, carriers
          </Text>
        </View>
      </View>

      {users === null && loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.dim}>Loading users…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={24} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users ?? []}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => <UserRow user={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={32} color={colors.textDim} />
              <Text style={styles.emptyTitle}>No users yet</Text>
              <Text style={styles.emptyBody}>Seed the DB to see admin users here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function UserRow({ user }: { user: SysUser }) {
  const roleKey = (user.role || "other").toLowerCase();
  const r = ROLE[roleKey] ?? ROLE.other;
  const initial = (user.display_name || user.username || "?").slice(0, 1).toUpperCase();
  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: r.soft, borderColor: r.tint }]}>
        <Text style={[styles.avatarText, { color: r.tint }]}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {user.display_name || user.username}
          {user.honorific ? <Text style={styles.hon}> · {user.honorific}</Text> : null}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {user.username}
          {user.email && user.email !== user.username ? ` · ${user.email}` : ""}
        </Text>
        <Text style={styles.dim}>
          Last login: {shortDate(user.last_login_at)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Pill label={titleCase(user.role)} tint={r.tint} soft={r.soft} size="sm" />
        {user.disabled ? (
          <Pill label="DISABLED" tint={colors.danger} soft={colors.dangerSoft} size="sm" />
        ) : (
          <Pill label="ACTIVE" tint={colors.brand} soft={colors.brandSoft} size="sm" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 80 },
  row: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "800" },
  name: { color: colors.text, fontSize: 14, fontWeight: "800" },
  hon: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  rowSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  dim: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  center: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  emptyBody: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "700", textAlign: "center" },
  retry: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  retryText: { color: colors.bg, fontSize: 12, fontWeight: "800" },
});
