from fastapi import APIRouter, Depends

from ai import JobTailorSuggestRequest, JobTailorSuggestResponse, build_job_tailor_suggestions
from models import User
from .auth import get_current_user_from_token

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/job-tailor/suggest", response_model=JobTailorSuggestResponse)
async def suggest_job_tailor(
    payload: JobTailorSuggestRequest,
    current_user: User = Depends(get_current_user_from_token),
) -> JobTailorSuggestResponse:
    return build_job_tailor_suggestions(payload, user_id=current_user.id)
