/**
 * useGhostTyping — animated character-by-character reveal of a target
 * string into a state variable. Meant to be wired into form inputs when
 * the voice orb auto-fills them.
 *
 * Basic usage:
 *   const { value, isTyping, ghostFill } = useGhostTyping();
 *   <TextInput value={value} onChangeText={setValue} />
 *   // Later, when the Realtime model returns a field value:
 *   ghostFill("AURA-PEN-042", 50); // 50ms per char
 *
 * Rules:
 *   • Cursor blink is left to the consuming component (add a caret
 *     when `isTyping` is true).
 *   • Highlight color while filling is a style responsibility.
 *   • Cancels any prior fill on a new call.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface GhostTypingState {
  value: string;
  isTyping: boolean;
  ghostFill: (target: string, msPerChar?: number, onDone?: () => void) => void;
  setValue: (v: string) => void;
  cancel: () => void;
}

export function useGhostTyping(initial = ""): GhostTypingState {
  const [value, setValue] = useState<string>(initial);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsTyping(false);
  }, []);

  const ghostFill = useCallback(
    (target: string, msPerChar = 45, onDone?: () => void) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const clean = target ?? "";
      if (!clean) {
        setValue("");
        setIsTyping(false);
        onDone?.();
        return;
      }
      let i = 0;
      setIsTyping(true);
      setValue("");
      timerRef.current = setInterval(() => {
        i += 1;
        if (i >= clean.length) {
          setValue(clean);
          setIsTyping(false);
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          onDone?.();
          return;
        }
        setValue(clean.slice(0, i));
      }, msPerChar);
    },
    [],
  );

  useEffect(() => cancel, [cancel]);

  return { value, isTyping, ghostFill, setValue, cancel };
}
