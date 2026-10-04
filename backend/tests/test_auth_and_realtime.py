import os
os.environ["TESTING"] = "true"
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db

client = TestClient(app)

def test_auth_and_profile_flow():
    init_db()
    # 1. Login with demo credentials
    res = client.post("/api/v1/auth/login", json={
        "email": "ciso@demofinancial.com",
        "password": "DemoPassword2026!"
    })
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get current user
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["email"] == "ciso@demofinancial.com"

    # 3. Update profile
    prof_res = client.patch("/api/v1/auth/profile", json={
        "full_name": "Dr. Rajesh Sharma CISO",
        "role": "ciso",
        "photo_url": "https://example.com/avatar.jpg"
    }, headers=headers)
    assert prof_res.status_code == 200
    assert prof_res.json()["full_name"] == "Dr. Rajesh Sharma CISO"

    # 4. Get & Update Organization
    org_res = client.get("/api/v1/auth/organization", headers=headers)
    assert org_res.status_code == 200
    assert "currency" in org_res.json()

    org_up_res = client.patch("/api/v1/auth/organization", json={
        "name": "Demo Financial Corp",
        "currency": "INR",
        "default_budget": 6000000.0
    }, headers=headers)
    assert org_up_res.status_code == 200
    assert org_up_res.json()["name"] == "Demo Financial Corp"

    # 5. Get & Update Risk Calibration
    calib_res = client.get("/api/v1/auth/calibration", headers=headers)
    assert calib_res.status_code == 200
    assert "weights" in calib_res.json()

    calib_up = client.patch("/api/v1/auth/calibration", json={
        "exposure_weight": 0.40,
        "criticality_weight": 0.45,
        "control_discount": 0.30
    }, headers=headers)
    assert calib_up.status_code == 200
    assert calib_up.json()["weights"]["exposure_weight"] == 0.40

    # Reset org name back for platform tests
    client.patch("/api/v1/auth/organization", json={
        "name": "Demo Financial Services Ltd.",
        "currency": "INR",
        "default_budget": 5000000.0
    }, headers=headers)

    # 6. Change password
    pwd_res = client.post("/api/v1/auth/change-password", json={
        "current_password": "DemoPassword2026!",
        "new_password": "NewSecurePass2026!"
    }, headers=headers)
    assert pwd_res.status_code == 200
    assert pwd_res.json()["success"] is True

    # 7. Login with newly changed password
    login_new = client.post("/api/v1/auth/login", json={
        "email": "ciso@demofinancial.com",
        "password": "NewSecurePass2026!"
    })
    assert login_new.status_code == 200

    # Reset back to DemoPassword2026! for consistency
    new_token = login_new.json()["access_token"]
    client.post("/api/v1/auth/change-password", json={
        "current_password": "NewSecurePass2026!",
        "new_password": "DemoPassword2026!"
    }, headers={"Authorization": f"Bearer {new_token}"})


def test_control_update_and_recalculation():
    # Fetch controls
    res = client.get("/api/v1/controls")
    assert res.status_code == 200
    controls = res.json()
    assert len(controls) > 0
    first_ctrl = controls[0]

    # Update control effectiveness
    patch_res = client.patch(f"/api/v1/controls/{first_ctrl['id']}", json={
        "effectiveness_pct": 92.5,
        "coverage_pct": 88.0
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["effectiveness_pct"] == 92.5
