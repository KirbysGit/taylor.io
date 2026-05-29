# parsers/projects_parser.py

# Projects extraction.

import re
from typing import Dict, List, Optional, Tuple


BULLET_RE = re.compile(r"^\s*(?:[-*•∙▪▫]|â€¢|âˆ™|â–ª|â–«)\s*", re.MULTILINE)
URL_RE = re.compile(r"https?://[^\s|,]+", re.IGNORECASE)
BARE_DOMAIN_RE = re.compile(
    r"\b(?:www\.)?(?:[A-Za-z0-9-]+\.)+(?:com|dev|io|app|net|org|co|edu)(?:/[^\s|,]*)?\b",
    re.IGNORECASE,
)
TRAILING_DATE_RE = re.compile(
    r"\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"\s+\d{4}(?:\s*[-–—]\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|"
    r"Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?"
    r"\d{4}|present|current)?\s*$",
    re.IGNORECASE,
)
TECH_HINT_RE = re.compile(
    r"\b("
    r"python|sql|javascript|typescript|java|react|next\.?js|node\.?js|"
    r"fastapi|django|flask|postgresql|postgres|mysql|mongodb|sqlite|"
    r"aws|ec2|vercel|firebase|supabase|tailwind|framer|"
    r"openai|api|rest|graphql|plaid|finbert|xgboost|"
    r"pytorch|tensorflow|tensorflow lite|opencv|scikit-learn|sklearn|numpy|pandas|"
    r"flutter|dart|arduino|c\+\+|html|css"
    r")\b",
    re.IGNORECASE,
)
SENTENCE_FRAGMENT_RE = re.compile(
    r"^(?:and|or|but|with|without|using|through|for|to|in|on|by|from|as|"
    r"enabling|improving|supporting|streamlining|providing|facilitating)\b",
    re.IGNORECASE,
)


def _is_bullet_line(line: str) -> bool:
    return bool(BULLET_RE.match(line or ""))


def _strip_bullet(line: str) -> str:
    return BULLET_RE.sub("", line or "", count=1).strip()


def _looks_like_tech_stack(text: str) -> bool:
    text = (text or "").strip()
    if not text:
        return False
    if URL_RE.search(text) or BARE_DOMAIN_RE.search(text):
        return True
    if TECH_HINT_RE.search(text):
        return True

    comma_parts = [part.strip() for part in re.split(r"[,|]", text) if part.strip()]
    if len(comma_parts) >= 2 and all(len(part.split()) <= 4 for part in comma_parts):
        return True
    return False


def _reject_header_reason(line: str) -> Optional[str]:
    stripped = (line or "").strip()
    if not stripped:
        return "empty"
    if _is_bullet_line(stripped):
        return "bullet_line"
    if SENTENCE_FRAGMENT_RE.match(stripped):
        return "sentence_fragment"
    if len(stripped) < 6:
        return "too_short"
    if stripped.endswith(".") and "|" not in stripped:
        return "sentence_like"
    return None


def is_project_header(line: str) -> bool:
    """Return true only for lines that look like project title/stack headers."""
    reason = _reject_header_reason(line)
    if reason:
        return False

    stripped = line.strip()
    if "|" not in stripped:
        return False

    parts = [part.strip() for part in stripped.split("|")]
    title = parts[0] if parts else ""
    rest = " | ".join(parts[1:])
    if not title or not rest:
        return False
    if len(title.split()) > 12:
        return False
    if title.endswith((".", ",", ";", ":")):
        return False
    return _looks_like_tech_stack(rest)


def _looks_like_project_title_line(line: str) -> bool:
    reason = _reject_header_reason(line)
    if reason:
        return False
    stripped = line.strip()
    if "|" in stripped or _looks_like_tech_stack(stripped):
        return False
    if stripped[0].islower() or stripped.endswith((",", ";", ":")):
        return False
    if len(stripped.split()) > 12:
        return False
    return True


def is_wrapped_bullet_continuation(line: str, previous_line: str) -> bool:
    """Detect text that likely continues the previous bullet after PDF wrapping."""
    stripped = (line or "").strip()
    previous = (previous_line or "").strip()
    if not stripped or not previous:
        return False
    if _is_bullet_line(stripped) or is_project_header(stripped):
        return False
    if "|" in stripped and _looks_like_tech_stack(stripped.split("|", 1)[-1]):
        return False
    if _is_bullet_line(previous):
        return True
    if stripped[0].islower():
        return True
    if SENTENCE_FRAGMENT_RE.match(stripped):
        return True
    return False


def _parse_project_header(line: str) -> Dict[str, Optional[str]]:
    parts = [part.strip() for part in line.split("|")]
    title = _normalize_title(parts[0])
    tech_stack_str = "|".join(parts[1:]).strip() if len(parts) > 1 else ""
    tech_stack_str = _strip_trailing_project_date(tech_stack_str)

    urls_found = URL_RE.findall(tech_stack_str)
    bare_domains_found = [
        url for url in BARE_DOMAIN_RE.findall(tech_stack_str)
        if not re.search(r"@", url)
    ]
    all_urls = urls_found + [url for url in bare_domains_found if url not in urls_found]
    project_url = all_urls[0] if all_urls else None

    for url in all_urls:
        tech_stack_str = tech_stack_str.replace(url, "").strip()
    tech_stack_str = re.sub(r"[,|]\s*[,|]+", ",", tech_stack_str).strip(" ,|")

    tech_stack = []
    if tech_stack_str:
        tech_stack = [
            item.strip()
            for item in re.split(r"[,|]", tech_stack_str)
            if item.strip() and not URL_RE.match(item.strip())
        ]

    return {
        "title": title,
        "description": None,
        "techStack": tech_stack,
        "url": project_url,
    }


def _parse_two_line_project_header(title_line: str, stack_line: str) -> Dict[str, Optional[str]]:
    return _parse_project_header(f"{title_line.strip()} | {stack_line.strip()}")


def _normalize_title(title: str) -> str:
    title = re.sub(r"\s*([–—])\s*", r" \1 ", title or "")
    title = re.sub(r"\s+", " ", title)
    return title.strip()


def _strip_trailing_project_date(text: str) -> str:
    return TRAILING_DATE_RE.sub("", text or "").strip(" ,|")


def _clean_description(description_lines: Optional[List[str]]) -> Optional[List[str] | str]:
    if not description_lines:
        return None

    description = "\n".join(description_lines)
    description = BULLET_RE.sub("• ", description)

    bullet_items = []
    current_bullet = []
    for raw_line in description.split("\n"):
        stripped = raw_line.strip()
        if not stripped:
            continue
        if stripped.startswith("•"):
            if current_bullet:
                bullet_text = " ".join(current_bullet)
                bullet_text = re.sub(r"^•\s+", "", bullet_text).strip()
                if bullet_text:
                    bullet_items.append(bullet_text)
            current_bullet = [stripped]
        elif current_bullet:
            current_bullet.append(stripped)
        else:
            bullet_items.append(stripped)

    if current_bullet:
        bullet_text = " ".join(current_bullet)
        bullet_text = re.sub(r"^•\s+", "", bullet_text).strip()
        if bullet_text:
            bullet_items.append(bullet_text)

    cleaned_items = []
    for item in bullet_items:
        item = re.sub(r"[ \t]+", " ", item)
        item = re.sub(r"\s+([,\.;:!?])", r"\1", item).strip()
        if item:
            cleaned_items.append(item)

    if cleaned_items:
        return cleaned_items

    compact_lines = [line.strip() for line in description.split("\n") if line.strip()]
    if len(compact_lines) > 1:
        return compact_lines
    return description.strip() if description.strip() else None


def _finalize_project(project: Optional[Dict[str, Optional[str]]]) -> Optional[Dict[str, Optional[str]]]:
    if not project or not project.get("title"):
        return None
    finalized = dict(project)
    description = finalized.get("description")
    finalized["description"] = _clean_description(description if isinstance(description, list) else None)
    return finalized


def _header_debug_entry(line_number: int, line: str, accepted: bool, reason: str) -> Dict[str, object]:
    return {
        "lineNumber": line_number,
        "line": line,
        "accepted": accepted,
        "reason": reason,
    }


def _header_rejection_reason(line: str) -> str:
    reason = _reject_header_reason(line)
    if reason:
        return reason
    if "|" not in line:
        return "no_header_separator"
    parts = [part.strip() for part in line.split("|")]
    if not parts or not parts[0]:
        return "missing_title"
    if len(parts[0].split()) > 12:
        return "title_too_long"
    if not _looks_like_tech_stack("|".join(parts[1:])):
        return "no_tech_or_url_signal"
    return "not_project_header"


def parse_projects_with_debug(section_text: str) -> Tuple[List[Dict[str, Optional[str]]], Dict[str, object]]:
    """Extract projects and parser diagnostics from projects section text."""
    debug = {
        "headerCandidates": [],
        "acceptedHeaders": [],
        "rejectedHeaders": [],
        "wrappedContinuations": [],
    }
    if not section_text or not section_text.strip():
        return [], debug

    source_lines = [line.strip() for line in section_text.split("\n") if line.strip()]
    projects = []
    current_project = None
    previous_line = ""

    index = 0
    while index < len(source_lines):
        line = source_lines[index]
        line_number = index + 1
        header_candidate = "|" in line and not _is_bullet_line(line)
        accepted_header = is_project_header(line)
        accepted_two_line_header = False

        if (
            not accepted_header
            and _looks_like_project_title_line(line)
            and index + 1 < len(source_lines)
            and not _is_bullet_line(source_lines[index + 1])
            and _looks_like_tech_stack(_strip_trailing_project_date(source_lines[index + 1]))
        ):
            accepted_two_line_header = True

        if header_candidate or accepted_header or accepted_two_line_header:
            reason = "accepted" if accepted_header else _header_rejection_reason(line)
            if accepted_two_line_header:
                reason = "accepted_two_line_header"
            entry = _header_debug_entry(line_number, line, accepted_header or accepted_two_line_header, reason)
            debug["headerCandidates"].append(entry)
            if accepted_header or accepted_two_line_header:
                debug["acceptedHeaders"].append(entry)
            else:
                debug["rejectedHeaders"].append(entry)

        if accepted_two_line_header:
            finalized = _finalize_project(current_project)
            if finalized:
                projects.append(finalized)
            current_project = _parse_two_line_project_header(line, source_lines[index + 1])
            previous_line = source_lines[index + 1]
            index += 2
            continue

        if accepted_header:
            finalized = _finalize_project(current_project)
            if finalized:
                projects.append(finalized)
            current_project = _parse_project_header(line)
            previous_line = line
            index += 1
            continue

        if not current_project:
            previous_line = line
            index += 1
            continue

        urls_in_line = URL_RE.findall(line)
        if urls_in_line and not current_project.get("url"):
            current_project["url"] = urls_in_line[0]
            for url in urls_in_line:
                line = line.replace(url, "").strip()
            line = re.sub(r"\s+", " ", line).strip()

        if not line:
            previous_line = line
            index += 1
            continue

        if current_project.get("description") is None:
            current_project["description"] = []

        description_lines = current_project["description"]
        if (
            isinstance(description_lines, list)
            and description_lines
            and is_wrapped_bullet_continuation(line, previous_line)
        ):
            description_lines[-1] = f"{description_lines[-1].rstrip()} {_strip_bullet(line)}".strip()
            debug["wrappedContinuations"].append({
                "lineNumber": line_number,
                "line": line,
                "previousLine": previous_line,
                "projectTitle": current_project.get("title"),
            })
        elif isinstance(description_lines, list):
            description_lines.append(line)

        previous_line = line
        index += 1

    finalized = _finalize_project(current_project)
    if finalized:
        projects.append(finalized)

    debug["projectCount"] = len(projects)
    debug["projectTitles"] = [project.get("title") for project in projects]
    return projects, debug


def parse_projects(section_text: str) -> List[Dict[str, Optional[str]]]:
    """Extract projects from projects section text."""
    projects, _debug = parse_projects_with_debug(section_text)
    return projects
