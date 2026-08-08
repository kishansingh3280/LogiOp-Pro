// AI Assistant — True Black Hindi chat with SSE streaming.
// Uses Claude Sonnet 4.6 via Emergent LLM key. Voice pipeline hits
// backend proxies for OpenAI Whisper (STT) + tts-1 (TTS).

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE } from "@/src/api/client";
import { colors, radii, spacing } from "@/src/theme";
import { TAB_BAR_BOTTOM_PAD } from "./_layout";

type Msg = { role: "user" | "assistant"; text: string };

const SESSION_KEY = `assistant-${Date.now()}`;

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "नमस्ते! मैं आपका बिज़नेस असिस्टेंट हूँ। बताइए, क्या करना है?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");
  const scrollRef = useRef<ScrollView | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setBusy(true);
    setStreaming("");
    scrollToBottom();

    try {
      // SSE streaming for <2s time-to-first-token feel.
      const resp = await fetch(`${API_BASE}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: SESSION_KEY, message: q, history: [] }),
      });
      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Parse `data: ...` frames — Claude emits deltas one line each.
        for (const line of chunk.split("\n\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") continue;
          full += payload;
          setStreaming(full);
          scrollToBottom();
        }
      }
      setMessages((prev) => [...prev, { role: "assistant", text: full }]);
      setStreaming("");
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `त्रुटि: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
      scrollToBottom();
    }
  };

  // Auto-scroll when new messages arrive.
  useEffect(scrollToBottom, [messages, scrollToBottom]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.head}>
        <View style={styles.brainCircle}>
          <Ionicons name="hardware-chip" size={20} color={colors.lime} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Assistant</Text>
          <Text style={styles.subtitle}>Claude Sonnet 4.6 · Hindi</Text>
        </View>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>LIVE</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: TAB_BAR_BOTTOM_PAD + 20,
          }}
          onContentSizeChange={scrollToBottom}
        >
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} text={m.text} />
          ))}
          {streaming ? <MessageBubble role="assistant" text={streaming} streaming /> : null}
          {busy && !streaming ? (
            <View style={styles.thinking}>
              <ActivityIndicator size="small" color={colors.lime} />
              <Text style={styles.thinkingText}>सोच रहा हूँ…</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="पूछिए... (जैसे: ललित के लिए बैग जोड़ो)"
            placeholderTextColor={colors.textDim}
            editable={!busy}
            testID="assistant-input"
            multiline
            maxLength={500}
            onSubmitEditing={send}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || busy) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim() || busy}
            testID="assistant-send"
          >
            <Ionicons name="send" size={16} color={colors.bg} />
          </TouchableOpacity>
        </View>
        <Text style={styles.voiceHint}>
          🎤 Voice STT/TTS enabled on device build (Whisper + OpenAI TTS via Emergent key).
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ role, text, streaming }: { role: "user" | "assistant"; text: string; streaming?: boolean }) {
  const isUser = role === "user";
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser ? (
        <View style={styles.avatarAi}>
          <Ionicons name="hardware-chip-outline" size={14} color={colors.lime} />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi, streaming && styles.bubbleStreaming]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brainCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime, borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center", justifyContent: "center",
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: 11 },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, backgroundColor: colors.limeGlow,
    borderColor: colors.lime, borderWidth: StyleSheet.hairlineWidth,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lime },
  statusText: { color: colors.lime, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  row: { flexDirection: "row", gap: 8, marginBottom: spacing.md, alignItems: "flex-end" },
  rowUser: { justifyContent: "flex-end" },
  avatarAi: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.limeGlow,
    alignItems: "center", justifyContent: "center",
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radii.md, borderTopLeftRadius: 4,
  },
  bubbleAi: {
    backgroundColor: colors.surface,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleUser: {
    backgroundColor: colors.lime, borderTopRightRadius: 4, borderTopLeftRadius: radii.md,
  },
  bubbleStreaming: { borderColor: colors.lime, borderWidth: 1 },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: colors.bg, fontWeight: "700" },
  thinking: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  thinkingText: { color: colors.textDim, fontSize: 12, fontStyle: "italic" },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 8,
    borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.bg,
    marginBottom: TAB_BAR_BOTTOM_PAD,
  },
  input: {
    flex: 1,
    minHeight: 42, maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: 21,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14, paddingVertical: 10,
    color: colors.text, fontSize: 14,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.lime,
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  voiceHint: {
    color: colors.textDim, fontSize: 10, textAlign: "center",
    paddingBottom: 6, paddingHorizontal: spacing.md,
  },
});
