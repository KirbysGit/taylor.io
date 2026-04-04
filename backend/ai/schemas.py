from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class JobTailorSuggestion(BaseModel):
    section: str = Field(..., description="Resume section key, e.g. summary/experience/skills")
    action: Literal["rewrite", "emphasize", "reorder", "suggest_addition", "keyword_gap"]
    before: Optional[str] = None
    after: str
    reason: str
    confidence: float = Field(ge=0.0, le=1.0, default=0.75)


class JobTailorSuggestRequest(BaseModel):
    job_description: str = Field(min_length=40, max_length=24000)
    resume_data: Dict[str, Any] = Field(default_factory=dict)
    template_name: Optional[str] = Field(default="classic")
    target_role: Optional[str] = Field(default=None, max_length=180)
    style_preferences: Optional[Dict[str, Any]] = None
    strict_truth: bool = True


class JobTailorSuggestResponse(BaseModel):
    prompt_version: str
    model: str
    summary: str
    ats_keywords: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    suggestions: List[JobTailorSuggestion] = Field(default_factory=list)
    suggested_resume_data: Dict[str, Any] = Field(default_factory=dict)
    usage: Dict[str, Any] = Field(default_factory=dict)
