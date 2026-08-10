"""
Absolute Final Mega Stress Test — 100 voice commands routed through
/api/wingman-chat. Each command is a natural Hinglish utterance the
operator would speak; we assert on the action + presence of key
substrings in the answer so the tests remain robust to phrasing tweaks.

Pass criteria: 95 / 100 commands correct.

Run:  cd /app && pytest -xvs backend/tests/test_wingman_100_commands.py
"""
from __future__ import annotations
import os
import re
import time
import pytest
import httpx

BASE = os.environ.get("WINGMAN_TEST_BASE", "http://localhost:8001")


def _chat(message: str, timeout: float = 10.0) -> dict:
    r = httpx.post(f"{BASE}/api/wingman-chat", json={"message": message}, timeout=timeout)
    r.raise_for_status()
    return r.json()


def _has(txt: str, *needles: str) -> bool:
    if not txt:
        return False
    t = txt.lower()
    return any(n.lower() in t for n in needles)


# ---------------------------------------------------------------------------
# Each row: (id, message, expected_action_or_set, [assertion_lambdas])
# The assertion lambda gets the full response dict and must return True.
# ---------------------------------------------------------------------------
COMMANDS = [
    # ============= LEDGER (20) =============
    ("L01", "Yashwant ka hisaab batao",         {"party_ledger"},           lambda r: _has(r.get("answer",""), "Yashwant")),
    ("L02", "Abhishek ka ledger dikhao",        {"party_ledger_detail","party_ledger"}, lambda r: _has(r.get("answer",""), "Abhishek")),
    ("L03", "Kitna total dena hai",             {"net_payable","net_position"}, lambda r: _has(r.get("answer",""), "dena")),
    ("L04", "Kitna total lena hai",             {"net_receivable","net_position"}, lambda r: _has(r.get("answer",""), "lena")),
    ("L05", "Sabse zyada kisko dena hai",       {"top_payable"},            lambda r: _has(r.get("answer",""), "dena", "koi")),
    ("L06", "Sabse zyada kisne dena hai",       {"top_receivable"},         lambda r: _has(r.get("answer",""), "lena", "koi")),
    ("L07", "Aaj ki entries dikhao",            {"today_ledger"},           lambda r: _has(r.get("answer",""), "aaj", "entries")),
    ("L08", "Lalit ko 5000 rupaye diye",        {"add_ledger_debit","create_form","party_ledger"}, lambda r: True),
    ("L09", "Abhishek se 2000 rupaye mile",     {"add_ledger_credit","create_form","party_ledger"}, lambda r: True),
    ("L10", "Lalit ka THB balance",             {"thb_balance","party_ledger"}, lambda r: _has(r.get("answer",""), "Lalit")),
    ("L11", "Overdue entries dikhao",           {"overdue_ledger"},         lambda r: _has(r.get("answer",""), "overdue")),
    ("L12", "Is mahine ka hisaab",              {"this_month_ledger"},      lambda r: _has(r.get("answer",""), "mahine", "entries")),
    ("L13", "Pichhle mahine ka hisaab",         {"last_month_ledger"},      lambda r: _has(r.get("answer",""), "mahine", "entries")),
    ("L14", "Abhishek verified hai kya",        {"party_verified"},         lambda r: _has(r.get("answer",""), "Abhishek")),
    ("L15", "Sab parties ka balance dikhao",    {"all_parties"},            lambda r: True),
    ("L16", "India ka total balance",           {"india_total"},            lambda r: _has(r.get("answer",""), "India", "net")),
    ("L17", "Bangkok ka total balance",         {"bangkok_total"},          lambda r: _has(r.get("answer",""), "Bangkok", "Thailand")),
    ("L18", "Abhishek ka statement bhejo",      {"send_statement"},         lambda r: _has(r.get("answer",""), "Abhishek")),
    ("L19", "Naya party banao Ramesh customer", {"create_party","create_form"}, lambda r: r.get("answer") is None),
    ("L20", "Abhishek ka number kya hai",       {"party_phone"},            lambda r: _has(r.get("answer",""), "Abhishek", "number", "save nahi")),

    # ============= SHIPMENTS (20) =============
    ("S01", "Kitne shipments hain",             {"shipment_count","shipment_query"}, lambda r: True),
    ("S02", "Pending shipments dikhao",         {"pending_shipments_list","shipment_query"}, lambda r: _has(r.get("answer",""), "pending")),
    ("S03", "In transit kya hai",               {"in_transit_list","shipment_query"}, lambda r: True),
    ("S04", "AURA-DEL-001 ka status",           {"shipment_query"},         lambda r: _has(r.get("answer",""), "AURA","shipment")),
    ("S05", "Naya shipment banao Delhi se Bangkok", {"create_shipment","create_form"}, lambda r: r.get("answer") is None),
    ("S06", "AURA-DEL-001 deliver ho gaya",     {"mark_delivered"},         lambda r: _has(r.get("answer",""), "deliver")),
    ("S07", "AURA-DEL-001 mein Abhishek ko assign karo bag 2", {"assign_carrier"}, lambda r: _has(r.get("answer",""), "assign", "carrier")),
    ("S08", "Bangkok warehouse mein kya hai",   {"warehouse_contents"},     lambda r: _has(r.get("answer",""), "warehouse", "Bangkok")),
    ("S09", "Aaj kaunse shipments deliver honge", {"today_deliveries"},     lambda r: _has(r.get("answer",""), "aaj", "shipments")),
    ("S10", "AURA-DEL-001 ka packing list banao", {"packing_list_pdf"},     lambda r: _has(r.get("answer",""), "packing")),
    ("S11", "Sabse purana pending shipment",    {"oldest_pending"},         lambda r: _has(r.get("answer",""), "pending", "purana", "koi")),
    ("S12", "AURA-DEL-001 ki freight kya hai",  {"shipment_freight"},       lambda r: _has(r.get("answer",""), "freight", "consignment")),
    ("S13", "Delhi se Bangkok wale shipments",  {"shipments_by_route","shipment_query"}, lambda r: True),
    ("S14", "Is hafte ke shipments",            {"this_week_shipments"},    lambda r: _has(r.get("answer",""), "hafte", "shipments")),
    ("S15", "AURA-DEL-001 edit karo freight 5000", {"edit_freight"},        lambda r: _has(r.get("answer",""), "freight")),
    ("S16", "Warehouse se deliver karo AURA-DEL-001", {"warehouse_deliver"}, lambda r: _has(r.get("answer",""), "deliver")),
    ("S17", "Naya bag add karo AURA-DEL-001 mein", {"add_bag","create_form"}, lambda r: r.get("answer") is None),
    ("S18", "Lalit ke saare shipments",         {"shipments_by_party"},     lambda r: _has(r.get("answer",""), "Lalit", "shipments")),
    ("S19", "Shipment summary aaj ka",          {"shipment_today_summary","daily_brief"}, lambda r: True),
    ("S20", "Sabse heavy shipment",             {"heaviest_shipment"},      lambda r: _has(r.get("answer",""), "heavy", "kg", "Koi")),

    # ============= TRIPS / BULLION (15) =============
    ("T01", "Active trips dikhao",              {"active_trips_list","trip_query"}, lambda r: True),
    ("T02", "Naya trip banao Abhishek Delhi",   {"create_trip","create_form"}, lambda r: r.get("answer") is None),
    ("T03", "Abhishek ka trip status",          {"trip_status","trip_query"}, lambda r: True),
    ("T04", "Vault mein kitna saman hai",       {"vault_summary"},          lambda r: _has(r.get("answer",""), "vault", "total")),
    ("T05", "Bangkok mein kitna saman",         {"bangkok_vault"},          lambda r: _has(r.get("answer",""), "Bangkok")),
    ("T06", "India mein kitna saman",           {"india_vault"},            lambda r: _has(r.get("answer",""), "India")),
    ("T07", "In transit mein kitna saman",      {"in_transit_assets"},      lambda r: _has(r.get("answer",""), "in-transit", "transit")),
    ("T08", "Aaj kaunsa carrier ja raha hai",   {"today_departures"},       lambda r: _has(r.get("answer",""), "carrier", "aaj")),
    ("T09", "Abhishek trip complete ho gaya",   {"complete_trip"},          lambda r: _has(r.get("answer",""), "trip", "complete")),
    ("T10", "Carry charge kya hai 10 kg ka",    {"carry_charge_calc"},      lambda r: _has(r.get("answer",""), "kg", "charge")),
    ("T11", "USD kitna in transit hai",         {"usd_in_transit"},         lambda r: _has(r.get("answer",""), "USD")),
    ("T12", "Gold kitna hai total",             {"gold_total"},             lambda r: _has(r.get("answer",""), "gold", "baht")),
    ("T13", "Abhishek ko 5000 pay karo",        {"pay_carrier","add_ledger_debit","create_form"}, lambda r: True),
    ("T14", "Abhishek ki trip history",         {"carrier_trip_history"},   lambda r: _has(r.get("answer",""), "Abhishek", "history", "trips")),
    ("T15", "Naye carrier ki rate kya hai",     {"carrier_new_rate_check"}, lambda r: _has(r.get("answer",""), "carrier", "rate", "confirm")),

    # ============= INVOICES (10) =============
    ("I01", "Unpaid invoices dikhao",           {"unpaid_invoices_list","invoice_query"}, lambda r: _has(r.get("answer",""), "unpaid")),
    ("I02", "Lalit ka invoice",                 {"party_invoices","invoice_query"}, lambda r: _has(r.get("answer",""), "Lalit", "invoices")),
    ("I03", "Naya invoice banao Lalit 5000",    {"create_invoice","create_form"}, lambda r: r.get("answer") is None),
    ("I04", "INV-2026-001 pay ho gaya",         {"mark_invoice_paid"},      lambda r: _has(r.get("answer",""), "paid", "INV")),
    ("I05", "INV-2026-001 ka PDF bhejo",        {"invoice_pdf_send"},       lambda r: _has(r.get("answer",""), "PDF", "INV")),
    ("I06", "Total unpaid kitna hai",           {"total_unpaid"},           lambda r: _has(r.get("answer",""), "unpaid")),
    ("I07", "Is mahine ki invoices",            {"this_month_invoices"},    lambda r: _has(r.get("answer",""), "mahine", "invoices")),
    ("I08", "INV-2026-001 edit karo",           {"edit_invoice"},           lambda r: _has(r.get("answer",""), "edit", "invoice")),
    ("I09", "Overdue invoices",                 {"overdue_invoices"},       lambda r: _has(r.get("answer",""), "overdue")),
    ("I10", "Lalit ko invoice bhejo",           {"send_invoice"},           lambda r: _has(r.get("answer",""), "Lalit", "invoice")),

    # ============= CATALOG / ITEMS (10) =============
    ("C01", "Catalog mein kya hai",             {"catalog_list"},           lambda r: _has(r.get("answer",""), "catalog", "items")),
    ("C02", "Naya item add karo Silver Chain 5000", {"create_item","create_form"}, lambda r: r.get("answer") is None),
    ("C03", "Silver Chain ki price kya hai",    {"item_price"},             lambda r: _has(r.get("answer",""), "price", "Silver", "clearly")),
    ("C04", "Sabhi customers ko catalog bhejo", {"broadcast_catalog","broadcast_message"}, lambda r: True),
    ("C05", "Silver Chain ka photo update karo", {"item_photo_update"},     lambda r: _has(r.get("answer",""), "photo")),
    ("C06", "Silver Chain ki price change karo 6000", {"item_price_update"}, lambda r: _has(r.get("answer",""), "price", "update")),
    ("C07", "Lalit ke items",                   {"items_by_supplier","party_ledger"}, lambda r: True),
    ("C08", "Stock mein kya nahi hai",          {"out_of_stock"},           lambda r: _has(r.get("answer",""), "stock")),
    ("C09", "Silver Chain delete karo",         {"delete_item"},            lambda r: _has(r.get("answer",""), "delete", "kholo")),
    ("C10", "Popular items kaunse hain",        {"popular_items"},          lambda r: _has(r.get("answer",""), "popular")),

    # ============= PARTIES (5) =============
    ("P01", "Sabhi customers ke naam",          {"customer_list"},          lambda r: _has(r.get("answer",""), "customers")),
    ("P02", "Sabhi carriers ke naam",           {"carrier_list"},           lambda r: _has(r.get("answer",""), "carriers")),
    ("P03", "Naya customer add karo Deepak",    {"create_customer","create_form"}, lambda r: r.get("answer") is None),
    ("P04", "Abhishek ka address kya hai",      {"party_address"},          lambda r: _has(r.get("answer",""), "Abhishek", "address")),
    ("P05", "Abhishek ki detail update karo",   {"edit_party"},             lambda r: _has(r.get("answer",""), "Abhishek", "form")),

    # ============= NOTIFICATIONS / TASKS (5) =============
    ("N01", "Kya kya pending hai aaj",          {"today_pending"},          lambda r: _has(r.get("answer",""), "pending")),
    ("N02", "Important notifications dikhao",   {"important_notifications"}, lambda r: _has(r.get("answer",""), "notifications", "bell")),
    ("N03", "Sab notifications clear karo",     {"clear_notifications"},    lambda r: _has(r.get("answer",""), "clear")),
    ("N04", "Mujhe follow-up yaad dilao kal",   {"set_reminder"},           lambda r: _has(r.get("answer",""), "reminder", "yaad")),
    ("N05", "Abhishek ka reminder set karo",    {"schedule_followup","set_reminder"}, lambda r: _has(r.get("answer",""), "reminder", "follow")),

    # ============= MEMORY / SETTINGS (5) =============
    ("M01", "Yaad rakh ki Yashwant Bangkok mein hai", {"save_memory"},      lambda r: _has(r.get("answer",""), "Yaad", "kar")),
    ("M02", "Kya yaad hai tumhe",               {"list_memories"},          lambda r: _has(r.get("answer",""), "yaad")),
    ("M03", "Yashwant bhool jao",               {"forget_memory"},          lambda r: _has(r.get("answer",""), "hata", "mila", "Ho gaya")),
    ("M04", "Mera naam kya hai",                {"my_name"},                lambda r: _has(r.get("answer",""), "Kishan", "Sir")),
    ("M05", "Aaj ki date kya hai",              {"current_date"},           lambda r: _has(r.get("answer",""), "aaj", "hai")),

    # ============= DASHBOARD / SUMMARY (5) =============
    ("D01", "Aaj ka pura summary",              {"daily_brief"},            lambda r: _has(r.get("answer",""), "aaj", "pending")),
    ("D02", "Dashboard refresh karo",           {"dashboard_refresh"},      lambda r: _has(r.get("answer",""), "refresh")),
    ("D03", "Forex rate kya hai",               {"forex_rate"},             lambda r: _has(r.get("answer",""), "rate", "INR", "THB")),
    ("D04", "Is hafte ka revenue",              {"weekly_revenue"},         lambda r: _has(r.get("answer",""), "hafte", "revenue")),
    ("D05", "App ka status kya hai",            {"system_health"},          lambda r: _has(r.get("answer",""), "healthy", "backend")),

    # ============= WHATSAPP / LINE / COMM (5) =============
    ("W01", "Lalit ko WhatsApp karo aaj mil sakte hain kya", {"whatsapp_send"},  lambda r: _has(r.get("answer",""), "Lalit", "WhatsApp")),
    ("W02", "Lalit ko LINE pe bhejo hello",     {"line_send"},              lambda r: _has(r.get("answer",""), "Lalit", "LINE")),
    ("W03", "Abhishek ko ledger statement bhejo", {"send_statement"},       lambda r: _has(r.get("answer",""), "statement", "Abhishek")),
    ("W04", "Sab customers ko message bhejo Diwali sale", {"broadcast_message"}, lambda r: _has(r.get("answer",""), "customers")),
    ("W05", "Lalit ko invoice bhejo",           {"send_invoice"},           lambda r: _has(r.get("answer",""), "Lalit", "invoice")),
]


