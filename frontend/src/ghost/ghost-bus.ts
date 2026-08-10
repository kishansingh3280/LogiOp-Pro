/**
 * ghost-bus — very small pub/sub for signalling that ghost-typing
 * activity is starting on a specific form. UI can subscribe to
 * show a "Wingman is typing…" overlay while the AI drives the form.
 */
type GhostListener = (formId: string) => void;

const listeners = new Set<GhostListener>();

export function subscribeGhostType(fn: GhostListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitGhostTypeStart(formId: string): void {
  listeners.forEach((fn) => {
    try {
      fn(formId);
    } catch {
      /* ignore */
    }
  });
}
