/**
 * jarvis-store — module-level state for the last AI message so the
 * FloatingJarvis bubble can render a "Message Cloud" (a small speech
 * bubble pop-out) even when the chat popup is closed.
 *
 * We deliberately keep this outside React so that the popup, the cloud,
 * and Live Mode can all read/write without expensive prop-drilling
 * through the app root. A tiny pub/sub keeps consumers in sync.
 */

export type CloudMsg = {
  /** Displayed text. AI turns only — user turns don't need a cloud. */
  text: string;
  /** ms timestamp for staleness + dedupe. */
  at: number;
};

type Listener = (m: CloudMsg | null) => void;

let cloud: CloudMsg | null = null;
const listeners = new Set<Listener>();

export function setCloud(msg: CloudMsg | null): void {
  cloud = msg;
  listeners.forEach((l) => l(cloud));
}

export function getCloud(): CloudMsg | null {
  return cloud;
}

export function subscribeCloud(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
