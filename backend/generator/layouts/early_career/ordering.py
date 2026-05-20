# Defines the ordering of sections in the early-career layout.

from __future__ import annotations

from ..common import raw_body_order

earlyCareerPriority = ["summary", "education", "projects", "experience", "skills"]


def early_career_body_order(resumeData):
    rawOrder = raw_body_order(resumeData)
    seen = set()
    ordered = []

    for key in earlyCareerPriority:
        if key in rawOrder and key not in seen:
            ordered.append(key)
            seen.add(key)

    for key in rawOrder:
        if key not in seen:
            ordered.append(key)
            seen.add(key)

    return ordered
