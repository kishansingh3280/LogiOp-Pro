"""Phase 3 · Parties + party_meta overlay + Master/All company mode tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://opsi-complete.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": "kishan.singh3280@gmail.com", "password": "701A3ahig@"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "X-Entry-Source": "manual"}


# --- Fix 3d: POST /api/parties with lat/lng as strings ---------------------
class TestPartyCreateWithLatLng:
    party_id = None

    def test_create_party_with_all_fields(self, auth_headers):
        payload = {
            "name": f"TEST_Party_{uuid.uuid4().hex[:6]}",
            "role": "customer",
            "phone": "+919999888877",
            "address": "Test Addr",
            "lat": "12.9716",
            "lng": "77.5946",
        }
        r = requests.post(f"{BASE_URL}/api/parties", json=payload, headers=auth_headers)
        assert r.status_code in (200, 201), f"{r.status_code}: {r.text}"
        data = r.json()
        assert data.get("name") == payload["name"]
        assert data.get("role") == "customer"
        assert data.get("id")
        TestPartyCreateWithLatLng.party_id = data["id"]

    def test_get_party_returns_lat_lng(self, auth_headers):
        pid = TestPartyCreateWithLatLng.party_id
        assert pid, "Must run create first"
        r = requests.get(f"{BASE_URL}/api/parties/{pid}", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        # lat/lng should persist (as strings per upstream)
        assert str(data.get("lat")) == "12.9716" or data.get("lat") == "12.9716"
        assert str(data.get("lng")) == "77.5946" or data.get("lng") == "77.5946"

    def test_create_party_name_only(self, auth_headers):
        payload = {"name": f"TEST_MinParty_{uuid.uuid4().hex[:6]}"}
        r = requests.post(f"{BASE_URL}/api/parties", json=payload, headers=auth_headers)
        assert r.status_code in (200, 201), f"{r.status_code}: {r.text}"
        assert r.json().get("id")


# --- Fix 3d: PUT /api/parties/{id}/meta overlay --------------------------
class TestPartyMetaOverlay:
    party_id = None

    def test_setup_party(self, auth_headers):
        payload = {"name": f"TEST_MetaParty_{uuid.uuid4().hex[:6]}", "role": "customer"}
        r = requests.post(f"{BASE_URL}/api/parties", json=payload, headers=auth_headers)
        assert r.status_code in (200, 201)
        TestPartyMetaOverlay.party_id = r.json()["id"]

    def test_put_meta_stores_notes_and_photo(self, auth_headers):
        pid = TestPartyMetaOverlay.party_id
        assert pid
        body = {"party_id": pid, "notes": "Important VIP client", "photo_url": "https://example.com/x.jpg"}
        r = requests.put(f"{BASE_URL}/api/parties/{pid}/meta", json=body, headers=auth_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("ok") is True
        assert j.get("notes") == "Important VIP client"
        assert j.get("photo_url") == "https://example.com/x.jpg"

    def test_get_party_merges_notes_and_photo(self, auth_headers):
        pid = TestPartyMetaOverlay.party_id
        r = requests.get(f"{BASE_URL}/api/parties/{pid}", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("notes") == "Important VIP client", f"notes not merged: {data}"
        assert data.get("photo_url") == "https://example.com/x.jpg", f"photo_url not merged: {data}"
        # Ensure other fields untouched
        assert data.get("name", "").startswith("TEST_MetaParty_")

    def test_get_meta_direct(self, auth_headers):
        pid = TestPartyMetaOverlay.party_id
        r = requests.get(f"{BASE_URL}/api/parties/{pid}/meta", headers=auth_headers)
        assert r.status_code == 200
        j = r.json()
        assert j.get("notes") == "Important VIP client"


# --- Fix 1c: company_id/mode omission for Master/All ---------------------
class TestCompanyModeOmit:
    def test_shipments_no_params_returns_all(self, auth_headers):
        """Master mode → no company_id/mode params → all shipments."""
        r = requests.get(f"{BASE_URL}/api/shipments", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        # Should return >= 5 rows per agent context note
        print(f"Master shipments count: {len(data)}")

    def test_shipments_only_company_id_awadh(self, auth_headers):
        """Awadh + All → company_id=awadh only, no mode."""
        r = requests.get(f"{BASE_URL}/api/shipments?company_id=awadh", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        print(f"Awadh · All shipments count: {len(data)}")

    def test_shipments_full_filter(self, auth_headers):
        """Awadh + Formal → both params."""
        r = requests.get(f"{BASE_URL}/api/shipments?company_id=awadh&mode=formal",
                         headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
