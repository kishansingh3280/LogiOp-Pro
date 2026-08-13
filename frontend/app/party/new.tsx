/**
 * /party/new — Full-page Add Party form (Phase 3 · Fix 3c).
 */
import { PartyForm } from "@/src/components/party-form";

export default function NewPartyScreen() {
  return (
    <PartyForm
      title="Add Party"
      subtitle="Create a new customer, carrier or supplier"
      submitLabel="Save Party"
    />
  );
}
