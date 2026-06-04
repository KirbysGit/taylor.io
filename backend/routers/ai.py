from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ai import tailor_resume, JobTailorSuggestRequest, JobTailorSuggestResponse
from database import get_db
from models import User
from .auth import get_current_user_from_token

router = APIRouter(prefix="/api/ai", tags=["ai"])

DAILY_TAILOR_LIMIT = 5


def _check_and_increment_tailor_usage(user: User, db: Session) -> None:
    today = date.today()
    reset_date = user.daily_tailor_reset_date.date() if user.daily_tailor_reset_date else None

    if reset_date != today:
        user.daily_tailor_count = 0
        user.daily_tailor_reset_date = datetime.utcnow()

    if user.daily_tailor_count >= DAILY_TAILOR_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"You've used all {DAILY_TAILOR_LIMIT} tailors for today. Come back tomorrow.",
        )

    user.daily_tailor_count += 1
    db.commit()


@router.post("/job-tailor/tailor", response_model=JobTailorSuggestResponse)
async def suggest_job_tailor(
    payload: JobTailorSuggestRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    _check_and_increment_tailor_usage(current_user, db)
    return tailor_resume(payload, user_id=current_user.id)
