/**
 * `useGhostFill` — the form-side of the Ghost-User engine.
 *
 * Screens call this hook with a map `{ fieldName: setterFn }`. When a
 * pending payload arrives from the Ghost store AND the payload's target
 * `route` matches the current route, the hook:
 *   1. Waits ~500ms for the screen animation to settle.
 *   2. Types each field one-by-one with a small delay per character.
 *   3. Emits progress events so <GhostFillBanner> can show live status.
 *   4. Calls `onReadyToSubmit` when done so the caller can either
 *      auto-save or await user confirmation.
 *
 * Cursor position hints: the hook also calls `useGhostUser().hintCursor`
 * once per field so the floating lime dot flies to the input as it's
 * being typed.
 */
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { useGhostUser } from "@/src/ghost/ghost-user";
import { getGhostPayload, setGhostPayload, subscribeGhost, type GhostPayload } from "@/src/ghost/store";

export type GhostFillMap = Record<
  string,
  ((v: unknown) => void) | { set: (v: unknown) => void; ref?: React.RefObject<unknown> }
>;

export function useGhostFill(fields: GhostFillMap, opts?: { onReadyToSubmit?: (p: GhostPayload) => void; typingSpeed?: number }) {
  const pathname = usePathname();
  const ghost = useGhostUser();
  const consumedRef = useRef<string | null>(null); // guard against double-runs on hot reload
  const router = useRouter();

  useEffect(() => {
    const run = async (payload: GhostPayload | null) => {
      if (!payload) return;
      if (payload.route !== pathname) return;
      if (consumedRef.current === JSON.stringify(payload)) return;
      consumedRef.current = JSON.stringify(payload);

      // Announce & let the screen settle before we start typing.
      ghost.beginFill?.(payload);
      await sleep(500);

      const perField = payload.fieldDelay ?? 340;
      const perChar = opts?.typingSpeed ?? 22;

      const entries = Object.entries(payload.values);
      for (const [key, value] of entries) {
        const target = fields[key];
        if (!target) continue;
        const setter = typeof target === "function" ? target : target.set;

        // Progressive char-by-char typing for strings; instant for others.
        if (typeof value === "string") {
          let acc = "";
          for (const ch of value) {
            acc += ch;
            setter(acc);
            await sleep(perChar);
          }
        } else {
          setter(value);
        }
        ghost.hintCursor?.(120, 220); // visual cue — approximate; screens can override later
        ghost.progressFill?.(key);
        await sleep(perField);
      }

      ghost.readyFill?.(payload);
      opts?.onReadyToSubmit?.(payload);
    };

    // Fire once for whatever's already in the store, then subscribe.
    void run(getGhostPayload());
    const unsub = subscribeGhost((p) => {
      void run(p);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Clean up on unmount so a stale payload doesn't re-fire.
  useEffect(() => {
    return () => {
      const payload = getGhostPayload();
      if (payload && payload.route === pathname) {
        setGhostPayload(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
