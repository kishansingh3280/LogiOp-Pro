/**
 * Phase-1 error boundary.
 *
 * Catches render errors from any subtree so a single broken screen
 * can never crash the whole app. Prints the error to the JS console
 * so it shows up in `adb logcat` / Metro logs on Android for
 * debugging.
 */
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, radii, spacing } from "./theme";

type Props = {
  children: React.ReactNode;
  label?: string;
  fallback?: (error: Error) => React.ReactNode;
};

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error?.message, info?.componentStack);
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.state.error);
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body} numberOfLines={6}>
          {this.state.error.message}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={this.handleReset}>
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  btn: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
