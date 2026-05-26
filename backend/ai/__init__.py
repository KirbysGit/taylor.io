__all__ = [
    "tailor_resume",
    "build_tailor_context",
    "build_tailor_plan",
    "JobTailorSuggestRequest",
    "JobTailorSuggestResponse",
]


def __getattr__(name):
    if name == "tailor_resume":
        from .job_tailor_service import tailor_resume

        return tailor_resume
    if name == "build_tailor_context":
        from .processing import build_tailor_context

        return build_tailor_context
    if name == "build_tailor_plan":
        from .planning import build_tailor_plan

        return build_tailor_plan
    if name in {"JobTailorSuggestRequest", "JobTailorSuggestResponse"}:
        from .schemas import JobTailorSuggestRequest, JobTailorSuggestResponse

        return {
            "JobTailorSuggestRequest": JobTailorSuggestRequest,
            "JobTailorSuggestResponse": JobTailorSuggestResponse,
        }[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
