/**
 * Admin · Users — full user management screen.
 *
 * Admin-only (guarded by AuthGate + role check). Renders the users list from
 * `GET /api/auth/users` with inline actions:
 *   - Toggle disabled
 *   - Change role
 *   - Reset password
 *   - Delete (self-delete blocked by backend)
 *
 * New users are created via a bottom-sheet form calling POST /api/auth/register.
 */
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/src/api/client";
import { getAuthTokenSync, useAuth, type Role } from "@/src/auth/context";
import { colors, radii, spacing } from "@/src/theme";

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  honorific: string;
  disabled?: boolean;
};

const ROLES: Role[] = ["Admin", "Staff", "Carrier"];

async function authFetch(path: string, init?: RequestInit) {
  const token = getAuthTokenSync();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.detail || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

export default function AdminUsers() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: me, loading } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    try {
      setFetching(true);
      setError(null);
      const data = (await authFetch("/api/auth/users")) as UserRow[];
      setUsers(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && me?.role === "Admin") load();
  }, [loading, me, load]);

  if (loading) return null;
  if (!me || me.role !== "Admin") return <Redirect href="/(tabs)" />;

  return (
    <View style={styles.wrap}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Users</Text>
            <Text style={styles.subtitle}>{users.length} accounts</Text>
          </View>
          <Pressable onPress={() => setAddOpen(true)} style={styles.addBtn} testID="admin-users-add">
            <Ionicons name="add" size={18} color="#000" />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBar}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={fetching} onRefresh={load} tintColor={colors.lime} />}
        >
          {users.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              isMe={u.id === me.id}
              onEdit={() => setEditUser(u)}
              onToggle={async () => {
                try {
                  await authFetch(`/api/auth/users/${u.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ disabled: !u.disabled }),
                  });
                  await load();
                } catch (e) {
                  Alert.alert("Update failed", (e as Error).message);
                }
              }}
              onDelete={async () => {
                if (u.id === me.id) {
                  Alert.alert("Cannot delete", "You cannot delete your own account.");
                  return;
                }
                Alert.alert(
                  "Delete user?",
                  `This permanently removes ${u.username}. Continue?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await authFetch(`/api/auth/users/${u.id}`, { method: "DELETE" });
                          await load();
                        } catch (e) {
                          Alert.alert("Delete failed", (e as Error).message);
                        }
                      },
                    },
                  ],
                );
              }}
            />
          ))}
          {users.length === 0 && !fetching ? (
            <Text style={styles.empty}>No users. Tap "Add" to create one.</Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <AddUserSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={async () => {
          setAddOpen(false);
          await load();
        }}
      />

      {editUser ? (
        <EditUserSheet
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={async () => {
            setEditUser(null);
            await load();
          }}
        />
      ) : null}
    </View>
  );
}

