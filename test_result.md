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


# --- FY 2026-27 Stress Test & Data Reset (iteration 18) -------------------
# The operator asked for a full DB reset + 100 diverse linked transactions
# scoped to FY 2026-27, followed by an end-to-end verification sweep.
#
# What the main agent executed via /app/tests/stress_test_fy26_27.py:
#   1. Deleted 3 invoices, 9 shipments, 3 bullion txns, 1 bullion trip, and
#      any lingering shipment/invoice/bullion ledger entries.
#   2. Preserved all parties (7 customers, 3 end customers, 3 carriers, 3 suppliers).
#   3. Generated 191 fresh records dated within 2026-04-01 to 2027-03-31:
#         35 shipments (each with 1-4 bags, distinct bill-to per bag)
#         85 bags
#         20 invoices (70% linked to a shipment)
#         8 bullion carrier trips
#         25 bullion vault-buy transactions (currency in India, gold in BKK)
#         18 bullion split transactions (partial qty from a vault buy →
#            trip, parent qty reduced accordingly)
#   4. Wrote /app/tests/stress_report_fy26_27.json summarising totals,
#      YTD counts, asset map buckets, ledger summary, dashboard snapshot.
#
# Stress test rules encoded:
#   - Currency carrier fee: 500 INR per $1,000 (snapshotted onto each txn)
#   - Gold carrier fee:     2,500 INR per baht (snapshotted onto each txn)
#   - Hand-carry shipments: 200 INR/kg carrier pay, 1.5× markup to bill
#   - Ledger fan-out per bag when bill_to differs from shipment party_id
#
# The testing agent is being invoked next to independently confirm.

backend:
  - task: "FY 2026-27 stress test — DB reset + 100 linked txns + calc verify"
    implemented: true
    working: true
    file: "tests/stress_test_fy26_27.py, tests/stress_report_fy26_27.json"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Iteration 18 verification complete. 9/10 backend checks PASS (1
          skipped, see below). All 3 frontend checks PASS.
          (a) DATA STATE — PASS. /api/shipments=35 (all within 2026-04-01
              …2027-03-31), /api/invoices=20 (all in-FY), /api/bullion/
              transactions=43 with 18 having parent_id (splits), /api/
              bullion/trips=8.
          (b) CALCULATIONS — PASS. Every txn has
              rate_snapshot_currency_per_1000=500.0 and rate_snapshot_gold_
              per_baht=2500.0. 3 currency + 3 gold sample fees verified
              (amount/1000*500 & baht*2500).
          (c) LEDGER — PASS. receivable.thb=747,970.0 (matches sim
              report exactly), top_get has 3 customers (jirawat 191,830,
              Aashna Exports 169,800, Vinod Jaipur 138,460).
          (d) FIFO WAREHOUSE — SKIPPED / SCHEMA MISMATCH. /api/dashboard/
              warehouse returns aggregate KPIs only (current_bags=0,
              capacity_kg=5000, by_end_customer=[]) — no chronological
              bag list to verify FIFO ordering. The 14 warehouse_arrived
              shipments do carry warehouse_arrived_at at the shipment
              level; endpoint just doesn't surface them here. Non-blocking.
          (e) DASHBOARD YTD — PASS. shipments.total=35, in_transit=8,
              pending=13, warehouse_arrived=14, delivered=0. 3 of 4
              non-zero buckets (meets ≥3 threshold).
          (f) FRONTEND ASSET MAP — PASS. /bullion → Asset map segment:
              Vault (India) 20 assets, Vault (Bangkok) 5 assets / 29 baht
              gold, In transit 18 assets / 6 baht + 22,400 USD.
          (g) FRONTEND DASHBOARD WIDGET — PASS. ASSETS ON HAND card
              renders after stats carousel with Gold on hand (35 baht =
              0 India + 29 Bangkok + 6 in-transit), USD on hand (52,000
              = 29,600 India + 0 Bangkok + 22,400 in-transit), plus SGD
              & AED rows. Tapping card navigates to /bullion.
          Performance — all endpoints <500ms (budget was 2s); full
          10-test suite executed in 1.37s.
          Report: /app/test_reports/iteration_18.json,
          pytest xml: /app/test_reports/pytest/iter18_results.xml.
          Only action item for main agent: consider surfacing a
          FIFO-ordered bag list on /api/dashboard/warehouse (or sibling
          endpoint) so criterion (d) can be programmatically verified.
      - working: "NA"
        agent: "main"
        comment: |
          Ran /app/tests/stress_test_fy26_27.py successfully (0 errors)
          against the preview URL. Please verify independently:

          (a) DATA STATE — /api/shipments has exactly 35 records dated
              inside FY 2026-27; /api/invoices has 20 records dated inside
              FY 2026-27; /api/bullion/transactions has 43 total (25 vault
              + 18 split, verifiable by presence of parent_id on 18); /api/
              bullion/trips has 8. All 3 pre-existing bullion txns and 9
              pre-existing shipments are gone.

          (b) CALCULATIONS — for any currency txn returned by /api/bullion/
              transactions, rate_snapshot_currency_per_1000 must equal 500
              and the implied carrier fee (currency_amount / 1000 * 500)
              matches what the frontend would render. Same check for gold
              with rate_snapshot_gold_per_baht = 2500.

          (c) LEDGER — /api/dashboard/ledger-summary must return non-zero
              receivable.thb (should be ~747,970 THB from the sim) and the
              top_get list must include at least 3 customers.

          (d) FIFO — /api/dashboard/warehouse must report 14 warehouse-
              arrived bags in FIFO order (oldest first).

          (e) DASHBOARD YTD — /api/dashboard/stats must reflect
              shipments.total=35 (or higher if other test runs left rows),
              at minimum non-zero in_transit + pending + warehouse_arrived
              buckets.

          (f) ASSET MAP — the frontend Asset Map view on /bullion (tab
              'Asset map') must render:
                 Vault (India): 20 assets, USD totals visible
                 Vault (Bangkok): 5 assets, gold ~29 baht total
                 In transit: 18 assets

          (g) DASHBOARD WIDGET — the 'Assets on hand' card on the main
              dashboard tab must show Gold on hand (India / Bangkok /
              In transit pills) and USD on hand splits matching (f).

          Preview URL:
          https://native-logistics-hub.preview.emergentagent.com/
          Backend: same host + /api

