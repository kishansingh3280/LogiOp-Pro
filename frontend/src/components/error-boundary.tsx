/**
 * ErrorBoundary — catches ALL render / lifecycle exceptions in the
 * child subtree and shows a safe fallback instead of the white/red
 * Android "keeps stopping" native crash screen.
 *
 * Why a class component?
 *   React's error-boundary contract (`getDerivedStateFromError` +
 *   `componentDidCatch`) is class-only — there is no hook equivalent
 *   as of React 19. This is the ONLY class component in the app.
 *
 * Usage — wrap high-value routes:
 *   <ErrorBoundary label="dashboard">
 *     <Dashboard />
 *   </ErrorBoundary>
 *
 * The boundary swallows the error, logs it (console.warn is quiet on
 * production Metro but visible in `adb logcat` under ReactNativeJS),
 * and shows a friendly "Kuch garbar hui" card with a "Retry" button
 * that resets local state so the operator can try again without
 * force-quitting the app.
 */
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, radii, spacing } from "@/src/theme";

interface ErrorBoundaryProps {
  /** Human label for debugging — appears in the console log so we can
   *  tell WHICH boundary caught the error. */
  label?: string;
  /** Custom fallback renderer. Defaults to the built-in card UI. */
  fallback?: (err: Error, retry: () => void) => React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Runs during render. Update state so the next render shows the
    // fallback UI instead of the throwing subtree.
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Runs after the boundary catches — safe place for side effects.
    // We log verbosely so adb logcat / Metro / Sentry can see it.
    // eslint-disable-next-line no-console
    console.warn(
      `[ErrorBoundary:${this.props.label || "unknown"}] caught render error`,
      error?.name,
      error?.message,
      "\n  componentStack:\n" + (info?.componentStack || "(no stack)"),
    );
  }

  reset = () => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <View style={styles.wrap}>
          <View style={styles.card}>
            <Text style={styles.emoji}>😅</Text>
            <Text style={styles.title}>Kuch garbar hui, Sir</Text>
            <Text style={styles.subtitle}>
              Yeh screen abhi load nahi ho paayi. Retry karein ya app dobara
              kholein.
            </Text>
            <Text style={styles.errText} numberOfLines={3}>
              {String(this.state.error?.message || this.state.error).slice(0, 220)}
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={this.reset}
              testID="error-boundary-retry"
            >
              <Text style={styles.retryText}>🔁  Retry</Text>
            </TouchableOpacity>
            {Platform.OS !== "web" ? (
              <Text style={styles.tip}>
                Agar dobara hoti hai, screen ka screenshot le kar send karein.
              </Text>
            ) : null}
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.warn,
    gap: 10,
    alignItems: "center",
  },
  emoji: { fontSize: 40 },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  errText: {
    color: colors.textDim,
    fontSize: 11,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    backgroundColor: "rgba(255,92,122,0.08)",
    borderColor: "rgba(255,92,122,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    padding: 8,
    marginTop: 6,
    width: "100%",
    textAlign: "left",
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
  },
  retryText: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  tip: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
});

export default ErrorBoundary;
