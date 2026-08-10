/**
 * Native WebRTC polyfill wrapper.
 *
 * On the web, we use the browser's built-in WebRTC (RTCPeerConnection,
 * RTCDataChannel, navigator.mediaDevices, MediaStream). On iOS/Android
 * we swap those in from `react-native-webrtc`.
 *
 * IMPORTANT:
 *   • `react-native-webrtc` is a NATIVE MODULE — it does NOT work in
 *     Expo Go. Users need a development or production build. See
 *     app.json → `plugins: ["@config-plugins/react-native-webrtc"]`.
 *   • This wrapper never THROWS at import time on Expo Go. If the
 *     native module is unavailable, `hasNativeWebRTC()` returns
 *     false and the Voice Orb falls back to text-only mode.
 */
import { Platform } from "react-native";

type WebRTCApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RTCPeerConnection: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RTCSessionDescription: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MediaStream: any;
  mediaDevices: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getUserMedia: (constraints: any) => Promise<any>;
  };
};

let _api: WebRTCApi | null = null;
let _loaded = false;

/**
 * Lazily resolve the WebRTC implementation for the current platform.
 * Returns `null` when native WebRTC isn't available (e.g. Expo Go on
 * device — the required native module isn't linked).
 */
export function getWebRTC(): WebRTCApi | null {
  if (_loaded) return _api;
  _loaded = true;
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (!w.RTCPeerConnection) return null;
    _api = {
      RTCPeerConnection: w.RTCPeerConnection,
      RTCSessionDescription: w.RTCSessionDescription,
      MediaStream: w.MediaStream,
      mediaDevices: navigator.mediaDevices,
    };
    return _api;
  }
  // Native — try to require react-native-webrtc dynamically so that
  // Expo Go doesn't crash at import time.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rtc = require("react-native-webrtc");
    if (!rtc || !rtc.RTCPeerConnection) return null;
    _api = {
      RTCPeerConnection: rtc.RTCPeerConnection,
      RTCSessionDescription: rtc.RTCSessionDescription,
      MediaStream: rtc.MediaStream,
      mediaDevices: rtc.mediaDevices,
    };
    return _api;
  } catch {
    return null;
  }
}

export function hasWebRTC(): boolean {
  return getWebRTC() !== null;
}
