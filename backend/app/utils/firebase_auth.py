"""
Firebase ID Token verification for FastAPI.

Strategy (no service account required locally):
  1. Try firebase-admin SDK with service account (production).
  2. Try firebase-admin SDK with ADC / project-ID only (Cloud Run).
  3. Fall back to Firebase REST public-key verification via Google's
     tokeninfo endpoint — works everywhere with just FIREBASE_PROJECT_ID.
  4. In DEMO_MODE / development, if all else fails, decode the JWT claims
     without full signature verification so the demo flow still works.
"""
import os
import json
import base64
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

_firebase_app = None
_sdk_available = False


# ---------------------------------------------------------------------------
# Firebase Admin SDK initializer (best-effort)
# ---------------------------------------------------------------------------

def _try_init_firebase_sdk() -> bool:
    """Try to initialise firebase-admin SDK. Return True on success."""
    global _firebase_app, _sdk_available
    if _firebase_app is not None:
        return True
    try:
        import firebase_admin
        from firebase_admin import credentials, auth as _auth  # noqa: F401

        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "")
        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialised with service account")
            _sdk_available = True
            return True

        project_id = os.getenv("FIREBASE_PROJECT_ID", "")
        _firebase_app = firebase_admin.initialize_app(
            options={"projectId": project_id} if project_id else {}
        )
        logger.info(f"Firebase Admin SDK initialised (project={project_id or 'auto'})")
        _sdk_available = True
        return True
    except Exception as e:
        logger.warning(f"Firebase Admin SDK init failed (will use REST fallback): {e}")
        _sdk_available = False
        return False


# ---------------------------------------------------------------------------
# REST / JWT fallback — no credentials needed, only FIREBASE_PROJECT_ID
# ---------------------------------------------------------------------------

def _decode_jwt_payload(id_token: str) -> Optional[Dict[str, Any]]:
    """Base64-decode the JWT payload section (no signature verification)."""
    try:
        parts = id_token.split(".")
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_bytes.decode("utf-8"))
    except Exception as e:
        logger.debug(f"JWT payload decode error: {e}")
        return None


def _verify_via_rest(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Firebase ID token using Google's tokeninfo REST endpoint.
    Works without any service account or ADC — only needs FIREBASE_PROJECT_ID.
    """
    try:
        import urllib.request
        import urllib.parse
        import time

        url = (
            "https://www.googleapis.com/oauth2/v3/tokeninfo?"
            + urllib.parse.urlencode({"id_token": id_token})
        )
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        project_id = os.getenv("FIREBASE_PROJECT_ID", "")
        aud = data.get("aud", "")
        if project_id and aud != project_id:
            logger.warning(f"Token audience '{aud}' != project '{project_id}'")
            return None

        exp = int(data.get("exp", 0))
        if exp and exp < int(time.time()):
            logger.warning("Token expired (REST check)")
            return None

        return {
            "uid": data.get("sub", ""),
            "email": data.get("email", ""),
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "firebase": {"sign_in_provider": "google.com"},
        }
    except Exception as e:
        logger.warning(f"REST token verification failed: {e}")
        return None


def _verify_demo_fallback(id_token: str) -> Optional[Dict[str, Any]]:
    """
    In DEMO_MODE / development: decode JWT claims without signature check.
    Only used as last resort so the demo/local flow never breaks.
    """
    env = os.getenv("ENVIRONMENT", "development").lower()
    demo = os.getenv("DEMO_MODE", "false").lower() == "true"
    if env not in ("development", "demo") and not demo:
        return None

    payload = _decode_jwt_payload(id_token)
    if not payload:
        return None

    import time
    exp = int(payload.get("exp", 0))
    if exp and exp < int(time.time()):
        logger.warning("Token expired (demo fallback)")
        return None

    logger.info("Firebase token verified via demo/dev fallback (no signature check)")
    return {
        "uid": payload.get("sub", payload.get("user_id", "")),
        "email": payload.get("email", ""),
        "name": payload.get("name", ""),
        "picture": payload.get("picture", ""),
        "firebase": {
            "sign_in_provider": payload.get("firebase", {}).get(
                "sign_in_provider", "google.com"
            )
        },
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def verify_firebase_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verify a Firebase ID token and return decoded claims.

    Verification order:
      1. firebase-admin SDK (production / Cloud Run with ADC or service account)
      2. Google tokeninfo REST API (no credentials needed — works locally)
      3. JWT payload decode — demo/dev only, no signature verification

    Returns dict with uid, email, name, picture, firebase claims on success.
    Returns None on failure.
    """
    if not id_token:
        return None

    # ── 1. Try firebase-admin SDK ──────────────────────────────────────────
    if _try_init_firebase_sdk():
        try:
            import firebase_admin.auth as _fb_auth
            decoded = _fb_auth.verify_id_token(id_token)
            return decoded
        except Exception as e:
            err_str = str(e).lower()
            if "credentials" in err_str or "default credentials" in err_str or "adc" in err_str:
                logger.warning(
                    "Firebase Admin SDK has no ADC — falling back to REST verification"
                )
            else:
                logger.warning(f"Firebase Admin SDK verification failed: {e}")

    # ── 2. REST fallback (works locally, no service account needed) ────────
    result = _verify_via_rest(id_token)
    if result:
        logger.info("Firebase token verified via Google tokeninfo REST API")
        return result

    # ── 3. Demo/dev fallback ───────────────────────────────────────────────
    result = _verify_demo_fallback(id_token)
    if result:
        return result

    logger.error("All Firebase token verification methods exhausted — token rejected")
    return None
