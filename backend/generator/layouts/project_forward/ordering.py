# Defines the ordering of sections in the project-forward layout.

from __future__ import annotations

from ..common import raw_body_order

projectPriority = ["summary", "projects", "experience", "skills", "education"]


def project_forward_body_order(resumeData):
    rawOrder = raw_body_order(resumeData)
    seen = set()
    ordered = []

    for key in projectPriority:
        if key in rawOrder and key not in seen:
            ordered.append(key)
            seen.add(key)

    for key in rawOrder:
        if key not in seen:
            ordered.append(key)
            seen.add(key)

    return ordered
