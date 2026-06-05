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
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We hit a snag sending your email. Try again in a moment — if it keeps happening, reach out at hello@trytaylor.io")


def _email_shell(*, logo_url: str, heading: str, body_html: str, cta_url: str, cta_label: str, footer_note: str) -> str:
    """Shared HTML email shell — white card on cream, brand-pink CTA, logo top-left."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>{heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#fff8ef;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff8ef;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:20px;border:1px solid rgba(214,86,86,0.12);box-shadow:0 24px 64px -24px rgba(120,40,40,0.18);">

          <!-- Logo row -->
          <tr>
            <td style="padding:28px 32px 20px;">
              <img src="{logo_url}" alt="taylor" height="36" style="display:block;height:36px;width:auto;" />
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:linear-gradient(to right,rgba(214,86,86,0.18),rgba(214,86,86,0.06));"></div>
            </td>
          </tr>

          <!-- Heading + body -->
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;line-height:1.15;color:#1a0f0f;letter-spacing:-0.3px;">{heading}</h1>
              <div style="font-size:15px;line-height:1.65;color:#4b3535;">
                {body_html}
              </div>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <a href="{cta_url}"
                 style="display:inline-block;background-color:#d65656;color:#ffffff;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;letter-spacing:0.1px;">
                {cta_label} &rarr;
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:28px 32px 0;">
              <div style="height:1px;background:rgba(214,86,86,0.10);"></div>
            </td>
          </tr>

          <!-- Info rows -->
          <tr>
            <td style="padding:20px 32px 4px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="28" valign="top" style="padding-top:1px;">
                    <div style="width:20px;height:20px;border-radius:50%;background:#fff0f0;border:1px solid rgba(214,86,86,0.22);display:flex;align-items:center;justify-content:center;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:4px auto 0;">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#d65656" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#d65656" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </td>
                  <td style="font-size:12px;color:#7a5555;line-height:1.5;">
                    Button not working? Copy and paste this link into your browser:<br />
                    <a href="{cta_url}" style="color:#d65656;word-break:break-all;text-decoration:none;font-size:11px;">{cta_url}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 32px 4px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="28" valign="top" style="padding-top:1px;">
                    <div style="width:20px;height:20px;border-radius:50%;background:#fff0f0;border:1px solid rgba(214,86,86,0.22);">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:4px auto 0;">
                        <circle cx="12" cy="12" r="10" stroke="#d65656" stroke-width="2"/>
                        <polyline points="12 6 12 12 16 14" stroke="#d65656" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </td>
                  <td style="font-size:12px;color:#4b3535;font-weight:600;line-height:1.5;">{footer_note}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 28px;">
              <div style="height:1px;background:rgba(214,86,86,0.08);margin-bottom:20px;"></div>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:12px;color:#a07070;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#d65656" xmlns="http://www.w3.org/2000/svg" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    Questions? Email us at
                    <a href="mailto:hello@trytaylor.io" style="color:#d65656;text-decoration:none;">hello@trytaylor.io</a>
                  </td>
                  <td align="right">
                    <img src="{logo_url}" alt="taylor" height="22" style="display:block;height:22px;width:auto;opacity:0.55;" />
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:6px;font-size:11px;color:#c09090;">Build a resume that gets you hired.</td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>"""


async def _send_verification_email(user: User) -> None:
    raw_token = _new_raw_token()
    user.email_verification_token_hash = token_hash(raw_token)
    user.email_verification_expires_at = datetime.utcnow() + _verification_ttl()
    link = f"{_frontend_url()}/auth/verify-email?token={quote(raw_token)}"
    logo_url = f"{_frontend_url()}/lg_tr_logo.png"
    logger.info("Verification link generated for %s: %s", user.email, link)
    await _send_resend_email(
        to_email=user.email,
        subject="Confirm your email — taylor",
        html=_email_shell(
            logo_url=logo_url,
            heading="Confirm your email.",
            body_html="<p style='margin:0'>Thanks for signing up for taylor! Verify your email address to continue setting up your account and start building tailored resumes that stand out.</p>",
            cta_url=link,
            cta_label="Verify email",
            footer_note="This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.",
        ),
    )


async def _send_password_reset_email(user: User) -> None:
    raw_token = _new_raw_token()
    user.password_reset_token_hash = token_hash(raw_token)
    user.password_reset_expires_at = datetime.utcnow() + _reset_ttl()
    link = f"{_frontend_url()}/auth/reset-password?token={quote(raw_token)}"
    logo_url = f"{_frontend_url()}/lg_tr_logo.png"
    logger.info("Password reset link generated for %s: %s", user.email, link)
    await _send_resend_email(
        to_email=user.email,
        subject="Reset your password — taylor",
        html=_email_shell(
            logo_url=logo_url,
            heading="Reset your password.",
            body_html="<p style='margin:0'>We received a request to reset your taylor password. Click below to choose a new one. If you didn't request this, you can safely ignore this email.</p>",
            cta_url=link,
            cta_label="Reset password",
            footer_note="This link expires in 60 minutes for your security.",
        ),
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with that email already exists — try signing in instead.")

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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong email or password — double-check and try again.")
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters long.")
    user = _find_user_by_token_hash(db, payload.token, "password_reset_token_hash", "password_reset_expires_at")
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link has expired or already been used — request a new one.")
    user.password_hash = get_password_hash(payload.password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    db.commit()
    return {"status": "ok", "message": "Password updated. You can sign in now."}
