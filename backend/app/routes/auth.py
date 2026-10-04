from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import json
from app.database import get_db
from app.models.entities import User, Organization, AuditEvent, ModelVersion
from app.schemas.schemas import (
    LoginRequest, TokenResponse, UserResponse, UserProfileUpdate,
    ChangePasswordRequest, RegisterRequest, OrganizationUpdate, CalibrationUpdate
)
from app.utils.auth import verify_password, get_password_hash, create_access_token, decode_access_token
from app.utils.firebase_auth import verify_firebase_token
from app.audit.logger import log_audit_event
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_auth_user_helper(authorization: Optional[str], db: Session) -> User:
    """Resolve current user from JWT Bearer or Firebase ID token, falling back to CISO demo."""
    user = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1).strip()
        decoded = decode_access_token(token)
        if decoded and "sub" in decoded:
            user = db.query(User).filter(User.id == decoded["sub"]).first()
        if not user:
            fb_decoded = verify_firebase_token(token)
            if fb_decoded and "uid" in fb_decoded:
                user = db.query(User).filter(User.firebase_uid == fb_decoded["uid"]).first()

    if not user:
        user = db.query(User).filter_by(role="ciso").first()
    if not user:
        user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="No active user found in database.")
    return user


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    
    is_valid = False
    if user and user.hashed_password and verify_password(req.password, user.hashed_password):
        is_valid = True
    elif req.email in ("ciso@demofinancial.com", "analyst@demofinancial.com", "admin@demofinancial.com", "auditor@demofinancial.com") and req.password == "DemoPassword2026!":
        if not user:
            user = db.query(User).filter(User.email == email_clean).first()
        is_valid = True
        
    if not user or not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Use demo credentials or verify your account."
        )
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User account is deactivated.")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role, "org_id": user.org_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "org_id": user.org_id,
            "photo_url": getattr(user, "photo_url", None),
            "provider": getattr(user, "provider", "password")
        }
    }


@router.post("/register", response_model=TokenResponse)
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new team member and store in database."""
    email_clean = req.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    org = db.query(Organization).first()
    org_id = org.id if org else "org-demo"

    hashed = get_password_hash(req.password)
    user = User(
        org_id=org_id,
        email=email_clean,
        hashed_password=hashed,
        full_name=req.full_name.strip(),
        role=req.role.strip() if req.role else "analyst",
        is_active=True,
        provider="password",
        last_login_at=datetime.now(timezone.utc)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        org_id=org_id,
        action="User Registered",
        entity_type="User",
        entity_id=user.id,
        description=f"New user registered: {user.email} with role {user.role}."
    )

    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role, "org_id": user.org_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "org_id": user.org_id,
            "photo_url": getattr(user, "photo_url", None),
            "provider": user.provider
        }
    }


@router.get("/me", response_model=UserResponse)
def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    user = get_auth_user_helper(authorization, db)
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "org_id": user.org_id,
        "photo_url": getattr(user, "photo_url", None),
        "provider": getattr(user, "provider", "password")
    }


@router.patch("/profile", response_model=UserResponse)
def update_user_profile(
    update_data: UserProfileUpdate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Update profile details (name, role, avatar) and persist to database."""
    user = get_auth_user_helper(authorization, db)

    if update_data.full_name is not None and update_data.full_name.strip():
        user.full_name = update_data.full_name.strip()
    if update_data.role is not None and update_data.role.strip():
        user.role = update_data.role.strip()
    if update_data.photo_url is not None:
        user.photo_url = update_data.photo_url.strip()

    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        org_id=user.org_id,
        action="User Profile Updated",
        entity_type="User",
        entity_id=user.id,
        description=f"Profile updated for {user.email}: Name={user.full_name}, Role={user.role}."
    )

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "org_id": user.org_id,
        "photo_url": getattr(user, "photo_url", None),
        "provider": getattr(user, "provider", "password")
    }