# ---------------------------------------------------------------------------
# Aggregate stress test
# ---------------------------------------------------------------------------
def test_100_voice_commands_smoke():
    """Send all 100 commands. Fail only if <95 pass action + answer assertions."""
    assert len(COMMANDS) == 100, f"expected exactly 100 commands, got {len(COMMANDS)}"

    passed: list[str] = []
    failed: list[tuple[str, str, dict, str]] = []
    t0 = time.time()

    for cid, msg, expected_actions, assertion in COMMANDS:
        try:
            resp = _chat(msg)
        except Exception as e:
            failed.append((cid, msg, {"error": str(e)}, f"HTTP failure: {e}"))
            continue

        action = resp.get("action")
        answer = resp.get("answer")

        # Action check — allow any of the expected variants
        if expected_actions and action not in expected_actions:
            failed.append((cid, msg, resp, f"action={action!r} not in {expected_actions}"))
            continue

        # Answer / assertion check
        try:
            if not assertion(resp):
                failed.append((cid, msg, resp, f"assertion returned False. answer={answer!r}"))
                continue
        except Exception as e:
            failed.append((cid, msg, resp, f"assertion crashed: {e}"))
            continue

        passed.append(cid)

    dt = time.time() - t0

    # Emit a compact report so pytest -s shows results
    print(f"\n===== 100-COMMAND STRESS RESULT =====")
    print(f"passed: {len(passed)} / 100 in {dt:.1f}s")
    print(f"failed: {len(failed)}")
    for cid, msg, resp, why in failed:
        print(f"  ✗ {cid}  '{msg[:60]}'  →  {why}")

    # Pass threshold: 95 / 100
    assert len(passed) >= 95, (
        f"Only {len(passed)}/100 commands passed. See print output above for failures."
    )


if __name__ == "__main__":
    pytest.main([__file__, "-xvs"])