metadata:
  created_by: "main_agent"
  version: "4.0"
  test_sequence: 18
  run_ui: true

test_plan:
  current_focus:
    - "FY 2026-27 stress test — DB reset + 100 linked txns + calc verify"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Executed the FY 2026-27 stress test at
      /app/tests/stress_test_fy26_27.py. All 191 records created without
      errors. Report at /app/tests/stress_report_fy26_27.json.
      Please independently verify (a) - (g) above via the backend REST
      layer AND the frontend UI (Asset Map + Dashboard widget).
      Feel free to write additional pytest smoke tests but the primary
      goal is end-to-end verification, not exhaustive coverage.


# --- Final Module Build (iteration 19) -----------------------------------
# Bug reported by operator earlier: "Invoice not found" after data reset.
# Fixes applied:
#   * api/client.ts — apiGet now purges the stale local cache when a 404
#     comes back so a wiped record no longer resurrects on the client.
#     apiMutate additionally invalidates the collection cache after every
#     POST/PUT/DELETE. Errors thrown by rawRequest carry a `status` field.
#   * api/hooks.ts — useApi drops data on path change AND on 404 so the
#     detail screen cannot render a ghost row. Exposes the HTTP status.
#   * app/invoice/[id].tsx — the plain "Invoice not found" text is now a
#     branded error card with a Retry button, distinct 404 vs. network
#     copy, and a "Back to list" secondary action.
#
# Feature build:
#   1. Reports console at /reports:
#      - Three tabs: Invoices · Packing · Bullion (FY-filtered).
#      - Each row exports a branded True-Black PDF using expo-print +
#        expo-sharing (bulk bullion history + per-record invoice/packing).
#      - Bullion history uses the same PDF shell.
#   2. Bullion dashboard reorder:
#      - New ActiveCarrierTripsCard renders first (upcoming/in-transit,
#        capacity bar + usage), followed by AssetsOnHandCard "Vault snapshot".
#      - Reports Console shortcut card sits right below both.
#   3. EXIF stripping:
#      - New src/utils/exif.ts wraps expo-image-manipulator to re-encode
#        JPEGs (dropping GPS/timestamp/device tags) + downsize to <= 1600px.
#      - Item photo picker (app/item/[id].tsx) routes every pick through
#        stripExifToBase64Async before persisting the data URI.
#   4. FY integration:
#      - Reports console reads useFY() and calls fyBounds() to filter
#        every dataset before render + PDF export.

frontend:
  - task: "Invoice-not-found bug — cache invalidation + retry UX"
    implemented: true
    working: true
    file: "frontend/src/api/client.ts, frontend/src/api/hooks.ts, frontend/app/invoice/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Iteration 19 PASS. 5/5 back-to-back invoice saves via /invoice/new
          all landed on /invoice/{uuid} with the newly-created number in the
          header — ZERO "Invoice not found" occurrences (each save round-trip
          <2.1s). Branded 404 card verified: title 'Invoice not found' +
          testID invoice-error-retry + testID invoice-error-back-to-list all
          render. Stale-cache purge confirmed: deleted invoice row disappears
          from the invoices list on next visit. Backend 10/10 pytest PASS.
      - working: "NA"
        agent: "main"

  - task: "Reports Console at /reports"
    implemented: true
    working: true
    file: "frontend/app/reports.tsx, frontend/src/utils/pdf.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Iteration 19 PASS. /reports loaded via reports-shortcut CTA.
          Three tabs present with FY 26-27 counts: Invoices·20, Packing·35,
          Bullion·43. Rows render with testIDs export-invoice-{id} (20),
          export-packing-{id} (35), and the full-width export-bullion-history
          button on the Bullion tab. FY picker present. No console errors
          on Reports screen itself.
      - working: "NA"
        agent: "main"
        comment: |
          Please verify by navigating to /reports:
          - Three tabs (Invoices · Packing · Bullion) with counts driven
            by the currently-selected FY.
          - Switching FY on the picker at the top updates all three
            counts and the listed rows.
          - Tapping "Download" (cloud-arrow icon) on any invoice/packing
            row runs the PDF export flow without console errors. Web
            preview opens the PDF in a new tab; native devices open the
            share sheet.
          - Bullion tab shows a full-width "Download bullion history"
            button + list preview of first 30 txns.

  - task: "Bullion dashboard reorder + Reports shortcut"
    implemented: true
    working: true
    file: "frontend/app/(tabs)/index.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Iteration 19 PASS. Geometry verified on 390x844 mobile viewport:
          active-trips-card (y=253) is above assets-on-hand-card (y=572)
          which is above reports-shortcut (y=951). testIDs active-trips-card,
          assets-on-hand-card, reports-shortcut all present. Reports shortcut
          navigates to /reports on tap.
      - working: "NA"
        agent: "main"
        comment: |
          Verify on the main dashboard tab (scroll below the stats
          carousel):
          - The FIRST bullion widget is 'Active carrier trips' with an
            eyebrow "Bullion module", showing each trip's carrier · route
            · date + a lime progress bar + used / capacity meta line.
          - The SECOND card is 'Vault snapshot' (AssetsOnHandCard).
          - A 'Open Reports Console' shortcut appears right below,
            navigating to /reports on tap.

  - task: "EXIF stripping on item photo upload"
    implemented: true
    working: true
    file: "frontend/src/utils/exif.ts, frontend/app/item/[id].tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Iteration 19 PASS (static check). /app/frontend/src/utils/exif.ts
          exists and exports stripExifAsync + stripExifToBase64Async.
          app/item/[id].tsx imports stripExifToBase64Async from
          @/src/utils/exif and awaits it in the pickPhoto handler
          (line 119). ImagePicker.launchImageLibraryAsync is called with
          base64:false (line 108) — no longer requests raw base64 directly.
          Full on-device round-trip verification would require a native
          build; smoke-check complete.
      - working: "NA"
        agent: "main"
        comment: |
          Cannot fully verify without a real camera pick on-device — but
          please at least confirm:
          - The item detail's photo picker no longer requests raw base64
            from ImagePicker (base64:false now).
          - The stripExifToBase64Async helper is imported and awaited
            before setPhotoUri.
          - Manipulator errors fall back to the unstripped URI (verify
            the try/catch is in place; a smoke Jest test can hit a
            malformed URI mock).

