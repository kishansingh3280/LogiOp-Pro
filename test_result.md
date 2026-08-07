#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Migrate the frontend Bullion module (Carrier trips, bullion transactions, and
  global carrier rates) to use the new `/api/bullion/*` MongoDB-backed endpoints
  exposed by the local FastAPI server. Previously the module wrote to
  AsyncStorage only; now the Wingman AI gateway needs to see and mutate the
  same data via REST. Also expand the backend Bullion Pydantic models so all
  richer frontend fields (currency_amount, gold_amount, purchase_rate_inr,
  exchange_rate_thb, gold_unit, gold_purchase_thb, gold_sale_inr, txn_no,
  ledger_entry_id, airline_code, flight_number, available_weight_kg,
  carrier_party_id, etc.) are preserved end-to-end.

backend:
  - task: "Bullion backend endpoints expanded to accept the full frontend schema"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: |
          Expanded BullionTrip and BullionTransaction Pydantic models with all
          the fields the Expo frontend serializes (currency_amount, gold_amount,
          purchase_rate_inr, exchange_rate_thb, transfer_rate_inr_per_thb,
          gold_unit, gold_purchase_thb, gold_cost_inr, gold_sale_inr,
          ledger_entry_id, ledger_posted_at, airline_code, flight_number,
          available_weight_kg, carrier_party_id, txn_no) plus a Config with
          extra="allow" so future fields pass through unchanged. Added auto
          TXN-### number assignment when txn_no is absent, and legacy
          available_slots → available_weight_kg fallback on trip create. Smoke
          tested by curl (POST trip, POST txn, DELETE both) and by the UI
          migration path (see below) — everything returned the expected fields
          without loss.

frontend:
  - task: "Bullion store migrated from AsyncStorage to /api/bullion/* REST"
    implemented: true
    working: true
    file: "frontend/src/bullion/store.ts, frontend/src/bullion/rates.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: |
          Rewrote src/bullion/store.ts and src/bullion/rates.ts to use apiGet/
          apiPost/apiPut/apiDelete against /api/bullion/{trips,transactions,rates}
          while keeping the exact same public API (useTrips, useTxns, useRates,
          createTrip/updateTrip/deleteTrip, createTxn/updateTxn/deleteTxn,
          setRates). Added a one-time migration step: when the backend list is
          empty and legacy AsyncStorage data exists, we push it up on the first
          load, then flip the MIGRATION_KEY so it never runs again. Verified
          end-to-end by loading the Bullion tab — the pre-existing AsyncStorage
          trip auto-migrated up ("Rahul HandCarrier · TG-317 · 20 kg free") and
          a POST /api/bullion/transactions from the terminal appeared on the
          UI as TXN-002 without a refresh gesture (proving Wingman-created
          entries will now surface natively).

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 16
  run_ui: false

test_plan:
  current_focus:
    - "Bullion backend endpoints expanded to accept the full frontend schema"
    - "Bullion store migrated from AsyncStorage to /api/bullion/* REST"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Migrated the Bullion module frontend to use the backend REST endpoints
      instead of AsyncStorage. Backend Pydantic models were expanded to accept
      the full frontend field set and to auto-assign TXN numbers. Please
      run the backend smoke tests for /api/bullion/{trips,transactions,rates}
      (create, list, update, delete, round-trip field preservation, txn_no
      auto-numbering when omitted) and verify Wingman-style POSTs also
      succeed. Frontend UI already smoke-tested visually; testing agent should
      focus on the REST layer only for this iteration.

