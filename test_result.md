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
