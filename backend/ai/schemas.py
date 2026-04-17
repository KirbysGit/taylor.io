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


class SectionOptimizationSummary(BaseModel):
    before: Optional[str] = None
    after: str
    reason: str
    confidence: float = Field(ge=0.0, le=1.0, default=0.75)


class SectionOptimizationItem(BaseModel):
    item_id: str = Field(..., min_length=1)
    section: Literal["experience", "projects"]
    decision: Literal["keep", "rewrite", "downrank", "omit"] = "keep"
    before: Optional[str] = None
    after: Optional[str] = None
    reason: str = ""
    confidence: float = Field(ge=0.0, le=1.0, default=0.7)
    jd_alignment_score: float = Field(ge=0.0, le=1.0, default=0.0)
    evidence_strength_score: float = Field(ge=0.0, le=1.0, default=0.0)
    risk_score: float = Field(ge=0.0, le=1.0, default=0.0)
    overall_priority: float = Field(ge=0.0, le=1.0, default=0.0)


class SectionOptimizationSkills(BaseModel):
    mode: Literal["reorder_verified_front"] = "reorder_verified_front"
    before: List[str] = Field(default_factory=list)
    after: List[str] = Field(default_factory=list)
    reason: str = ""
    confidence: float = Field(ge=0.0, le=1.0, default=0.72)


class SectionOptimizations(BaseModel):
    summary: Optional[SectionOptimizationSummary] = None
    experience: List[SectionOptimizationItem] = Field(default_factory=list)
    projects: List[SectionOptimizationItem] = Field(default_factory=list)
    skills: Optional[SectionOptimizationSkills] = None


class JobTailorSuggestRequest(BaseModel):
    job_description: str = Field(min_length=40, max_length=24000)
    resume_data: Dict[str, Any] = Field(default_factory=dict)
    template_name: Optional[str] = Field(default="classic")
    target_role: Optional[str] = Field(default=None, max_length=180)
    company: Optional[str] = Field(default=None, max_length=180)
    style_preferences: Optional[Dict[str, Any]] = None
    strict_truth: bool = True


class JobTailorSuggestResponse(BaseModel):
    prompt_version: str
    model: str
    summary: str
    ats_keywords: List[str] = Field(default_factory=list)
    verified_ats_keywords: List[str] = Field(default_factory=list)
    core_verified_keywords: List[str] = Field(default_factory=list)
    supporting_verified_keywords: List[str] = Field(default_factory=list)
    target_gap_keywords: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    suggestions: List[JobTailorSuggestion] = Field(default_factory=list)
    section_optimizations: SectionOptimizations = Field(default_factory=SectionOptimizations)
    suggested_resume_data_patch: Dict[str, Any] = Field(default_factory=dict)
    suggested_resume_data: Dict[str, Any] = Field(default_factory=dict)
    classified_changes: List[Dict[str, Any]] = Field(default_factory=list)
    reasoning_feed: Dict[str, Any] = Field(default_factory=dict)
    usage: Dict[str, Any] = Field(default_factory=dict)
