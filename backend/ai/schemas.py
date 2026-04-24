from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class JobTailorSuggestRequest(BaseModel):
    job_description: str = Field(min_length=40, max_length=24000)
    resume_data: Dict[str, Any] = Field(default_factory=dict)
    template_name: Optional[str] = Field(default="classic")
    target_role: Optional[str] = Field(default=None, max_length=180)
    company: Optional[str] = Field(default=None, max_length=180)
    style_preferences: Optional[Dict[str, Any]] = None
    strict_truth: bool = True


class JobTailorSuggestResponse(BaseModel):
    updatedResumeData: Dict[str, Any]
    patchDiff: Dict[str, Any]
    changeReasons: List[Dict[str, Any]]
    warnings: List[str]
    # top-level tailoring changelog (merged model note + code changelog)
    summary: str = ""