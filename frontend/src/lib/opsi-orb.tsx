/**
 * OPSI Orb — Phase 6.
 *
 * A globally-mounted, floating neon-green orb pinned to the
 * bottom-right of the screen. Tap → opens a modal text-chat panel
 * that hits `/api/wingman-chat` over plain HTTP.
 *
 * NO WebRTC, NO react-native-webrtc, NO expo-audio — this is a
 * text-only client. Voice / STT are deferred to a later phase.
 *
 * The orb itself uses `Animated` from `react-native` core for the
 * glow pulse. No new native modules.
 */
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiPost } from "./api";
import { colors, radii, spacing } from "./theme";

// The wingman endpoint returns {answer, action, data}. Only `answer`
// is user-facing text; the rest is control metadata we ignore here.
type WingmanResponse = {
  answer: string | null;
  action?: string | null;
  data?: unknown;
};

type ChatTurn = {
  id: string;
  role: "user" | "opsi";
  text: string;
  at: number;
};

const HELLO_TEXTS = [
  "Namaste Sir · I'm OPSI, your logistics wingman.",
  "Try: \"Kanhaiya ka ledger dikhao\", \"AURA-PEN-001 kaha hai?\", \"Total receivable?\"",
];

const FALLBACK_UNKNOWN = "Sir, main iss sawal ka jawab abhi nahi de sakta. Ledger balances, party statements, shipments ke bare mein poochho.";

export function OpsiOrb() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>(() => [
    { id: "h1", role: "opsi", text: HELLO_TEXTS[0], at: Date.now() },
    { id: "h2", role: "opsi", text: HELLO_TEXTS[1], at: Date.now() },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);

  // ── Breathing glow for the orb ─────────────────────────────────
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });

  // ── Send handler ───────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    setSending(true);
    const userTurn: ChatTurn = {
      id: `u${Date.now()}`,
      role: "user",
      text,
      at: Date.now(),
    };
    setTurns((prev) => [...prev, userTurn]);

    // Scroll to bottom on next tick (after render).
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await apiPost<WingmanResponse>("/api/wingman-chat", { message: text });
      const answer = res?.answer?.trim();
      const opsiTurn: ChatTurn = {
        id: `o${Date.now()}`,
        role: "opsi",
        text: answer && answer.length ? answer : FALLBACK_UNKNOWN,
        at: Date.now(),
      };
      setTurns((prev) => [...prev, opsiTurn]);
    } catch (e) {
      setTurns((prev) => [
        ...prev,
        {
          id: `e${Date.now()}`,
          role: "opsi",
          text: `⚠️ Network hiccup: ${(e as Error).message}`,
          at: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [draft, sending]);

  return (
    <>
      {/* Floating orb — positioned globally at bottom-right */}
      <View style={styles.orbWrap} pointerEvents="box-none">
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open OPSI assistant"
          style={styles.orbHit}
        >
          <Animated.View
            style={[
              styles.orbGlow,
              { opacity: glow, transform: [{ scale }] },
            ]}
          />
          <Animated.View style={[styles.orb, { transform: [{ scale }] }]}>
            <Ionicons name="sparkles" size={22} color={colors.bgSolid} />
          </Animated.View>
        </Pressable>
      </View>

      {/* Chat modal */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView edges={["top", "left", "right"]} style={styles.modalRoot}>
          <View style={styles.backdrop}>
            <View style={styles.panel}>
              {/* Handle */}
              <View style={styles.grabber} />

              {/* Header */}
              <View style={styles.panelHeader}>
                <View style={styles.headerIcon}>
                  <Ionicons name="sparkles" size={18} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerTitle}>OPSI</Text>
                  <Text style={styles.headerSub}>Logistics assistant · text mode</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setOpen(false)}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                  accessibilityLabel="Close OPSI"
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Chat body */}
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
              >
                <ScrollView
                  ref={scrollRef}
                  contentContainerStyle={styles.turns}
                  showsVerticalScrollIndicator={false}
                >
                  {turns.map((t) => (
                    <View
                      key={t.id}
                      style={[
                        styles.bubbleRow,
                        t.role === "user" ? styles.bubbleRowUser : styles.bubbleRowOpsi,
                      ]}
                    >
                      <View
                        style={[
                          styles.bubble,
                          t.role === "user" ? styles.bubbleUser : styles.bubbleOpsi,
                        ]}
                      >
                        <Text
                          style={[
                            styles.bubbleText,
                            t.role === "user" ? styles.bubbleTextUser : styles.bubbleTextOpsi,
                          ]}
                        >
                          {t.text}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {sending ? (
                    <View style={[styles.bubbleRow, styles.bubbleRowOpsi]}>
                      <View style={[styles.bubble, styles.bubbleOpsi, styles.thinking]}>
                        <ActivityIndicator color={colors.brand} size="small" />
                        <Text style={[styles.bubbleTextOpsi, { marginLeft: 8 }]}>Thinking…</Text>
                      </View>
                    </View>
                  ) : null}
                </ScrollView>

                {/* Composer */}
                <View style={styles.composer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ask OPSI…"
                    placeholderTextColor={colors.textDim}
                    value={draft}
                    onChangeText={setDraft}
                    returnKeyType="send"
                    onSubmitEditing={sendMessage}
                    multiline={false}
                    editable={!sending}
                  />
                  <TouchableOpacity
                    onPress={sendMessage}
                    disabled={!draft.trim() || sending}
                    style={[
                      styles.sendBtn,
                      (!draft.trim() || sending) && styles.sendBtnDisabled,
                    ]}
                    activeOpacity={0.8}
                    accessibilityLabel="Send message"
                  >
                    <Ionicons name="send" size={16} color={colors.bgSolid} />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Orb ────────────────────────────────────────────────────────
  orbWrap: {
    position: "absolute",
    right: 16,
    bottom: 96, // clears the mobile floating tab bar
    zIndex: 1000,
    elevation: 1000,
  },
  orbHit: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  orbGlow: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 22,
    shadowOpacity: 1,
    elevation: 12,
  },
  orb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },

  // ── Modal ──────────────────────────────────────────────────────
  modalRoot: { flex: 1, backgroundColor: "transparent" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  panel: {
    backgroundColor: colors.bgSolid,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.brandBorder,
    maxHeight: "85%",
    minHeight: "60%",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 24,
    shadowOpacity: 0.35,
    elevation: 24,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textDim,
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.6,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },

  // ── Chat body ──────────────────────────────────────────────────
  turns: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: 8,
  },
  bubbleRow: { flexDirection: "row" },
  bubbleRowUser: { justifyContent: "flex-end" },
  bubbleRowOpsi: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  bubbleUser: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
    borderTopRightRadius: 4,
  },
  bubbleOpsi: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderTopLeftRadius: 4,
  },
  bubbleText: { fontSize: 13, lineHeight: 18 },
  bubbleTextUser: { color: colors.bgSolid, fontWeight: "700" },
  bubbleTextOpsi: { color: colors.text },
  thinking: { flexDirection: "row", alignItems: "center" },

  // ── Composer ───────────────────────────────────────────────────
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: spacing.md,
    paddingBottom: Platform.OS === "ios" ? spacing.md : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.6,
    elevation: 6,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
