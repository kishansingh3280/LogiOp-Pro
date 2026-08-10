/**
 * FillFormBridge — a background component (renders nothing) that
 * listens for `fill_form` events dispatched by the Voice Orb's
 * OpenAI Realtime session and navigates the user to the target
 * form. Screens themselves consume the pending payload on mount
 * via `consumePendingFillForm`.
 *
 * Mounted once at the root layout — right next to the VoiceOrb.
 */
import { useRouter } from "expo-router";
import { useEffect } from "react";

import {
  FILL_FORM_ROUTES,
  subscribeFillForm,
} from "@/src/api/fill-form-bus";
import { toast } from "@/src/components/toast";
import { emitGhostTypeStart } from "@/src/ghost/ghost-bus";

export function FillFormBridge() {
  const router = useRouter();

  useEffect(() => {
    const unsub = subscribeFillForm((p) => {
      const route = FILL_FORM_ROUTES[p.form];
      if (!route) return;
      // Show a short toast so the operator understands the AI just
      // acted on their command — this is critical trust-UX.
      const label =
        p.reason ||
        ({
          shipment_new: "Naya shipment banate hain",
          invoice_new: "Naya invoice banate hain",
          party_new: "Nayi party jodte hain",
          ledger_entry_new: "Ledger entry karte hain",
          trip_new: "Nayi trip banate hain",
        } as Record<string, string>)[p.form] ||
        "Form open kar raha hoon";
      toast.info(`🎤 ${label}`);
      // Kick off the ghost-typing signal so the destination form's
      // subscribers know new AI-driven data is about to arrive. The
      // destination form actually receives the fields via
      // `consumePendingFillForm` when it mounts.
      emitGhostTypeStart(p.form);
      // Navigate. Screens read the pending payload in their own
      // useEffect via consumePendingFillForm.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(route as any);
    });
    return unsub;
  }, [router]);

  return null;
}
