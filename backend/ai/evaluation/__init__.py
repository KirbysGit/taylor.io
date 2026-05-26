"""Lightweight evaluation helpers for resume tailoring debug snapshots."""

__all__ = ["score_tailor_run"]


def __getattr__(name):
    if name == "score_tailor_run":
        from .score_tailor_run import score_tailor_run

        return score_tailor_run
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
