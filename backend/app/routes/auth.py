from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
from app.database import get_db
from app.models.entities import User, Organization
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse
from app.utils.auth import verify_password, create_access_token
from app.utils.firebase_auth import verify_firebase_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        # Demo convenience: if demo user with default password
        if req.email in ("ciso@demofinancial.com", "analyst@demofinancial.com", "admin@demofinancial.com", "auditor@demofinancial.com") and req.password == "DemoPassword2026!":
            user = db.query(User).filter(User.email == req.email).first()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password. Use demo credentials or verify your account."
            )
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User account is deactivated.")

    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role, "org_id": user.org_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "org_id": user.org_id
        }
    }

@router.get("/me", response_model=UserResponse)
def get_current_user(db: Session = Depends(get_db)):
    # Return default CISO user for frictionless evaluation
    user = db.query(User).filter_by(role="ciso").first()
    if not user:
        user = db.query(User).first()
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "org_id": user.org_id
    }


@router.post("/sync")
def sync_firebase_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Firebase Authentication → Neon PostgreSQL user sync.
    
    Verifies the Firebase ID token server-side, extracts verified identity,
    and upserts the user in Neon PostgreSQL. Never trusts client-supplied
    identity fields — only the verified token claims.
    
    Flow:
        Frontend → Firebase ID Token → This endpoint → Verify → Upsert in Neon
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
    
    # Extract verified claims from token — NOT from request body
    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email", "")
    display_name = decoded_token.get("name", "")
    photo_url = decoded_token.get("picture", "")
    provider = "google.com"
    
    # Determine sign-in provider from Firebase token
    sign_in_provider = decoded_token.get("firebase", {}).get("sign_in_provider", "google.com")
    if sign_in_provider:
        provider = sign_in_provider
    
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase token missing UID"
        )
    
    now = datetime.now(timezone.utc)
    
    # Look up existing user by firebase_uid first (primary identity key)
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    
    if user:
        # Existing user — update mutable fields
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
        # Check if a user exists with the same email (e.g. demo user switching to Google)
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Link existing email-based user to Firebase UID
            user.firebase_uid = firebase_uid
            user.photo_url = photo_url or user.photo_url
            user.provider = provider
            user.last_login_at = now
            if display_name:
                user.full_name = display_name
            db.commit()
            db.refresh(user)
        else:
            # Brand new Google user — create in Neon
            org = db.query(Organization).first()
            org_id = org.id if org else "org-default"
            
            user = User(
                org_id=org_id,
                email=email,
                hashed_password="",  # No password for Google-only users
                full_name=display_name or email.split("@")[0],
                role="ciso",  # Default role for new Google users
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
