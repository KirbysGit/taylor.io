# routers/auth.py

from datetime import datetime, timedelta
import logging
import os
import secrets
from urllib.parse import quote

import httpx
from sqlalchemy.orm import Session
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response, status
from fastapi.responses import RedirectResponse

from models import User
from database import get_db
from schemas import (
    AuthStatusResponse,
    AuthUserResponse,
    EmailRequest,
    ResetPasswordRequest,
    UserCreate,
    UserResponse,
    UserLogin,
)
from .security import (
    AUTH_COOKIE_NAME,
    clear_session_cookie,
    constant_time_equals,
    create_access_token,
    get_password_hash,
    set_session_cookie,
    token_hash,
    verify_password,
    verify_token,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


def _frontend_url() -> str:
    return (os.getenv("FRONTEND_URL") or "http://localhost:5173").rstrip("/")


def _verification_ttl() -> timedelta:
    return timedelta(hours=int(os.getenv("EMAIL_VERIFICATION_TTL_HOURS", "24")))


def _reset_ttl() -> timedelta:
    return timedelta(minutes=int(os.getenv("PASSWORD_RESET_TTL_MINUTES", "60")))


def _new_raw_token() -> str:
    return secrets.token_urlsafe(32)


async def _send_resend_email(*, to_email: str, subject: str, html: str) -> None:
    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    from_email = (os.getenv("EMAIL_FROM") or "").strip()
    if not api_key or not from_email:
        logger.warning("Email not sent; RESEND_API_KEY or EMAIL_FROM is missing. subject=%s to=%s", subject, to_email)
        return

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": from_email, "to": [to_email], "subject": subject, "html": html},
        )
        if response.status_code >= 400:
            logger.error("Resend email failed: status=%s body=%s", response.status_code, response.text[:500])
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not send email. Please try again.")


async def _send_verification_email(user: User) -> None:
    raw_token = _new_raw_token()
    user.email_verification_token_hash = token_hash(raw_token)
    user.email_verification_expires_at = datetime.utcnow() + _verification_ttl()
    link = f"{_frontend_url()}/auth/verify-email?token={quote(raw_token)}"
    logger.info("Verification link generated for %s: %s", user.email, link)
    await _send_resend_email(
        to_email=user.email,
        subject="Verify your Taylor account",
        html=f"""
            <div style="font-family:Arial,sans-serif;line-height:1.55;color:#222">
                <h2>Verify your Taylor account</h2>
                <p>Confirm your email so you can start building tailored resumes.</p>
                <p><a href="{link}" style="display:inline-block;background:#d65656;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Verify email</a></p>
                <p>If the button does not work, copy this link into your browser:</p>
                <p>{link}</p>
            </div>
        """,
    )


async def _send_password_reset_email(user: User) -> None:
    raw_token = _new_raw_token()
    user.password_reset_token_hash = token_hash(raw_token)
    user.password_reset_expires_at = datetime.utcnow() + _reset_ttl()
    link = f"{_frontend_url()}/auth/reset-password?token={quote(raw_token)}"
    logger.info("Password reset link generated for %s: %s", user.email, link)
    await _send_resend_email(
        to_email=user.email,
        subject="Reset your Taylor password",
        html=f"""
            <div style="font-family:Arial,sans-serif;line-height:1.55;color:#222">
                <h2>Reset your Taylor password</h2>
                <p>Use this link to set a new password. It expires soon for your security.</p>
                <p><a href="{link}" style="display:inline-block;background:#d65656;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Reset password</a></p>
                <p>If you did not request this, you can ignore this email.</p>
            </div>
        """,
    )


def _find_user_by_token_hash(db: Session, raw_token: str, hash_field: str, expires_field: str) -> User | None:
    hashed = token_hash(raw_token)
    candidates = db.query(User).filter(getattr(User, hash_field).isnot(None)).all()
    now = datetime.utcnow()
    for user in candidates:
        stored = getattr(user, hash_field) or ""
        expires = getattr(user, expires_field)
        if expires and expires < now:
            continue
        if constant_time_equals(stored, hashed):
            return user
    return None


@router.post("/register", response_model=AuthStatusResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    email = str(user_data.email).lower()
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    new_user = User(
        first_name=user_data.first_name.strip(),
        last_name=user_data.last_name.strip(),
        email=email,
        password_hash=get_password_hash(user_data.password),
        email_verified=False,
    )
    db.add(new_user)
    db.flush()
    await _send_verification_email(new_user)
    db.commit()
    return {"status": "verification_required", "email": new_user.email, "message": "Check your email to verify your account."}


@router.post("/login", response_model=AuthUserResponse)
async def login(credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(credentials.email).lower()).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "email_not_verified", "message": "Please verify your email before signing in.", "email": user.email},
        )
    access_token = create_access_token(data={"sub": user.email})
    set_session_cookie(response, access_token)
    return {"user": UserResponse.model_validate(user)}


@router.post("/logout", response_model=AuthStatusResponse)
async def logout(response: Response):
    clear_session_cookie(response)
    return {"status": "ok", "message": "Logged out."}


async def get_current_user_from_token(
    authorization: str = Header(None),
    taylor_session: str | None = Cookie(None, alias=AUTH_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    token = taylor_session
    if not token and authorization:
        try:
            parts = authorization.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
        except (ValueError, IndexError):
            token = None
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not Authorized. Must Login to Access.")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or Expired Token. Please Login Again.")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Token Payload. Please Login Again.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User Not Found. Please Login Again.")
    if not user.email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please verify your email before continuing.")
    return user


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user_from_token)):
    return UserResponse.model_validate(current_user)


@router.post("/resend-verification", response_model=AuthStatusResponse)
async def resend_verification(payload: EmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if user and not user.email_verified:
        await _send_verification_email(user)
        db.commit()
    return {"status": "ok", "email": payload.email, "message": "If the account needs verification, a new email was sent."}


@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    user = _find_user_by_token_hash(db, token, "email_verification_token_hash", "email_verification_expires_at")
    if not user:
        return RedirectResponse(f"{_frontend_url()}/auth?mode=login&verified=0", status_code=status.HTTP_302_FOUND)
    user.email_verified = True
    user.email_verified_at = datetime.utcnow()
    user.email_verification_token_hash = None
    user.email_verification_expires_at = None
    db.commit()
    return RedirectResponse(f"{_frontend_url()}/auth?mode=login&verified=1", status_code=status.HTTP_302_FOUND)


@router.post("/forgot-password", response_model=AuthStatusResponse)
async def forgot_password(payload: EmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if user:
        await _send_password_reset_email(user)
        db.commit()
    return {"status": "ok", "message": "If an account exists, we sent a reset link."}


@router.post("/reset-password", response_model=AuthStatusResponse)
async def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.password or "") < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters.")
    user = _find_user_by_token_hash(db, payload.token, "password_reset_token_hash", "password_reset_expires_at")
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link expired or is invalid.")
    user.password_hash = get_password_hash(payload.password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    db.commit()
    return {"status": "ok", "message": "Password updated. You can sign in now."}
