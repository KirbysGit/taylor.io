from fastapi import APIRouter, Depends

from ai import tailor_resume, JobTailorSuggestRequest, JobTailorSuggestResponse
from models import User
from .auth import get_current_user_from_token

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/job-tailor/tailor", response_model=JobTailorSuggestResponse)
async def suggest_job_tailor(payload: JobTailorSuggestRequest, current_user: User = Depends(get_current_user_from_token)):
    return tailor_resume(payload, user_id=current_user.id)