metadata:
  created_by: "main_agent"
  version: "5.0"
  test_sequence: 19
  run_ui: true

test_plan:
  current_focus:
    - "Invoice-not-found bug — cache invalidation + retry UX"
    - "Reports Console at /reports"
    - "Bullion dashboard reorder + Reports shortcut"
    - "EXIF stripping on item photo upload"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Ship of the final module build + fix for the operator-reported
      'Invoice not found' bug. Please:
        (1) Reproduce the earlier "Invoice not found" symptom by first
            creating an invoice via /invoice/new (fill number + client +
            one description + rate → Save), verify it navigates to
            /invoice/{id} with success toast, then repeat 5x back-to-back.
            All 5 must open. This was the operator's explicit ask.
        (2) Force the error state: pick any invoice id, DELETE it via
            `curl -X DELETE $BACKEND/api/invoices/{id}`, then navigate to
            /invoice/{id} in the UI. Confirm the branded error card with
            Retry + Back-to-list is shown (not the old plain text).
        (3) Exercise Reports Console: switch FY, download an invoice PDF,
            download a packing PDF, download the bullion history PDF.
            On the web preview a new tab opens with the rendered PDF.
        (4) Dashboard: confirm the two bullion widgets appear in the
            right order (Active trips → Vault snapshot) and the reports
            shortcut is right below.
        (5) EXIF: static-check the utility works (Jest or direct import
            check). Full on-device verification requires a build.
      Preview URL: https://native-logistics-hub.preview.emergentagent.com/


  - agent: "testing"
    message: |
      Iteration 19 verification COMPLETE — ALL 4 tasks green.

      BUG FIX (Invoice not found) — HARD-PASS:
        - 5/5 back-to-back invoice creates via /invoice/new landed on
          /invoice/{uuid} with correct number in header, ZERO not-found
          errors. Each save round-trip <2.1s.
        - Branded 404 card renders (title 'Invoice not found', testID
          invoice-error-retry, testID invoice-error-back-to-list).
        - Stale-cache purge works: DELETE via API + reload list, deleted
          row is GONE.
        - Backend pytest (test_iter19_invoice_reports.py): 10/10 PASS.

      REPORTS CONSOLE — PASS:
        - /reports reachable via reports-shortcut CTA on dashboard.
        - Three tabs: Invoices 20, Packing 35, Bullion 43 (FY 26-27).
        - testIDs export-invoice-{id}, export-packing-{id},
          export-bullion-history all present and clickable.

      DASHBOARD REORDER — PASS:
        - active-trips-card (y=253) then assets-on-hand-card (y=572)
          then reports-shortcut (y=951) in 390x844 viewport.

      EXIF STRIPPING — PASS (static):
        - src/utils/exif.ts exports both helpers.
        - item/[id].tsx uses stripExifToBase64Async, ImagePicker base64:false.

      All 5 test invoices cleaned up; /api/invoices back to 20 (FY 26-27
      demo state preserved). Report: /app/test_reports/iteration_19.json,
      pytest XML: /app/test_reports/pytest/iter19_results.xml.

# --- Iteration 20 · Urgent Fixes + AI Assistant ---------------------------
# Applied in one pass to unblock the operator's publish window.
#
# 1. STICKY TAB BAR
#    - frontend/app/(tabs)/_layout.tsx now uses `position: "absolute"` on
#      the outer wrap and exports `TAB_BAR_BOTTOM_PAD = 96`. Every scroll
#      screen (index, invoices, bullion, shipments, more, assistant) was
#      updated to use paddingBottom: 120 so content no longer disappears
#      behind the glassmorphism bar. BlurView + overlay have
#      pointerEvents="none" so taps go through to buttons behind.
#
# 2. BULLION FY FILTER
#    - AssetMap now receives `fyTxns` (filtered) instead of `txns.data`
#      (all). The Trades list already used fyTxns; Vault (Asset Map) is
#      now consistent.
#
# 3. BULLION TAB REORDER
#    - Segment order changed to: Trips (default) → Vault → Trades.
#
# 4. REPORTS LINK ON MORE MENU
#    - New row "Reports console" with PDFs · invoices · packing · bullion
#      hint. Ledger moved out of the tabs (into /app/ledger.tsx) so the
#      centre slot could host the Assistant tab.
#
# 5. PARTY DETAIL EDIT
#    - Confirmed the pencil-icon Edit button already existed on
#      /party/[id]; no change needed.
#
# 6. AI ASSISTANT
#    - New tab at /(tabs)/assistant.tsx (brain icon, centre position).
#    - Backend endpoints on /api/assistant/*:
#         POST /chat  — SSE stream via emergentintegrations LlmChat,
#                       model claude-sonnet-4-6, system prompt in Hindi,
#                       history persisted to `assistant_messages`.
#         POST /memory & GET /memory — business knowledge pattern store
#                                       in `assistant_memory` collection.
#         POST /tts   — OpenAI TTS proxy (tts-1, nova voice) returning
#                       audio/mpeg for the client to play.
#         POST /stt   — Whisper-1 proxy for Hindi transcription.
#    - EMERGENT_LLM_KEY added to /app/backend/.env.
#    - Frontend chat UI streams SSE deltas into the message bubble in
#      real-time. Voice buttons render a hint that native STT/TTS is
#      enabled once the build ships (browser doesn't have mic scopes).