# --- Pre-publish full regression sweep (iteration 17) ---------------------
# Since iteration 16 the following work has landed on top of Bullion migration:
#   1. Invoice /new form:
#      - Save button uses toast feedback + robust router fallback
#        (router.canGoBack -> router.replace(/invoice/{id}))
#      - Description input is now an autocomplete: type to filter catalog
#        by name+tags; suggestions dropdown renders inline; "Browse all
#        items" opens full picker sheet.
#   2. Invoice /invoice/[id]:
#      - When invoice is linked to a shipment, "Create shipment" CTA is
#        hidden and a rich LinkedShipmentCard is shown with Edit / Open
#        CTAs (data pulled from /api/shipments/{id} + /bags).
#      - Removed the placeholder "Linked shipment: Yes" KV row.
#   3. Shipment /shipment/[id]:
#      - Timeline gains an "Invoice INV-XXX" row (lime dot + chevron)
#        when a linked invoice exists (tappable -> invoice detail).
#      - New LinkedInvoiceCard mirroring the invoice's LinkedShipmentCard.
#      - Existing "Generate Invoice" already swaps to "Open invoice X"
#        pill when linked (regression-verify only).
#   4. Shipment /shipment/new (invoice-driven distribution):
#      - When ?fromInvoice=X is present, invoice items become a
#        distribution pool. Panel shows per-item allocated/target/remaining
#        with a progress bar and an "Allocate" affordance that opens a
#        bottom sheet asking qty + which bag (with a "New bag" chip and a
#        "Max" button). Sheet stays open with remaining pre-filled so the
#        operator can chain 30+70 without reopening.
#   5. Party /party/new:
#      - Rate field label swaps based on role: "Default shipping rate"
#        for customer/end_customer/etc., "Default carrying rate" for
#        carrier. Hint text also swaps.
#      - New Coordinates field: single text input that auto-parses:
#         * "lat, lng" or "lat,lng" pairs
#         * Google Maps @lat,lng URL (place / @-format)
#         * ?q=lat,lng URLs
#        With a "Paste" chip that reads clipboard on web.
#      - lat / lng persisted to Party (backend already supports them).
#   6. Bullion (per-txn rate freeze + history):
#      - New txns snapshot the live rates onto rate_snapshot_currency_per_1000
#        + rate_snapshot_gold_per_baht + rate_snapshot_at at creation.
#      - computeCarrierCharge prefers the snapshot when present, so
#        historical entries never move if global rates are edited later.
#      - New endpoint GET /api/bullion/rates/history (newest first).
#      - PUT /api/bullion/rates records prev/next diff into
#        bullion_rate_history when any tracked field changes.
#      - Bullion tab -> Edit rates modal has EDIT | HISTORY tabs;
#        history view shows a lime-dotted timeline of changes with
#        source pill (app/wingman) and strikethrough → new value.
#   7. Shipment detail per-bag Book Lalamove button (visible only when
#      status is warehouse_arrived AND end_customer has both phone + coords).
#
# The user is about to publish and asked for a full backend + frontend
# tie-in regression. iteration_17 should exercise every task listed above
# end-to-end and file a pass/fail per feature.

backend:
  - task: "Bullion rate history log + snapshot freeze"
    implemented: true
    working: true
    file: "backend/server.py, frontend/src/bullion/types.ts, frontend/src/bullion/rates.ts, frontend/app/(tabs)/bullion.tsx, frontend/app/bullion/txn/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Please verify: PUT /api/bullion/rates records prev/next diff into
          bullion_rate_history only when a tracked field (currency/gold/hand_carry)
          actually changes; GET /api/bullion/rates/history returns newest-first
          entries with the correct diffs shape { from, to } and the source /
          changed_by fields propagate through; a rate-only PUT with the same
          value does NOT create a new history row (no-op guard). Also spot-check
          that after creating a new bullion transaction, the returned row
          contains rate_snapshot_currency_per_1000, rate_snapshot_gold_per_baht
          and rate_snapshot_at (frontend now sends these on create).
      - working: true
        agent: "testing"
        comment: |
          Iteration 17: 6/6 backend tests PASS (test_bullion_rate_history.py).
          Verified: (1) POST /api/bullion/transactions round-trips all four
          rate_snapshot_* fields verbatim via extra='allow'; (2) PUT rates with
          real change (+7 on currency) writes exactly one bullion_rate_history
          row with diffs.currency_rate_per_1000 = { from: <old>, to: <new> },
          source='app', changed_by='TEST_iter17'; (3) SAME-value PUT is a true
          no-op — history row count unchanged; (4) history is ordered
          newest-first by timestamp; (5) untouched keys are omitted from
          diffs. iter-16 regression suite (13/13) also re-run and green.
          Report: /app/test_reports/iteration_17.json.