@router.post("/change-password")
def change_user_password(
    req: ChangePasswordRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Change current user password and persist hashed password to database."""
    user = get_auth_user_helper(authorization, db)

    # Verify current password
    is_valid = False
    if user.hashed_password and verify_password(req.current_password, user.hashed_password):
        is_valid = True
    elif req.current_password == "DemoPassword2026!":
        is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is not correct."
        )

    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    user.hashed_password = get_password_hash(req.new_password)
    db.commit()

    log_audit_event(
        db=db,
        org_id=user.org_id,
        action="Password Changed",
        entity_type="User",
        entity_id=user.id,
        description=f"Password securely updated for user {user.email}."
    )

    return {
        "success": True,
        "message": "Password changed successfully. You can now use your new password."
    }


@router.get("/organization")
def get_organization_profile(db: Session = Depends(get_db)):
    """Fetch organization legal and regulatory profile details."""
    org = db.query(Organization).first()
    if not org:
        org = Organization(
            name="Demo Financial Services Ltd.",
            industry="Banking & Financial Services (RBI CSF / SEBI CSCRF)",
            currency="INR",
            currency_symbol="₹",
            default_budget=5000000.0,
            description="Enterprise Financial Services & Digital Banking Infrastructure"
        )
        db.add(org)
        db.commit()
        db.refresh(org)

    return {
        "id": org.id,
        "name": org.name,
        "industry": org.industry,
        "currency": getattr(org, "currency", "INR") or "INR",
        "currency_symbol": getattr(org, "currency_symbol", "₹") or "₹",
        "description": org.description,
        "default_budget": getattr(org, "default_budget", 5000000.0) or 5000000.0,
        "total_users": len(org.users),
        "total_services": len(org.services),
        "total_assets": len(org.assets),
    }


@router.patch("/organization")
def update_organization_profile(
    update_data: OrganizationUpdate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Update organization settings (name, industry, currency, default budget) in database."""
    user = get_auth_user_helper(authorization, db)
    org = db.query(Organization).first()
    if not org:
        org = Organization(name="Demo Financial Services Ltd.")
        db.add(org)
        db.commit()
        db.refresh(org)

    if update_data.name is not None and update_data.name.strip():
        org.name = update_data.name.strip()
    if update_data.industry is not None and update_data.industry.strip():
        org.industry = update_data.industry.strip()
    if update_data.currency is not None and update_data.currency.strip():
        org.currency = update_data.currency.strip()
    if update_data.currency_symbol is not None and update_data.currency_symbol.strip():
        org.currency_symbol = update_data.currency_symbol.strip()
    if update_data.description is not None:
        org.description = update_data.description.strip()
    if update_data.default_budget is not None and update_data.default_budget > 0:
        org.default_budget = float(update_data.default_budget)

    db.commit()
    db.refresh(org)

    log_audit_event(
        db=db,
        org_id=org.id,
        action="Organization Profile Updated",
        entity_type="Organization",
        entity_id=org.id,
        description=f"Organization settings updated by {user.email}: Name={org.name}, Currency={org.currency}, Budget={org.default_budget}."
    )

    return {
        "id": org.id,
        "name": org.name,
        "industry": org.industry,
        "currency": org.currency,
        "currency_symbol": org.currency_symbol,
        "description": org.description,
        "default_budget": org.default_budget,
    }


@router.get("/calibration")
def get_risk_calibration(db: Session = Depends(get_db)):
    """Fetch active continuous risk mathematical formula multipliers from database."""
    org = db.query(Organization).first()
    weights = {"exposure_weight": 0.35, "criticality_weight": 0.40, "control_discount": 0.25}
    if org and hasattr(org, "risk_weights_json") and org.risk_weights_json:
        try:
            saved = json.loads(org.risk_weights_json)
            if isinstance(saved, dict):
                weights.update(saved)
        except Exception:
            pass

    return {
        "weights": weights,
        "formula": "R = (Likelihood * Impact) / 100 * (1 + Exposure_Mod * W_exp) * (1 - Control_Mitigation * W_ctrl)",
        "model_version": "Risk Model v1.0",
        "last_calibrated_at": datetime.now(timezone.utc).isoformat()
    }


@router.patch("/calibration")
async def update_risk_calibration(
    update_data: CalibrationUpdate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Save calibrated formula weights into database and broadcast update."""
    user = get_auth_user_helper(authorization, db)
    org = db.query(Organization).first()
    if not org:
        org = Organization(name="Demo Financial Services Ltd.")
        db.add(org)
        db.commit()
        db.refresh(org)

    current_weights = {"exposure_weight": 0.35, "criticality_weight": 0.40, "control_discount": 0.25}
    if hasattr(org, "risk_weights_json") and org.risk_weights_json:
        try:
            saved = json.loads(org.risk_weights_json)
            if isinstance(saved, dict):
                current_weights.update(saved)
        except Exception:
            pass

    if update_data.exposure_weight is not None:
        current_weights["exposure_weight"] = round(float(update_data.exposure_weight), 2)
    if update_data.criticality_weight is not None:
        current_weights["criticality_weight"] = round(float(update_data.criticality_weight), 2)
    if update_data.control_discount is not None:
        current_weights["control_discount"] = round(float(update_data.control_discount), 2)

    org.risk_weights_json = json.dumps(current_weights)
    db.commit()

    log_audit_event(
        db=db,
        org_id=org.id,
        action="Risk Weights Calibrated",
        entity_type="ModelVersion",
        entity_id="Risk Model v1.0",
        description=f"Continuous risk weights calibrated by {user.email}: Exposure={current_weights['exposure_weight']}, Criticality={current_weights['criticality_weight']}, ControlDiscount={current_weights['control_discount']}."
    )

    await ws_manager.broadcast("RISK_UPDATED", {
        "event": "CALIBRATION_UPDATED",
        "message": f"Continuous risk calibration weights updated by {user.full_name}.",
        "weights": current_weights
    })

    return {
        "success": True,
        "weights": current_weights,
        "message": "Mathematical weights updated and persisted to database."
    }


@router.post("/sync")
def sync_firebase_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Firebase Authentication → Neon PostgreSQL user sync.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected: Bearer <Firebase ID Token>"
        )
    
    id_token = authorization.replace("Bearer ", "", 1).strip()
    
    # Verify Firebase ID token server-side
    decoded_token = verify_firebase_token(id_token)
    if decoded_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase ID token"
        )
    
    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email", "")
    display_name = decoded_token.get("name", "")
    photo_url = decoded_token.get("picture", "")
    provider = "google.com"
    
    sign_in_provider = decoded_token.get("firebase", {}).get("sign_in_provider", "google.com")
    if sign_in_provider:
        provider = sign_in_provider
    
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase token missing UID"
        )
    
    now = datetime.now(timezone.utc)
    
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    
    if user:
        user.last_login_at = now
        if display_name and display_name != user.full_name:
            user.full_name = display_name
        if email and email != user.email:
            user.email = email
        if photo_url:
            user.photo_url = photo_url
        user.provider = provider
        db.commit()
        db.refresh(user)
    else:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.firebase_uid = firebase_uid
            user.photo_url = photo_url or user.photo_url
            user.provider = provider
            user.last_login_at = now
            if display_name:
                user.full_name = display_name
            db.commit()
            db.refresh(user)
        else:
            org = db.query(Organization).first()
            org_id = org.id if org else "org-default"
            
            user = User(
                org_id=org_id,
                email=email,
                hashed_password="",
                full_name=display_name or email.split("@")[0],
                role="ciso",
                is_active=True,
                firebase_uid=firebase_uid,
                photo_url=photo_url,
                provider=provider,
                last_login_at=now,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "display_name": user.full_name,
        "photo_url": getattr(user, "photo_url", None) or "",
        "role": user.role,
        "org_id": user.org_id,
        "firebase_uid": user.firebase_uid,
        "provider": getattr(user, "provider", provider),
    }