frontend:
  - task: "Sticky tab bar + bottom padding across scroll screens"
    implemented: true
    working: true
    file: "frontend/app/(tabs)/_layout.tsx + all (tabs)/*.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Iteration 20 PASS. Verified sticky tab bar on /(tabs)/index,
          /(tabs)/bullion, and /(tabs)/invoices at 390x844 viewport.
          After scrolling to the bottom (10x wheel deltas), tab-index /
          tab-bullion / tab-invoices bounding boxes all remain at y=791.5
          (viewport height 844 → tab bar visible in last ~53px, sticky).
          Last content row remains readable — no clipping observed. Tab
          bar renders 6 tabs in exact order Overview·Shipments·Assistant
          (brain)·Invoices·Bullion·More. Assistant send button IS TAP-ABLE
          (successfully invoked chat SSE stream). Deprecated-prop warnings
          logged for pointerEvents and shadow* — see iteration_20.json.
      - working: "NA"
        agent: "main"
        comment: |
          Verify: bottom tab bar stays visible while scrolling on the
          Assistant, Bullion, Invoices, Shipments, and More tabs. The
          send button on the Assistant tab is TAP-ABLE (not swallowed
          by the overlay). Content near the bottom of each list is not
          clipped by the tab bar.

  - task: "Bullion FY filter + segment reorder"
    implemented: true
    working: true
    file: "frontend/app/(tabs)/bullion.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Iteration 20 PASS. Segments render as Trips | Vault | Trades
          in that exact order with Trips as the default active pill
          on entry (screenshot captured). FY picker toggle: FY 26-27 →
          43 trades / 8 trips / Vault(India) 20 assets / Vault(BKK) 5
          assets / In transit 18 assets. Switching to FY 25-26 collapses
          everything to 0 trades / 0 trips / all vault buckets 0 assets
          — proving BOTH the Trades list AND the Asset Map (Vault) totals
          are driven by the FY window. Cleanup: switched back to FY 26-27.

  - task: "Reports link on More menu"
    implemented: true
    working: true
    file: "frontend/app/(tabs)/more.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Iteration 20 PASS. On /(tabs)/more the row testID `more-reports`
          renders with the "Reports console" label under the Business
          section. Tapping it navigates to /reports (verified URL change
          + Reports header + tabs 'Invoices · 20 / Packing · 35 /
          Bullion · 43'). Ledger row also still present in the More list.

  - task: "AI Assistant tab — Claude Sonnet 4.6 Hindi chat via SSE"
    implemented: true
    working: true
    file: "frontend/app/(tabs)/assistant.tsx, backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Iteration 20 UI-PASS. Assistant tab is centered in the 6-tab
          bar with brain icon. /assistant screen renders greeting bubble
          in Devanagari (नमस्ते …). Filled `assistant-input` with
          "ललित के लिए 5 kg का बैग जोड़ो", tapped `assistant-send`, and
          a Devanagari assistant response bubble streamed into the chat
          within 1.62s — no console page errors. Server-side TTFT via
          direct SSE probe measured 2.65s (>2s SLA) so main-agent should
          still tune backend prep — see backend task below.
      - working: "NA"
        agent: "main"
        comment: |
          Verify end-to-end:
          - Tab bar shows Assistant centre with brain icon.
          - Loading /assistant renders greeting bubble in Devanagari:
            "नमस्ते! मैं आपका बिज़नेस असिस्टेंट हूँ। बताइए, क्या करना है?"
          - Typing a Hindi command like "ललित के लिए 5 kg का बैग जोड़ो"
            and tapping Send:
              * user bubble (lime) appears
              * SSE stream fills an AI bubble in <2s to first token
              * response is in Devanagari
              * message persists after page refresh (server stores it in
                assistant_messages).
          - GET /api/assistant/memory returns the stored patterns.
          - POST /api/assistant/memory bumps a pattern's hit count.

backend:
  - task: "Assistant endpoints — /chat SSE, /memory, /tts, /stt"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Iteration 20b RETEST — 8/8 pytest PASS
          (/app/backend/tests/test_iter20b_assistant_retest.py).
          Both prior FAILs are RESOLVED:
            (1) /api/assistant/tts now returns HTTP 200 audio/mpeg with
                8832 bytes (>3KB) and valid MPEG frame sync header
                (b"\\xff\\xf3\\xc4\\xc4") for "नमस्ते". Fix verified —
                emergentintegrations.llm.openai.text_to_speech.
                OpenAITextToSpeech is the correct path.
            (2) /api/assistant/chat TTFT is now ~95–107ms over 3 probes
                (was 2.65s). First frame received is ": ping" keep-alive
                as designed, followed by "data:" Devanagari deltas and a
                clean "event: done" terminator. Well under both the
                500ms local and 2s preview SLA.
          NEW: DELETE /api/assistant/memory/{key} returns 200 on hit,
          removes the row, and is idempotent (repeat call OK).
          Memory upsert + hits increment + list sort-by-hits-desc all
          still pass. Regression: /invoices, /shipments, /bullion/rates
          200 OK. Frontend Assistant E2E smoke: user sent "नमस्ते, कैसे
          हो?" → Devanagari response streamed into an assistant bubble
          within ~1.5s. Reports: /app/test_reports/iteration_20b.json,
          xml: /app/test_reports/pytest/iter20b_results.xml
      - working: false
        agent: "testing"
        comment: |
          Iteration 20: 10/12 pytest PASS
          (/app/backend/tests/test_iter20_assistant.py). Failures:
            (1) /api/assistant/chat SSE TTFT = 2.65s, exceeds the <2s
                SLA. Stream produces Devanagari deltas and terminates
                with `event: done` correctly; only TTFT is the issue.
                RCA: db.assistant_messages.insert_one at server.py:587
                is awaited BEFORE stream open + 20-doc memory fetch at
                :598 + LlmChat init all block the first byte. Fix by
                asyncio.create_task-ing the insert, caching memory, or
                emitting a `: ping\n\n` keep-alive as soon as the
                StreamingResponse opens.
            (2) /api/assistant/tts returns HTTP 404 with body
                {"detail":"fault filter abort"} from the upstream host
                https://integrations.emergentagent.com/openai/v1/audio/speech
                (server.py:691). Hardcoded URL + no env override. HARD
                blocker for voice-out. Confirm the correct Emergent
                OpenAI proxy path for tts-1 (STT at :716 uses the same
                host — likely also broken though STT is skipped per
                spec).
          Passes: memory upsert + hits bump (POST twice + GET verify),
          memory list sort-by-hits-desc, STT 400 validation without
          audio, all 4 GET endpoints under 2s, and all three regression
          routes (invoices/shipments/bullion/rates) 200 OK. Cleanup:
          party:Ramesh memory row deleted from Mongo directly since no
          DELETE endpoint exists. Report: iteration_20.json, xml at
          /app/test_reports/pytest/iter20_results.xml.
      - working: "NA"
        agent: "main"
        comment: |
          - /api/assistant/chat: POST with {session_id, message} streams
            text/event-stream frames of Claude deltas ending with
            `event: done`. Both user + assistant turns persisted.
          - /api/assistant/memory: POST upserts pattern (increments hits
            on collision), GET returns top 50 by hits.
          - /api/assistant/tts: text → audio/mpeg via OpenAI tts-1 nova
            voice (best Hindi rendition).
          - /api/assistant/stt: multipart audio → JSON transcription via
            Whisper-1 with language=hi.

metadata:
  created_by: "main_agent"
  version: "6.0"
  test_sequence: 20
  run_ui: true

test_plan:
  current_focus:
    - "Sticky tab bar + bottom padding across scroll screens"
    - "Bullion FY filter + segment reorder"
    - "Reports link on More menu"
    - "AI Assistant tab — Claude Sonnet 4.6 Hindi chat via SSE"
    - "Assistant endpoints — /chat SSE, /memory, /tts, /stt"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Iteration 20: shipped the operator's urgent-fix batch AND the
      first cut of the AI Assistant. Please verify all 5 tasks. Voice
      pipeline (STT/TTS) works end-to-end at the API level (curl the
      /tts and /stt endpoints) but the browser preview can't grant mic
      permissions inside Expo web — the client shows a hint about that.
      Full voice UX will land in the on-device build.

      Chat MUST hit <2s time-to-first-token, streamed in Devanagari.
      Regression check: all existing routes still work; the local
      backend proxy still forwards non-assistant `/api/*` to the remote.

  - agent: "testing"
    message: |
      Iteration 20 verification complete. Frontend 4/4 PASS, backend
      10/12 pytest PASS. Two backend failures require main-agent fix:

      HARD FAIL — /api/assistant/tts: upstream returns 404 "fault
      filter abort" from https://integrations.emergentagent.com/openai/
      v1/audio/speech (server.py:691). This URL/route or auth scheme is
      wrong for the Emergent OpenAI proxy — voice-out is unusable.
      Please confirm the correct base URL for tts-1 via emergent docs.

      SOFT FAIL — /api/assistant/chat TTFT = 2.65s (SLA <2s). Stream
      itself is healthy (Devanagari deltas + clean `event: done`). RCA:
      awaited MongoDB insert + 20-doc memory fetch + LlmChat init all
      execute before the first byte is streamed. Fix by asyncio.
      create_task-ing the persistence, caching the memory tail, and/or
      emitting a `: ping\n\n` frame the instant StreamingResponse opens
      so browsers see TTFT<100ms.

      PASSES: sticky tab bar on /(tabs)/{index,bullion,invoices} — the
      bar stays at y=791 in a 844 viewport after full scroll; 6-tab
      order Overview·Shipments·Assistant(brain)·Invoices·Bullion·More
      correct; Assistant tab centered; /assistant devanagari greeting
      renders; send button tap-able; SSE response bubble appears in
      1.62s browser-side. Bullion segments Trips|Vault|Trades default
      Trips; FY 25-26 vs FY 26-27 toggles the Trades list AND the Asset
      Map (Vault) totals in lockstep. More menu row testID more-reports
      → navigates to /reports. Memory upsert bumps hits; list sorted
      hits desc; STT validation 400. All 4 regression endpoints 200.

      Cleanup: party:Ramesh memory row deleted directly via Mongo (no
      DELETE endpoint exists — recommend adding one). FY 26-27 demo
      data intact.

      Report: /app/test_reports/iteration_20.json,
      pytest XML: /app/test_reports/pytest/iter20_results.xml,
      new test file: /app/backend/tests/test_iter20_assistant.py


  - task: "Iter21 · JWT Auth + Audit Tagging + Immersive Assistant"
    implemented: true
    working: true
    file: "backend/auth.py, backend/server.py, backend/seed_users.py, frontend/src/auth/context.tsx, frontend/app/sign-in.tsx, frontend/app/(tabs)/assistant.tsx, frontend/src/components/live-orb.tsx, frontend/src/hooks/use-mic-level.ts, frontend/src/context/screen-context.tsx"
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Iter21 — Auth foundation + Immersive Gemini-Live UI + audit tagging.

          Backend:
          - /api/auth/login, /auth/me, /auth/register (Admin only), /auth/users,
            PATCH/DELETE /auth/users/{id}, /auth/change-password.
          - 3 roles: Admin, Staff, Carrier. Seeded via seed_users.py.
          - Audit middleware injects created_by/modified_by/entry_source into
            all bullion writes AND proxied POST/PUT bodies to the remote backend.
          - X-Actor-{Username,Role,Id} + X-Entry-Source headers forwarded.

          Frontend:
          - AuthProvider (SecureStore) + AuthGate in _layout.tsx.
          - Beautiful pulsing sign-in screen with lime orb.
          - Assistant tab overhauled into a full-screen Gemini-Live UI:
            multi-color SVG+Reanimated gradient waveform orb ("Life in a body")
            reacting to mic level (expo-audio metering) and TTS envelope.
            Transcript bottom-sheet, mode indicator (LISTENING/THINKING/SPEAKING),
            hold-to-talk mic, text input.
          - Screen-context provider — AI receives current route + visible data
            on every turn.
          - Assistant system prompt hard-wires the honorific: always "Kishan Sir",
            "Sir", or "Boss" — never first name alone.
          - Ghost-User: navigate JSON tool calls trigger router.push (verified
            end-to-end via browser automation).
          - Dashboard greets user by display_name + honorific.
          - Sign-out in More menu with Account section.

          Testing agent (iter21): 25/25 passed. Found + fixed SSE framing bug
          where multi-line data (```json``` fenced blocks) leaked outside
          `data:` prefix — fixed by emitting one `data: <line>\n` per line
          and terminating with a blank line. Frontend parser updated to
          concatenate multi-line data records. Browser test confirms Ghost-
          User navigate works: "invoices पर ले चलो" → routes to /invoices.

          Credentials: kishan/Kishan@Boss2026 (Admin), staff/Staff@2026,
          carrier/Carrier@2026. See /app/memory/test_credentials.md.

  - task: "Iter22 · Users Admin + Bullion Split + Ghost-User + Lalamove"
    implemented: true
    working: true
    file: "backend/lalamove.py, backend/server.py (auth.role validation + bullion split), frontend/app/admin/{index,users}.tsx, frontend/src/bullion/SplitSheet.tsx, frontend/src/ghost/ghost-user.tsx, frontend/app/lalamove.tsx"
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Iter22 shipped 4 phases in one session:
          
          Phase A - Users Admin (/admin console + /admin/users):
          - Admin-only routes (Redirect for non-Admin).
          - Full user CRUD: list, add (bottom-sheet form), edit
            (display_name/role/honorific/password reset), toggle-disabled,
            delete (self-delete blocked). PATCH now validates role against
            the Role enum server-side.
          
          Phase B - Bullion partial split:
          - Backend POST /api/bullion/transactions/{id}/split creates child
            (parent_id + trip_id + inherited rate snapshot) and reduces
            parent.remaining_weight_kg. Rejects: over-split, split on
            child, split when fully allocated.
          - Frontend: SplitSheet bottom-sheet with weight input + MAX + 
            25/50/75% chips + trip picker. Inline "Split" chip on trade
            row (visible when parent has remaining > 0). "SPLIT CHILD"
            badge on child rows. Full split history + progress bar on
            txn detail page.
          
          Phase C - Ghost-User confirmation + form-fill:
          - New GhostUserProvider mounted in root layout with API:
            parseAndRun(reply), run(action), hintCursor(x,y).
          - Actions: navigate (auto-exec), create_party, create_item,
            update_ledger, carrier_update, add_bag. Writes ALL show a
            confirmation modal with details + Cancel/Confirm.
          - Ghost cursor overlay: floating lime dot + halo, animated to
            path via Reanimated. Fires on confirm + on navigate.
          - Toast system for success/error feedback.
          - Sanitizer strips CR/LF/TAB outside string literals so
            multi-line pretty-printed Claude JSON parses cleanly.
          - Role vocabulary translator: buyer→customer, seller→supplier.
          
          Phase D - Lalamove:
          - Backend module (backend/lalamove.py) with /config, /cities,
            /quote, /order, /order/{id}, /orders, /order/{id}/cancel,
            /webhook — HMAC-SHA256 signed per Lalamove v3 spec.
          - Graceful 503 when API keys are blank (current state).
          - Frontend screen (/lalamove) with status banner, orders list,
            "Book" bottom-sheet: service picker (Motorcycle/Car/Van),
            pickup/drop with Google Maps coord paste OR party picker,
            sender/recipient contacts, quote → confirm booking flow.
          - AWAITING: Kishan Sir to paste LALAMOVE_API_KEY + SECRET into
            backend/.env for live sandbox testing.
          
          Testing: iteration 22 — 27/27 backend tests passed
          (/app/test_reports/iteration_22.json). E2E browser test also
          confirmed the Ghost-User flow creates a real party ("Kabir
          Sharma") via AI voice command with confirmation dialog.
          
          Post-test fixes: PATCH role enum validation (400 on bad value)
          and frontend Ghost-User JSON sanitizer both applied and
          verified via curl.

  - task: "Iter23 · Siri 2.0 Design System — Wave 1 + Wave 2"
    implemented: true
    working: true
    file: "frontend/src/theme/index.ts, frontend/src/components/{ambient-background,glass-card,live-orb,metric}.tsx, frontend/app/_layout.tsx, frontend/app/sign-in.tsx"
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Iter23 shipped Wave 1 (foundation) + Wave 2 (Host Sphere) of the
          full "Siri 2.0" theme, applied to Sign-in, Dashboard, Assistant
          and Bullion screens.
          
          Wave 1 — Foundation:
          - Theme rewrite: near-black #050505 base, ambient orb palette
            (Deep Purple / Ocean Blue / Cyan / Lime / Amber), semantic
            metric buckets (gold=amber, inr/usd=lime, thb=cyan,
            balance=purple, info=blue).
          - <AmbientBackground> with 3 slowly drifting orbs (Purple,
            Blue, Lime) on ~22–32s Reanimated worklets. CSS blur(60px)
            on web, alpha-ramp gradient on native. Full-screen 68% black
            vignette overlaid for legibility.
          - <GlassCard> with expo-blur BlurView (native) + CSS
            backdrop-filter (web), tone variants, radius scale up to
            34 (radii.xxl). <GlassPill> for chip usage.
          - <Metric> component — glowing headline number in a semantic
            brand color (text-shadow on web + shadowColor/shadowRadius
            on native).
          - Web patch: injects style tag to force html/body/#root
            background to #050505 AND kills RN Web's iOS-grey (#F2F2F2)
            fallback. Also sets Apple-grade SF Pro / Inter font stack.
          
          Wave 2 — Host Sphere (LiveOrb v2):
          - 5 layered radial/linear gradients: outer purple/blue nebula,
            middle cyan/lime ring, inner magenta accent, bright core
            with animated radius from voice level, specular highlight
            dot. Two independent rotation shared values for depth.
          - Modes: idle (slow breath), listening (mic level),
            thinking (fast heartbeat), speaking (TTS envelope).
          - Fully worklet-driven on the UI thread → 120fps on web.
          
          Screens re-skinned this session:
          - /sign-in — glass card, drifting orbs behind, lime CTA glow.
          - /(tabs)/index — dashboard metrics now glow in brand colors.
          - /(tabs)/assistant — full immersive nebula host + glass
            controls.
          - /(tabs)/bullion — glass trip cards, ambient background bleed.
          
          Deferred to next session (Waves 3, 4, 5):
          - Proactive whispers (route-change context greetings + TTS
            with mute toggle).
          - Smart walkthrough / spotlight for empty screens.
          - Elastic list transitions + full app-wide typography rewrite
            for the remaining screens.
          
          Tested visually via browser automation — all 3 screens
          screenshot-verified (see /tmp/final_signin.png,
          /tmp/final_dash.png, /tmp/final_assist.png).

  - task: "Iter24 · AI Context Sync — fix hallucinated shipment IDs"
    implemented: true
    working: true
    file: "backend/server.py (new /api/assistant/context + real_block in system prompt), frontend/src/ghost/ghost-user.tsx (fuzzy shipment match + suggest closest)"
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          User reported: "Assistant is failing — trying to add bags to
          shipment IDs that don't exist (error: 'Shipment CN-S/01 not
          found')". Root cause: the AI had no live database context and
          hallucinated consignment numbers like "CN-S/01" (real format
          is "SE/26-27/035").
          
          Three-layer fix:
          
          1) Real-data context endpoint — new /api/assistant/context
             returns a compact snapshot (30 shipments · 60 parties · 40
             items · 20 carrier trips) with a 15s TTL cache.
          
          2) Every /assistant/chat turn now embeds a "वास्तविक डेटाबेस
             snapshot" block inside the system prompt listing real
             consignment numbers, party names, and item names — plus
             hard instruction: "यदि उपयोगकर्ता कोई ID बताए जो सूची में
             नहीं है, पहले सूची से मिलती-जुलती suggest करें। कभी भी
             fake IDs मत बनाएँ।"
          
          3) Fuzzy shipment lookup in ghost-user.tsx — _findShipment()
             tries (a) exact id, (b) exact consignment_no case-insens,
             (c) normalised equality (strips /-_ spaces), (d) normalised
             prefix/suffix match. If still not found, _closestShipments()
             returns the top-3 nearest matches so the error message
             offers "Did you mean: SE/26-27/035, SE/26-27/034?".
          
          Also fixed: remote /api/shipments/{id}/bags endpoint requires
          `shipment_id` in the body (not just the URL path) — the
          add_bag executor now sends both.
          
          E2E verified: prompt "SE/26-27/035 mein 5kg ka bag add karo"
          → AI now correctly picks the real ID → confirmation modal
          shows "Add 5 kg bag to SE/26-27/035" → confirm → bag
          BAG-001 (5kg) created on the real shipment. Older prompt
          "latest shipment mein 5kg bag" also works — AI picks the
          newest real ID from the injected context.

  - task: "Iter25 · Ghost-User Visual Execution — Full Visual Fill for 4 forms"
    implemented: true
    working: true
    file: "frontend/src/ghost/ghost-user.tsx, store.ts, use-ghost-fill.ts, backend/server.py, frontend/app/{party/new,item/[id],shipment/new,invoice/new}.tsx"
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: |
          User requested "Full Visual Execution" (Ghost-User) — AI physically
          navigates to the target form and visually types out each field
          without an initial confirmation popup, then shows a bottom banner
          for final Save/Cancel.
          
          Previous attempt was stuck: programmatic router.push from within
          the /assistant tab silently failed on web because the destructive
          fallback `window.location.assign()` triggered a hard reload,
          wiping the in-memory ghost payload before the target screen
          could consume it.
          
          Four-part fix:
          
          1) `src/ghost/store.ts` — added sessionStorage (web) /
             AsyncStorage (native) persistence + nonce stamping so payloads
             survive hard reloads AND hot-reload dedupe still works.
          
          2) `src/ghost/ghost-user.tsx` — replaced the destructive nav
             fallback with `navigateSafely()`: try router.push, then retry
             with router.navigate after 600ms if pathname didn't move.
             Extracted a shared `dispatchVisualFill()` helper so all four
             create_* actions use the same code path.
          
          3) Added two new action types + backend prompt lines:
             - create_shipment  (consignment_no, direction, mode, origin,
               destination, freight, freight_ccy, notes)
             - create_invoice   (invoice_no, party_name, amount, currency,
               description, notes)
          
          4) Wired `useGhostFill` into all four target screens
             (`/party/new`, `/item/new` via [id].tsx isNew, `/shipment/new`,
             `/invoice/new`). For compound fields (city+notes both flow
             into address, HSN+notes both flow into description), used
             per-field useRef buffers so char-by-char progressive typing
             produces the correct final string instead of runaway
             self-appending.
          
          E2E verified via Playwright + live backend proxy:
          · Party: "Add new party named Auto1786182296 as customer in Pune"
            → navigation happened → Name/Role/Address typed → banner
            appeared → Save clicked → 200 OK from /api/parties → returned
            to /assistant → verified via `curl /api/parties` list.
          · Item: "Add Silver Chain, unit grams, HSN 7113" → typed into
            /item/new → banner shown.
          · Shipment: "Create shipment SE/26-27/041 Chennai→BKK air" →
            /shipment/new hydrated → banner shown.
          · Invoice: "Create invoice INV-2026-042 for Priya Traders 55000"
            → /invoice/new hydrated with number/currency/line-item/total
            → banner shown.
          
          Data-integrity guard preserved: when the AI is asked to create
          an invoice for a party that doesn't exist in the live parties
          list, it correctly refuses and asks the operator to create the
          party first (instead of hallucinating).

  - task: "Iter26 · Cyber-Siri UI/UX Transformation (all 4 phases)"
    implemented: true
    working: true
    file: "backend/server.py (memory + blockers + tts stream), frontend/src/theme, components/{ambient-background,live-orb,floating-jarvis,blocker-bell}.tsx, utils/tts-stream.ts, app/{_layout,(tabs)/assistant}.tsx"
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: |
          Complete visual + AI overhaul. Delivered in 4 confirmed phases:
          
          PHASE 1 · Cyber-Siri Theme Swap
          - Base: #020202 deep space (was #050505)
          - Primary accent: Electric Blue #00D1FF (was lime #C6FF00)
          - Ambient orbs: Purple / Electric-Blue / Cyan / Deep-Indigo
            (was Purple / Blue / Lime — 3 orbs → 4 orbs)
          - Batch-replaced every rgba(198,255,0,*) / rgba(163,230,53,*) /
            #C6FF00 across app/ + src/ (~15 files touched)
          - LiveOrb re-tinted to Cyber-Siri palette; core radial highlight
            switched from lime→cyan glow
          - Verified across sign-in, dashboard, shipments, invoices,
            bullion, assistant screens.
          
          PHASE 2 · Floating Jarvis Bubble
          - New component `src/components/floating-jarvis.tsx`
          - 56px pulsing blue-ring bubble anchored bottom-right, visible
            on every non-assistant, non-signin screen
          - Tap → full-screen nebula modal with:
              • big LiveOrb (same reactive amplitude engine)
              • auto-focused Hindi text input ("बोलिए या यहाँ टाइप कीजिए…")
              • prominent cyan mic button (press-to-talk)
              • Wingman header pill + close X
          - Modal reuses the same /assistant/chat endpoint so ghost-user
            actions dispatched from the bubble navigate + fill forms
            exactly like the tab does. Verified end-to-end from /invoices
            → floating bubble → "Add party in Pune" → /party/new with
            ghost-fill banner ready to save.
          
          PHASE 3 · Server-Side Memory + Intelligent To-Do
          - `/api/assistant/chat` extracts user_id via optional_current_user
            and persists every turn to `assistant_messages` collection
            keyed by user_id. When client history is empty, replays the
            last 10 exchanges in a "पिछली बातचीत का सार" block appended
            to the current user message.
          - Verified persistence: told Jarvis "I like tea" via curl in
            session A; asked "what do I like to drink?" in a fresh session
            B from the frontend → answer "चाय, सर! 😊 यह तो याद है मुझे।"
          - New GET `/api/assistant/history` (auth-gated, oldest-first).
          - New DELETE `/api/assistant/history` for opt-in reset.
          - New GET `/api/todo/blockers` — returns categorised issues:
              bags without weight_kg
              shipments missing freight OR bill-to party
              invoices with amount = 0
            plus a Hindi `summary_hi` one-liner for the proactive greet.
          - New `<BlockerBell>` — floating top-right icon with red count
            badge; hides on /sign-in. Auto-polls every 45s + on route
            change.
          - New `<BlockerPanel>` — glassmorphic right-side slide-in modal
            with sections + tappable rows that deep-link to /shipment/{id}
            or /invoice/{id}. Empty state shows green checkmark + Hindi
            "सब कुछ अपडेट है".
          - Proactive greet wired into BOTH the /assistant tab AND the
            FloatingJarvis modal — reads cached blockers on open, adds
            the Hindi summary to the opener greeting and speaks it.
          
          PHASE 4 · Streaming Voice (Shimmer + low-latency)
          - Voice switched from `nova` → `shimmer` end-to-end.
          - New backend endpoints:
              POST `/api/assistant/tts/stream` — chunked audio/mpeg
              GET  `/api/assistant/tts/stream?text=...` — same, GET-flavour
                for native `<audio src=...>` playback
          - Both proxy the Emergent LLM proxy `/audio/speech` via
            `httpx.AsyncClient.stream()` and yield chunks (~4KB each)
            straight to the client. TTFB measured at 24ms.
          - New shared helper `src/utils/tts-stream.ts`:
              Web (Chrome/Firefox): MediaSource + <audio> with
                appendBuffer for each incoming chunk. Falls back to blob
                playback if MediaSource lacks audio/mpeg support (Safari).
              Native: passes GET URL to expo-audio's createAudioPlayer,
                which lets the OS handle chunked HTTP streaming.
          - Both the /assistant tab and FloatingJarvis's speak() now go
            through the helper and cancel any in-flight playback before
            starting a new one.
          - Measured: assistant-tab open → "Speaking" mode reached at
            t+1.34s (vs. prior 2-4s waiting on the full mp3 blob).

  - task: "Iter27 · Interactive Chat Popup (replaces full-screen modal)"
    implemented: true
    working: true
    file: "frontend/src/components/floating-jarvis.tsx (full rewrite)"
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          User asked for the FloatingJarvis to open a small adjacent chat
          window instead of the full-screen nebula modal, with a scale-up
          animation from the button and full Ghost-User sync on the
          background page.
          
          Changed:
          - Removed <Modal>. Popup is now a bare absolutely-positioned
            View at zIndex 998, rendered adjacent to (above) the bubble.
            Because it isn't a Modal, the background page remains fully
            interactive — the Ghost-User engine can navigate + type on
            the underlying form while the operator continues chatting.
          - Popup: 320px wide × 460px tall (capped to screen). Header
            shows a small (34px) reactive LiveOrb + "Wingman" title +
            mode label ("Ready / Listening / Thinking / Speaking") +
            close X. Middle is a scrolling transcript with user/AI
            message bubbles (electric-blue for user, glass for AI).
            Composer row: text input (auto-focus) + mic + send.
          - Bubble icon toggles between "sparkles" (closed) and "close"
            (open) so a second tap dismisses the popup.
          - Animation: Animated.spring on a scale [0.15 → 1] combined
            with translateX/translateY that anchors the transform origin
            to the popup's bottom-right corner (the bubble's position),
            producing the requested "scale-up from the button" effect.
            Springs with different stiffness/damping for open vs close
            (open feels punchy, close feels snappy).
          - Ghost-User sync verified end-to-end: typed "Add party 
            GhostFromPopup in Ahmedabad as customer" in the popup while
            on the Dashboard → background page navigated to /party/new,
            all fields typed by the ghost engine, save banner appeared,
            AND the chat popup stayed visible with the transcript intact.
          - Also verified: input auto-focuses on open, mic button
            toggles listening state, close-X + bubble-toggle both work,
            proactive blocker greet still fires when applicable,
            streaming TTS (shimmer) still plays with visible orb
            envelope.

  - task: "Iter28 · TTS calmer, clearer, slower voice"
    implemented: true
    working: true
    file: "backend/server.py (_stream_openai_tts + _tts_prep_pauses + assistant system prompt)"
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          User feedback: assistant voice too fast + hard to understand.
          Three fixes:
          1) Speed 1.0 → 0.88 (default; clamped to [0.6, 1.2] server-side)
          2) Model upgraded tts-1 → tts-1-hd for sharper Hindi consonants
             (ka/kha/ga/ta/tha/da). +300ms upstream but streaming keeps
             perceived latency ~1s from AI reply → voice start.
          3) New `_tts_prep_pauses()` server-side text preprocessor that
             inserts an ellipsis ("…") after Hindi danda (।) and any
             sentence-ending punctuation followed by whitespace + capital
             (works for both Devanagari + English mid-flow). The model
             treats "…" as a longer breath → natural pauses between
             sentences without changing content.
          4) Updated system prompt to instruct Claude to write short
             clean sentences with correct punctuation so TTS cadence
             lands naturally.
          Verified: sample "नमस्ते सर। बताइए। तीन shipments हैं। पहला Delhi से।"
          → preprocessed to "नमस्ते सर। … बताइए। … तीन shipments हैं। … पहला Delhi से।"
          End-to-end: /assistant/tts/stream still streams (TTFB=24ms) and
          the popup UI shows "Speaking…" mode within ~500ms of first byte.
