import hashlib
import hmac
import os
import secrets
import time
from typing import Optional


def _secret_key() -> bytes:
    key = os.getenv("DINO_SECRET_KEY", "")
    if not key:
        import logging
        logger = logging.getLogger(__name__)
        if os.getenv("DINO_ENV", "").lower() == "production":
            logger.error("DINO_SECRET_KEY not set in production! Session tokens are forgeable. Exiting.")
            raise RuntimeError("DINO_SECRET_KEY must be set in production. Generate with: python -c \"import secrets; print(secrets.token_hex(32))\"")
        logger.warning("DINO_SECRET_KEY not set - using insecure dev key. Set DINO_SECRET_KEY in production!")
        return b"dev-only-insecure-key-do-not-use-in-prod"
    return key.encode("utf-8")


def sign_value(value: str, expires_in_seconds: int) -> str:
    expires_at = int(time.time()) + expires_in_seconds
    nonce = secrets.token_hex(8)
    payload = f"{value}.{expires_at}.{nonce}"
    signature = hmac.new(_secret_key(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def verify_signed_value(token: str) -> Optional[str]:
    parts = token.split(".")
    if len(parts) != 4:
        return None
    value, expires_at_raw, nonce, signature = parts
    payload = f"{value}.{expires_at_raw}.{nonce}"
    expected = hmac.new(_secret_key(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return None
    if int(expires_at_raw) < int(time.time()):
        return None
    return value
