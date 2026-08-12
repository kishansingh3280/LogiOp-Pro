/**
 * /(tabs)/assistant  — LEGACY route.
 *
 * The full-screen Assistant tab was removed in favour of the
 * FloatingJarvis bubble + popup + Live Mode combo, which is rendered
 * globally at the app root and visible on every screen.
 *
 * This screen now redirects the operator back to the Overview tab and
 * opens the Jarvis popup on arrival. Keeps any lingering deep-links
 * (bookmarks, notification taps) from dead-ending.
 */
import { Redirect } from "expo-router";
import React from "react";

export default function AssistantRedirect() {
  return <Redirect href="/" />;
}
