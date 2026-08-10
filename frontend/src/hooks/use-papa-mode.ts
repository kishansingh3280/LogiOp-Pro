/**
 * usePapaMode — tiny convenience hook that returns true when the signed-in
 * user is the family "Papa" (owner) whose experience should be simplified.
 *
 * Papa sees Hindi/Hinglish labels, no destructive actions (delete),
 * no admin surfaces, and cannot switch companies away from Singh Exports.
 * Backend endpoints still enforce role checks — this hook is UI polish.
 */
import { useAuth } from "@/src/auth/context";

export function usePapaMode(): boolean {
  const { user } = useAuth();
  return user?.role === "Papa";
}