frontend:
  - task: "Invoice form (new): toast validation, autocomplete, save→detail nav"
    implemented: true
    working: true
    file: "frontend/app/invoice/new.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          - Save with an empty number MUST show the yellow toast
            'Invoice number is required' and NOT navigate away.
          - Filled Save MUST land on /invoice/{savedId} detail page.
          - Description input MUST show a dropdown of matching items on focus
            AND filter by tags (typing "cot" surfaces Cotton-tagged items).
          - Picking a suggestion fills description + rate + item_id.
          - "Browse all items" opens the full-list PickerSheet fallback.

  - task: "Invoice detail: LinkedShipmentCard when shipment_id present"
    implemented: true
    working: true
    file: "frontend/app/invoice/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Verify on INV-009 (linked to SE/098/01):
          - "Create shipment from this invoice" CTA is hidden.
          - LinkedShipmentCard shows consignment number, route,
            status pill, Bags/Weight/Freight stats, bag preview, and
            Edit / Open CTAs.
          - Verify on INV-1002 (unlinked): the "Create shipment"
            lime CTA still renders as before.

  - task: "Shipment detail: Timeline invoice row + LinkedInvoiceCard"
    implemented: true
    working: true
    file: "frontend/app/shipment/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Verify on SE/098/01 (has linked INV-009):
          - A new tappable Timeline row 'Invoice INV-009' appears between
            'Created' and 'Dispatched' with a lime dot and chevron.
          - A LinkedInvoiceCard is rendered right after the Timeline with
            eyebrow, number, date + line count, status pill, subtotal / tax
            / total, and "Open invoice" CTA that navigates to /invoice/id.
          - "Generate Invoice" button remains hidden (existing behaviour).

  - task: "Shipment /new invoice-driven bag distribution"
    implemented: true
    working: "NA"
    file: "frontend/app/shipment/new.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          When /shipment/new?fromInvoice=<id> is opened for an invoice with
          multiple items (create a test invoice with 100 Bedsheets + 50
          Cushion Cover + 25 Handloom scarf if needed):
          - "Invoice items to distribute" panel appears above the bag
            rows.
          - Each item has a progress bar with allocated/target counters
            and a lime + button (disabled + green tick when fully allocated).
          - Tapping + opens a sheet with:
              * Qty input pre-filled to the remaining amount
              * "Max" chip
              * Horizontal row of bag chips + "New bag" pill
              * Cancel / Allocate CTAs
          - Allocate must sum into the target bag (dedup by item_id or
            name+unit) and re-open with the fresh remaining until 0.

  - task: "Party form: role-aware rate label + coordinates paste"
    implemented: true
    working: true
    file: "frontend/app/party/new.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          - Switching role between Main Party / End Customer / Supplier /
            Vendor / Other must keep the label reading
            'Default shipping rate (CCY per kg)'.
          - Switching to Carrier must swap the label to
            'Default carrying rate (CCY per kg)' and update the hint copy.
          - Coordinates field must parse:
              * "13.7563, 100.5018"
              * "https://www.google.com/maps/@13.7563,100.5018,15z"
              * "https://maps.google.com/?q=13.7563,100.5018"
            and reveal a lime lat/lng pill under the input with a X clear
            button. Garbage input should NOT populate lat/lng.
          - On Save the payload must include lat + lng (or null when empty).

  - task: "Bullion Edit rates modal: EDIT | HISTORY tabs + snapshot freeze"
    implemented: true
    working: true
    file: "frontend/app/(tabs)/bullion.tsx, frontend/src/bullion/rates.ts"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          - Edit rates modal shows two segmented tabs (Edit / History).
          - History tab lazy-loads on first open and renders a lime-dotted
            timeline with source pill and strikethrough diffs.
          - Existing txns keep their computed carrier charge stable when
            rates change (visible on the trades list). New txns freeze.

metadata:
  created_by: "main_agent"
  version: "3.0"
  test_sequence: 17
  run_ui: true

test_plan:
  current_focus:
    - "Bullion rate history log + snapshot freeze"
    - "Invoice form (new): toast validation, autocomplete, save→detail nav"
    - "Invoice detail: LinkedShipmentCard when shipment_id present"
    - "Shipment detail: Timeline invoice row + LinkedInvoiceCard"
    - "Shipment /new invoice-driven bag distribution"
    - "Party form: role-aware rate label + coordinates paste"
    - "Bullion Edit rates modal: EDIT | HISTORY tabs + snapshot freeze"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Pre-publish full regression sweep. User is about to publish, so please
      exercise every task in current_focus end-to-end (both backend REST +
      frontend UI). Preferred preview URL:
      https://native-logistics-hub.preview.emergentagent.com/
      Backend base URL for direct API tests:
      https://native-logistics-hub.preview.emergentagent.com/api
      No auth is required. Existing test data on the live DB includes
      INV-009 (linked to SE/098/01), INV-1002 (unlinked), SE/098/01 with 3
      bags. Feel free to create+cleanup additional records as needed
      (create a 3-item invoice for the distribution test).
      Also please spot-check response times — the operator has flagged
      "everything works absolutely fine and fast" as the bar. Anything
      over 2s for a single API call or > 5s for a screen render should be
      called out.
  - agent: "testing"
    message: |
      Iteration 17 complete. Backend: 19/19 tests PASS
      (test_bullion_rate_history.py 6/6 NEW + test_bullion_endpoints.py
      13/13 regression). Rate history diff/no-op guard confirmed; txn
      rate_snapshot_* fields round-trip. Frontend UI verified on the
      preview URL for all 6 non-distribution focus tasks:
        - /invoice/new: empty-save toast + full-save redirect to detail;
          autocomplete filters 6→3 on 'cot'; Browse all items pill present.
        - INV-009 (linked): no Create-shipment CTA; LinkedShipmentCard
          with edit-linked-shipment / open-linked-shipment testIDs.
        - INV-1002 (unlinked): Create-shipment CTA still rendered.
        - Shipment SE/098/01: Timeline shows Invoice INV-009 row;
          Generate Invoice hidden; LinkedInvoiceCard shows ฿30,000 total;
          'Open invoice INV-009' pill visible.
        - Party /new: Default-shipping-rate label swaps to
          Default-carrying-rate on Carrier; coord parser accepts pair +
          @lat,lng URL, rejects garbage.
        - Bullion Edit rates modal: EDIT|HISTORY tabs with diff arrows
          and source pills.
      Distribution flow (/shipment/new?fromInvoice) NOT deep-driven — code
      looked correct on read; recommend main-agent self-test of the
      Allocate sheet 30+70 split before publish or a follow-up iteration.
      Performance: all sampled endpoints <500ms (fastest 87ms). Test data
      created (1 invoice, 1 txn) cleaned up. Only action items are missing
      testIDs on invoice/new + party/new (flagged in report). Report:
      /app/test_reports/iteration_17.json

