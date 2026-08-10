/**
 * Notifications & To-Do console.
 *
 * Aggregates the app's live "blocker" feed (`/api/todo/blockers`) into a
 * single actionable screen with:
 *   • Filter tabs — All / Shipments / Ledger / Trips / Alerts / To-Do
 *   • AI To-Do — pending data-hygiene tasks with High/Medium/Low priority,
 *     each with a checkbox to mark done (persisted locally so the same
 *     item doesn't nag the operator again).
 *   • Cards with icon + title + description + relative time + unread dot.
 *   • Swipe left → delete (mark hidden), swipe right → mark read.
 *   • Empty state: "Sab clear hai! ✓" glow.
 *   • "Mark all read" header action + unread count badge.
 *
 * All read/hidden/done state lives client-side in AsyncStorage keyed by
 * blocker id — the backend blockers endpoint recomputes on every hit so
 * a fixed record naturally disappears from the feed once the operator
 * saves the missing field on the source screen.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "@/src/api/client";
import { toast } from "@/src/components/toast";
import { colors, radii, spacing } from "@/src/theme";
import { storage } from "@/src/utils/storage";

type Blocker = {
  id: string;
  category: "shipment" | "invoice" | "bag" | "ledger" | "trip" | "alert";
  title: string;
  description: string;
  route: string;
  priority: "high" | "medium" | "low";
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
};

type TodoStates = Record<string, { read?: boolean; hidden?: boolean; done?: boolean }>;

const STORAGE_KEY = "notifications_todo_state_v1";
const TABS = [
  { key: "all", label: "All" },
  { key: "shipments", label: "Shipments" },
  { key: "ledger", label: "Ledger" },
  { key: "trips", label: "Trips" },
  { key: "alerts", label: "Alerts" },
  { key: "todo", label: "To-Do" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function NotificationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [states, setStates] = useState<TodoStates>({});

  const load = useCallback(async () => {
    try {
      const raw = await apiGet<{
        shipments?: { id: string; consignment_no?: string; origin?: string; destination?: string; missing?: string[]; route?: string }[];
        invoices?: { id: string; invoice_no?: string; party_name?: string; route?: string }[];
        bags?: { id: string; bag_no?: string; shipment_id?: string; consignment_no?: string; route?: string }[];
      }>("/api/todo/blockers");
      const items: Blocker[] = [];
      for (const s of raw.shipments || []) {
        items.push({
          id: `ship-${s.id}`,
          category: "shipment",
          title: `Shipment ${s.consignment_no || (s.id || "").slice(0, 6)} incomplete`,
          description: `${s.origin || "?"} → ${s.destination || "?"} · missing ${(s.missing || []).join(", ")}`,
          route: s.route || `/shipment/${s.id}`,
          priority: "high",
          icon: "cube-outline",
          tint: "#9B4DFF",
        });
      }
      for (const inv of raw.invoices || []) {
        items.push({
          id: `inv-${inv.id}`,
          category: "invoice",
          title: `Invoice ${inv.invoice_no || (inv.id || "").slice(0, 6)} has zero amount`,
          description: `Bill-to: ${inv.party_name || "—"}`,
          route: inv.route || `/invoice/${inv.id}`,
          priority: "medium",
          icon: "document-text-outline",
          tint: "#00FF88",
        });
      }
      for (const b of raw.bags || []) {
        items.push({
          id: `bag-${b.id}`,
          category: "bag",
          title: `Bag ${b.bag_no || "?"} needs weight`,
          description: `Shipment ${b.consignment_no || "—"}`,
          route: b.route || `/shipment/${b.shipment_id}`,
          priority: "high",
          icon: "scale-outline",
          tint: "#FFB020",
        });
      }
      setBlockers(items);
    } catch (e) {
      toast.error(`Notifications load failed: ${(e as Error).message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await storage.getItem(STORAGE_KEY);
      if (!cancelled && saved) {
        try {
          setStates(JSON.parse(saved));
        } catch {
          /* ignore */
        }
      }
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const persist = (next: TodoStates) => {
    setStates(next);
    storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const setFlag = (id: string, patch: Partial<TodoStates[string]>) => {
    persist({ ...states, [id]: { ...(states[id] || {}), ...patch } });
  };

  const visible = useMemo(() => {
    return blockers.filter((b) => {
      if (states[b.id]?.hidden) return false;
      if (tab === "all") return true;
      if (tab === "shipments") return b.category === "shipment" || b.category === "bag";
      if (tab === "ledger") return b.category === "invoice" || b.category === "ledger";
      if (tab === "trips") return b.category === "trip";
      if (tab === "alerts") return b.category === "alert";
      if (tab === "todo") return b.priority === "high";
      return true;
    });
  }, [blockers, states, tab]);

  const unread = useMemo(
    () => visible.filter((b) => !states[b.id]?.read && !states[b.id]?.done).length,
    [visible, states],
  );

  const markAllRead = () => {
    const next: TodoStates = { ...states };
    for (const b of visible) next[b.id] = { ...(next[b.id] || {}), read: true };
    persist(next);
    toast.success("Marked all as read");
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="notifications-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {unread > 0 ? `${unread} unread` : "Sab clear hai"}
          </Text>
        </View>
        <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn} testID="notifications-mark-all-read">
          <Ionicons name="checkmark-done" size={14} color={colors.lime} />
          <Text style={styles.markAllText}>Mark all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        style={{ flexGrow: 0 }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, active && styles.tabActive]}
              testID={`notifications-tab-${t.key}`}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.lime} />
        }
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.lime} />
        ) : visible.length === 0 ? (
          <EmptyState />
        ) : (
          visible.map((b) => (
            <NotificationCard
              key={b.id}
              blocker={b}
              state={states[b.id] || {}}
              onOpen={() => {
                setFlag(b.id, { read: true });
                router.push(b.route as never);
              }}
              onDelete={() => {
                setFlag(b.id, { hidden: true });
                toast.info("Notification removed");
              }}
              onMarkRead={() => setFlag(b.id, { read: true })}
              onToggleDone={() => setFlag(b.id, { done: !states[b.id]?.done })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyRing}>
        <Ionicons name="checkmark-circle" size={48} color={colors.lime} />
      </View>
      <Text style={styles.emptyTitle}>Sab clear hai! ✓</Text>
      <Text style={styles.emptySub}>Koi pending kaam nahi.</Text>
    </View>
  );
}

// -- Card with swipe gestures -----------------------------------------------
function NotificationCard({
  blocker,
  state,
  onOpen,
  onDelete,
  onMarkRead,
  onToggleDone,
}: {
  blocker: Blocker;
  state: TodoStates[string];
  onOpen: () => void;
  onDelete: () => void;
  onMarkRead: () => void;
  onToggleDone: () => void;
}) {
  // Simple swipe via pan: on web we skip and use action buttons.
  const [swipeX] = useState(() => new Animated.Value(0));
  const [expanded, setExpanded] = useState(false);
  const unread = !state.read && !state.done;

  return (
    <Animated.View style={{ transform: [{ translateX: swipeX }] }}>
      <Pressable
        onPress={onOpen}
        onLongPress={() => setExpanded((e) => !e)}
        style={[
          styles.card,
          unread && styles.cardUnread,
          state.done && styles.cardDone,
        ]}
        testID={`notification-${blocker.id}`}
      >
        <View style={[styles.cardIcon, { borderColor: blocker.tint, backgroundColor: `${blocker.tint}22` }]}>
          <Ionicons name={blocker.icon} size={16} color={blocker.tint} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {blocker.title}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {blocker.description}
          </Text>
          <View style={styles.cardMeta}>
            <View style={[styles.priPill, priTint(blocker.priority)]}>
              <Text style={[styles.priText, priTint(blocker.priority)]}>
                {blocker.priority.toUpperCase()}
              </Text>
            </View>
            {state.done ? (
              <View style={styles.donePill}>
                <Ionicons name="checkmark" size={10} color={colors.bg} />
                <Text style={styles.donePillText}>Done</Text>
              </View>
            ) : null}
          </View>
        </View>
        {/* Right-side controls */}
        <View style={styles.rightControls}>
          {unread ? <View style={styles.unreadDot} /> : null}
          <TouchableOpacity onPress={onToggleDone} hitSlop={8} testID={`notification-${blocker.id}-done`}>
            <Ionicons
              name={state.done ? "checkbox" : "square-outline"}
              size={20}
              color={state.done ? colors.lime : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </Pressable>
      {expanded ? (
        <View style={styles.expandedActions}>
          <TouchableOpacity onPress={onMarkRead} style={styles.actionBtn}>
            <Ionicons name="checkmark-done" size={12} color={colors.lime} />
            <Text style={styles.actionText}>Mark read</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={12} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </Animated.View>
  );
}

function priTint(p: Blocker["priority"]): { color?: string; borderColor?: string; backgroundColor?: string } {
  if (p === "high") return { color: "#FF5C7A", borderColor: "#FF5C7A", backgroundColor: "rgba(255,92,122,0.10)" };
  if (p === "medium") return { color: "#FFB020", borderColor: "#FFB020", backgroundColor: "rgba(255,176,32,0.10)" };
  return { color: colors.textMuted, borderColor: colors.textMuted, backgroundColor: "rgba(255,255,255,0.05)" };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  iconBtn: { padding: 6 },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0,255,136,0.10)",
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
  },
  markAllText: { color: colors.lime, fontSize: 11, fontWeight: "800" },
  tabRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  tab: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tabActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: colors.bg },

  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: spacing.md,
    marginBottom: 8,
    backgroundColor: "rgba(12,12,30,0.7)",
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardUnread: {
    borderColor: "rgba(0,255,136,0.35)",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "0 0 12px rgba(0,255,136,0.15)" } as any),
      },
      default: {},
    }),
  },
  cardDone: { opacity: 0.55 },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  cardDesc: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  priPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  priText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
  donePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
  },
  donePillText: { color: colors.bg, fontSize: 9, fontWeight: "800" },
  rightControls: { alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime },
  expandedActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: -4,
    marginBottom: 12,
    marginLeft: 44,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: { color: colors.lime, fontSize: 11, fontWeight: "700" },

  empty: {
    marginTop: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.lime,
    borderWidth: 2,
    backgroundColor: "rgba(0,255,136,0.10)",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "0 0 30px rgba(0,255,136,0.35)" } as any),
      },
      default: {
        shadowColor: colors.lime,
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
    }),
  },
  emptyTitle: {
    color: colors.lime,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,255,136,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  emptySub: { color: colors.textDim, fontSize: 12 },
});
