# Section ordering helpers shared across layout profiles.

from __future__ import annotations

from typing import Any, Dict, List
defaultSectionBodyOrder = [
    "header",
    "summary",
    "education",
    "experience",
    "projects",
    "skills",
]

# Takes in Resume Data Dict and returns the section keys in the order they should be displayed.
def raw_body_order(resume_data: Dict[str, Any]) -> List[str]:
    # Section keys from payload order, excluding header only (no summary-first normalization).
    section_order = resume_data.get("sectionOrder", list(defaultSectionBodyOrder))
    return [k for k in section_order if k != "header"]