function UserCard({
  user,
  isMe,
  onEdit,
  onToggle,
  onDelete,
}: {
  user: UserRow;
  isMe: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.card, user.disabled && { opacity: 0.55 }]} testID={`user-row-${user.username}`}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(user.display_name || user.username)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {user.display_name} {user.honorific}
          </Text>
          {isMe ? (
            <View style={styles.badgeSelf}>
              <Text style={styles.badgeSelfText}>You</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.username}>@{user.username}</Text>
        <View style={styles.chipsRow}>
          <View style={[styles.roleChip, styles[`role_${user.role}` as never]]}>
            <Text style={styles.roleChipText}>{user.role}</Text>
          </View>
          {user.disabled ? (
            <View style={styles.disabledChip}>
              <Text style={styles.disabledChipText}>DISABLED</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onEdit} style={styles.iconBtn} hitSlop={6} testID={`user-edit-${user.username}`}>
          <Ionicons name="create-outline" size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={onToggle} style={styles.iconBtn} hitSlop={6}>
          <Ionicons
            name={user.disabled ? "power" : "power-outline"}
            size={18}
            color={user.disabled ? colors.lime : colors.textMuted}
          />
        </Pressable>
        {!isMe ? (
          <Pressable onPress={onDelete} style={styles.iconBtn} hitSlop={6}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function AddUserSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [honorific, setHonorific] = useState("Sir");
  const [role, setRole] = useState<Role>("Staff");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = username.trim().length >= 3 && password.length >= 8 && displayName.trim().length > 0;

  useEffect(() => {
    if (!visible) {
      setUsername("");
      setDisplayName("");
      setPassword("");
      setHonorific("Sir");
      setRole("Staff");
      setErr(null);
      setBusy(false);
    }
  }, [visible]);

  const submit = useCallback(async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await authFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
          display_name: displayName.trim(),
          role,
          honorific: honorific.trim() || "Sir",
        }),
      });
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [canSubmit, busy, username, password, displayName, role, honorific, onCreated]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.sheetKb}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Add user</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12 }} keyboardShouldPersistTaps="handled">
            <Field label="Display name">
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                testID="add-user-name"
              />
            </Field>
            <Field label="Username (login)">
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. ramesh"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                testID="add-user-username"
              />
            </Field>
            <Field label="Honorific (Sir / Boss / Ji)">
              <TextInput
                value={honorific}
                onChangeText={setHonorific}
                placeholder="Sir"
                placeholderTextColor={colors.textDim}
                style={styles.input}
              />
            </Field>
            <Field label="Password (min 8 chars)">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Choose a strong password"
                placeholderTextColor={colors.textDim}
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
                testID="add-user-password"
              />
            </Field>
            <Field label="Role">
              <View style={styles.roleRow}>
                {ROLES.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setRole(r)}
                    style={[styles.rolePill, role === r && styles.rolePillActive]}
                    testID={`add-user-role-${r}`}
                  >
                    <Text style={[styles.rolePillText, role === r && styles.rolePillTextActive]}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>
            {err ? (
              <View style={styles.errorBar}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{err}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={submit}
              disabled={!canSubmit || busy}
              style={({ pressed }) => [
                styles.submit,
                (!canSubmit || busy) && { opacity: 0.5 },
                pressed && { opacity: 0.85 },
              ]}
              testID="add-user-submit"
            >
              {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>Create user</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EditUserSheet({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState(user.display_name);
  const [honorific, setHonorific] = useState(user.honorific);
  const [role, setRole] = useState<Role>(user.role);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const patch: Record<string, unknown> = {
        display_name: displayName.trim(),
        honorific: honorific.trim() || "Sir",
        role,
      };
      if (password) {
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        patch.password = password;
      }
      await authFetch(`/api/auth/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [displayName, honorific, role, password, user.id, onSaved]);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.sheetKb}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Edit @{user.username}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12 }} keyboardShouldPersistTaps="handled">
            <Field label="Display name">
              <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} />
            </Field>
            <Field label="Honorific">
              <TextInput value={honorific} onChangeText={setHonorific} style={styles.input} />
            </Field>
            <Field label="Role">
              <View style={styles.roleRow}>
                {ROLES.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setRole(r)}
                    style={[styles.rolePill, role === r && styles.rolePillActive]}
                  >
                    <Text style={[styles.rolePillText, role === r && styles.rolePillTextActive]}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>
            <Field label="Reset password (leave blank to keep)">
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="New password (min 8)"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                style={styles.input}
              />
            </Field>
            {err ? (
              <View style={styles.errorBar}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{err}</Text>
              </View>
            ) : null}
            <Pressable onPress={submit} disabled={busy} style={styles.submit}>
              {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>Save</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function initials(s: string): string {
  const parts = s.trim().split(/\s+/);
  return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.lime,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  addBtnText: { color: "#000", fontWeight: "800", fontSize: 13 },
  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: spacing.lg,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: "rgba(248,113,113,0.10)",
    borderColor: "rgba(248,113,113,0.30)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorText: { color: colors.danger, fontSize: 12, flex: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.limeGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.lime, fontWeight: "800", fontSize: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  username: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  chipsRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.limeGlow,
  },
  role_Admin: { backgroundColor: "rgba(198,255,0,0.18)" },
  role_Staff: { backgroundColor: "rgba(125,249,255,0.12)" },
  role_Carrier: { backgroundColor: "rgba(255,176,32,0.14)" },
  roleChipText: { color: colors.text, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  disabledChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: "rgba(248,113,113,0.12)",
  },
  disabledChipText: { color: colors.danger, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  badgeSelf: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: colors.lime,
  },
  badgeSelfText: { color: "#000", fontSize: 9, fontWeight: "800" },
  actions: { flexDirection: "row", alignItems: "center", gap: 2 },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    padding: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheetKb: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "88%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: 8,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  label: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
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
    fontSize: 15,
  },
  roleRow: { flexDirection: "row", gap: 6 },
  rolePill: {
    flex: 1,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
    paddingVertical: 8,
    alignItems: "center",
  },
  rolePillActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  rolePillText: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
  rolePillTextActive: { color: "#000" },
  submit: {
    backgroundColor: colors.lime,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { color: "#000", fontWeight: "800", fontSize: 15 },
});
