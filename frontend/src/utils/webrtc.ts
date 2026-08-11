/**
 * WebRTC bridge — WEB-ONLY.
 *
 * `react-native-webrtc` and `@config-plugins/react-native-webrtc` have
 * been REMOVED from the project. Older Android APKs were crashing at
 * launch because of the native module's JNI init path — a class of
 * failure that no amount of try/catch at the JS layer can catch.
 *
 * With this stub:
 *   • Web browsers keep full WebRTC (uses `navigator.mediaDevices` +
 *     the browser's built-in `RTCPeerConnection` / `RTCSessionDescription`).
 *   • Native platforms (iOS/Android) return `null` — the orb UI stays
 *     visible for text-only interaction (typed prompts hit the same
 *     `/api/wingman-chat` endpoint), but no voice pipeline is started.
 *
 * When we're ready to bring voice back to native, we should:
 *   1. Wire up the WebRTC via a dev-build-only optional dependency
 *      loaded through Metro's platform.native.ts split (never touched
 *      by the web bundle), OR
 *   2. Switch to an HTTP-polling STT/TTS approach that doesn't need a
 *      persistent peer connection.
 *
 * Either way, this file becomes the single point of injection.
 */

export interface WebRTCImpl {
  MediaStream: typeof MediaStream;
  MediaStreamTrack: typeof MediaStreamTrack;
  RTCPeerConnection: typeof RTCPeerConnection;
  RTCSessionDescription: typeof RTCSessionDescription;
  RTCIceCandidate: typeof RTCIceCandidate;
  mediaDevices: MediaDevices;
}

/**
 * Returns the platform's WebRTC surface if it is safely available at
 * runtime WITHOUT touching any native module. Returns null everywhere
 * else so the app can safely fall back to text-only mode.
 */
export function getWebRTC(): WebRTCImpl | null {
  // Web / DOM path — use whatever the browser exposes. No `require`,
  // no dynamic module load, zero side-effects on native.
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection ===
      "function" &&
    !!navigator.mediaDevices
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    return {
      MediaStream: g.MediaStream,
      MediaStreamTrack: g.MediaStreamTrack,
      RTCPeerConnection: g.RTCPeerConnection,
      RTCSessionDescription: g.RTCSessionDescription,
      RTCIceCandidate: g.RTCIceCandidate,
      mediaDevices: navigator.mediaDevices,
    };
  }
  // iOS / Android — voice pipeline intentionally disabled.
  return null;
}

/** True on web (browser WebRTC present), false on native. */
export function hasWebRTC(): boolean {
  return getWebRTC() !== null;
}
