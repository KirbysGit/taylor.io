# parsers/experience_parser.py

# Work experience extraction.

import re
from typing import Dict, List, Optional, Tuple


BULLET_RE = re.compile(r"^\s*(?:[-*•∙▪▫]|â€¢|âˆ™|â–ª|â–«)\s*", re.MULTILINE)
DATE_RE = re.compile(
    r"([A-Z][a-z]+\s+\d{4}|\d{4})\s*[-–—]\s*"
    r"([A-Z][a-z]+\s+\d{4}|\d{4}|present|current)",
    re.IGNORECASE,
)
SINGLE_DATE_RE = re.compile(r"^[A-Z][a-z]+\s+\d{4}$", re.IGNORECASE)
YEAR_ONLY_RE = re.compile(r"\b((?:19|20)\d{2})(?:\s*[-–—]\s*(\d{2}|(?:19|20)\d{2}))?\b")
ORG_YEAR_LINE_RE = re.compile(r"(?:\||/)\s*(?:19|20)\d{2}(?:\s*[-–—]\s*(?:\d{2}|(?:19|20)\d{2}))?\s*$")
DATE_RE = re.compile(
    r"([A-Z][a-z]+\s+\d{4}|\d{4})\s*(?:-|–|—|â€“|â€”|ā€“)\s*"
    r"([A-Z][a-z]+\s+\d{4}|\d{4}|present|current)",
    re.IGNORECASE,
)
LOCATION_KEYWORD_RE = re.compile(r"^(Remote|On-site|Onsite|Hybrid)$", re.IGNORECASE)
ROLE_TYPE_RE = re.compile(r"^(Full-time|Part-time|Contract|Internship|Freelance|Temporary)$", re.IGNORECASE)
CITY_STATE_RE = re.compile(r"\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}),\s*([A-Z]{2})\b$")
TITLE_HINT_RE = re.compile(
    r"\b("
    r"engineer|developer|intern|analyst|manager|director|president|lead|"
    r"assistant|associate|consultant|specialist|coordinator|designer|officer|"
    r"server|host|expo|representative|technician|researcher|research|evaluation|annotation"
    r")\b",
    re.IGNORECASE,
)
CITY_PREFIXES = {
    "Santa",
    "San",
    "New",
    "Los",
    "Las",
    "Fort",
    "Saint",
    "St",
    "Mount",
    "Lake",
    "Port",
    "East",
    "West",
    "North",
    "South",
}
TECH_HINT_RE = re.compile(
    r"\b("
    r"python|sql|javascript|typescript|java|react|next\.?js|node\.?js|"
    r"fastapi|django|flask|postgresql|postgres|mysql|mongodb|sqlite|"
    r"aws|ec2|azure|gcp|docker|kubernetes|redis|celery|"
    r"openai|api|rest|graphql|pytorch|tensorflow|pandas|numpy|"
    r"salesforce|excel|tableau|power\s*bi"
    r")\b",
    re.IGNORECASE,
)
CONTINUATION_END_RE = re.compile(
    r"(?i)\b(?:across|through|with|including|and|or|for|to|of|in|on|by|from|using|leveraging|via)$|,$"
)

MONTH_MAP = {
    "january": "01",
    "jan": "01",
    "february": "02",
    "feb": "02",
    "march": "03",
    "mar": "03",
    "april": "04",
    "apr": "04",
    "may": "05",
    "june": "06",
    "jun": "06",
    "july": "07",
    "jul": "07",
    "august": "08",
    "aug": "08",
    "september": "09",
    "sep": "09",
    "sept": "09",
    "october": "10",
    "oct": "10",
    "november": "11",
    "nov": "11",
    "december": "12",
    "dec": "12",
}

DATE_RE = re.compile(
    r"([A-Z][a-z]+\s+\d{1,2},\s+\d{4}|[A-Z][a-z]+\s+\d{4}|\d{4})\s*(?:-|–|—|â€“|â€”|Ã¢â‚¬â€œ|Ã¢â‚¬â€|Äâ‚¬â€œ)\s*"
    r"([A-Z][a-z]+\s+\d{1,2},\s+\d{4}|[A-Z][a-z]+\s+\d{4}|\d{4}|present|current)",
    re.IGNORECASE,
)


def _is_bullet_line(line: str) -> bool:
    return bool(BULLET_RE.match(line or ""))


def _looks_like_location(text: str) -> bool:
    text = (text or "").strip()
    return bool(LOCATION_KEYWORD_RE.match(text) or CITY_STATE_RE.search(text))


def _looks_like_skills(text: str) -> bool:
    text = (text or "").strip()
    if not text:
        return False
    if TECH_HINT_RE.search(text):
        return True
    parts = [part.strip() for part in text.split(",") if part.strip()]
    return len(parts) >= 2 and all(len(part.split()) <= 4 for part in parts)


def _looks_like_title(text: str) -> bool:
    text = (text or "").strip()
    if not text or _is_bullet_line(text) or DATE_RE.search(text):
        return False
    if text.endswith((".", ",", ";", ":")):
        return False
    if _looks_like_location(text):
        return False
    if TITLE_HINT_RE.search(text):
        return True
    if _looks_like_skills(text):
        return False
    return 1 <= len(text.split()) <= 5 and not text.isupper()


def _has_title_hint(text: str) -> bool:
    return bool(TITLE_HINT_RE.search(text or ""))


def _looks_like_date_fragment(text: str) -> bool:
    return bool(re.match(r"^[A-Z][a-z]+(?:\s+\d{4})?\s*-?\s*$", (text or "").strip()))


def _normalize_experience_lines(lines: List[str]) -> List[str]:
    normalized = []
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        next_line = lines[index + 1].strip() if index + 1 < len(lines) else ""

        if line.endswith("-") and next_line and re.match(r"^[A-Z][A-Za-z]", next_line) and not _looks_like_date_fragment(next_line):
            normalized.append(f"{line[:-1]}-{next_line}")
            index += 2
            continue

        if (
            normalized
            and re.match(r"^\([^\)]{3,80}\)$", line)
            and _looks_like_title(normalized[-1])
        ):
            normalized[-1] = f"{normalized[-1]} {line}"
            index += 1
            continue

        if line.endswith("-") and next_line and _looks_like_date_fragment(next_line):
            normalized.append(f"{line} {next_line}")
            index += 2
            continue

        if re.match(r"^[A-Z][a-z]+$", line) and re.match(r"^\d{4}$", next_line):
            normalized.append(f"{line} {next_line}")
            index += 2
            continue

        normalized.append(line)
        index += 1

    return normalized


def _normalize_date(value: str) -> Optional[str]:
    value = (value or "").strip()
    if not value:
        return None
    if re.match(r"^\d{4}$", value):
        return f"{value}-01"
    if re.match(r"^\d{2}$", value):
        return f"20{value}-01"
    if re.match(r"^[A-Z][a-z]+\s+\d{4}$", value, re.IGNORECASE):
        parts = value.split()
        month = MONTH_MAP.get(parts[0].lower(), "01")
        return f"{parts[1]}-{month}"
    if re.match(r"^[A-Z][a-z]+\s+\d{1,2},\s+\d{4}$", value, re.IGNORECASE):
        parts = value.replace(",", "").split()
        month = MONTH_MAP.get(parts[0].lower(), "01")
        return f"{parts[2]}-{month}"
    return value


def _normalize_year_end(start_year: str, end_year: str | None) -> Optional[str]:
    if not end_year:
        return None
    if len(end_year) == 2:
        prefix = start_year[:2]
        end_year = f"{prefix}{end_year}"
    return f"{end_year}-01"


def _split_skills(text: str) -> Optional[List[str]]:
    if not _looks_like_skills(text):
        return None
    skills = [item.strip() for item in re.split(r"[,|]", text) if item.strip()]
    return skills or None


def _format_skills(skills: Optional[List[str]]) -> Optional[str]:
    if not skills:
        return None
    cleaned = []
    for skill in skills:
        skill = re.sub(r"\b(Remote|On-site|Onsite|Hybrid)\b", "", skill, flags=re.IGNORECASE)
        skill = re.sub(r"\s+", " ", skill).strip(" ,|-")
        if skill:
            cleaned.append(skill)
    return ", ".join(cleaned) if cleaned else None


def _extract_location_from_text(text: str) -> Tuple[str, Optional[str]]:
    text = (text or "").strip()
    if not text:
        return text, None

    keyword_match = re.search(r"\b(Remote|On-site|Onsite|Hybrid)\b", text, re.IGNORECASE)
    if keyword_match:
        location = keyword_match.group(1)
        text = re.sub(r"\s*\b" + re.escape(location) + r"\b\s*", " ", text, flags=re.IGNORECASE)
        return re.sub(r"\s+", " ", text).strip(" ,|-"), location

    city_state_match = CITY_STATE_RE.search(text)
    if city_state_match:
        before_comma = text[: text.rfind(",")].strip()
        state_code = city_state_match.group(2)
        words = before_comma.split()
        if not words:
            return text, None

        city_words = [words[-1]]
        if len(words) >= 2 and words[-2] in CITY_PREFIXES:
            city_words = words[-2:]

        city = " ".join(city_words)
        location = f"{city}, {state_code}"
        company_words = words[: -len(city_words)]
        text = " ".join(company_words).strip(" ,|-")
        return re.sub(r"\s+", " ", text).strip(), location

    return text, None


def _parse_company_line(company_line: str) -> Tuple[Optional[str], Optional[List[str]], Optional[str]]:
    company_line = re.sub(DATE_RE, "", company_line or "").strip()
    company_line = re.sub(r"(?:\||/)\s*(?:19|20)\d{2}(?:\s*[-–—]\s*(?:\d{2}|(?:19|20)\d{2}))?\s*$", "", company_line).strip()
    if not company_line:
        return None, None, None

    tab_parts = [part.strip() for part in re.split(r"\t+", company_line) if part.strip()]
    main_part = tab_parts[0] if tab_parts else company_line
    location = None

    for extra_part in tab_parts[1:]:
        if _looks_like_location(extra_part) and not location:
            _unused, location = _extract_location_from_text(extra_part)

    pipe_parts = [part.strip() for part in main_part.split("|") if part.strip()]
    company_name = pipe_parts[0] if pipe_parts else main_part
    skills = None

    for part in pipe_parts[1:]:
        part_without_location, part_location = _extract_location_from_text(part)
        if part_location and not location:
            location = part_location
        if _looks_like_location(part) and not skills:
            continue
        if _looks_like_skills(part_without_location) and not skills:
            skills = _split_skills(part_without_location)

    company_name, inline_location = _extract_location_from_text(company_name)
    if inline_location and not location:
        location = inline_location

    company_name = re.sub(
        r"\s+(Remote|On-site|Onsite|Hybrid|Full-time|Part-time|Contract|Internship|Freelance|Temporary)\s*$",
        "",
        company_name,
        flags=re.IGNORECASE,
    ).strip(" ,|-")

    if not company_name or re.match(r"^\d{4}", company_name):
        company_name = None

    return company_name, skills, location


def _extract_year_dates(line: str) -> Tuple[Optional[str], Optional[str], bool]:
    match = YEAR_ONLY_RE.search(line or "")
    if not match:
        return None, None, False
    start_year = match.group(1)
    end_year = match.group(2)
    return f"{start_year}-01", _normalize_year_end(start_year, end_year), False


def _format_description(description_lines: List[str]) -> Optional[str]:
    if not description_lines:
        return None

    merged_lines = []
    for raw_line in description_lines:
        line = (raw_line or "").strip()
        if not line:
            continue
        if (
            merged_lines
            and not _is_bullet_line(line)
            and (line[:1].islower() or CONTINUATION_END_RE.search(merged_lines[-1].strip()))
            and not re.search(r"[.!?%)]$", merged_lines[-1].strip())
        ):
            merged_lines[-1] = f"{merged_lines[-1].rstrip()} {line}"
        else:
            merged_lines.append(line)

    description = "\n".join(merged_lines)
    description = BULLET_RE.sub("• ", description)

    bullet_items = []
    current_bullet = []
    for raw_line in description.split("\n"):
        stripped = raw_line.strip()
        if not stripped:
            continue
        if stripped.startswith("•"):
            if current_bullet:
                bullet_items.append(_clean_bullet(" ".join(current_bullet)))
            current_bullet = [stripped]
        elif current_bullet:
            current_bullet.append(stripped)
        else:
            bullet_items.append(stripped)

    if current_bullet:
        bullet_items.append(_clean_bullet(" ".join(current_bullet)))

    cleaned_items = [_clean_bullet(item) for item in bullet_items if _clean_bullet(item)]
    if not cleaned_items:
        return None
    return "• " + "\n• ".join(cleaned_items)


def _clean_bullet(text: str) -> str:
    text = re.sub(r"^•\s+", "", text or "").strip()
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s+([,\.;:!?])", r"\1", text)
    return text.strip()


def _entry_start_indexes(lines: List[str]) -> List[int]:
    starts = [0]
    for index, line in enumerate(lines[1:], start=1):
        if ORG_YEAR_LINE_RE.search(line):
            starts.append(index)
            continue
        if (
            _looks_like_title(line)
            and index + 2 < len(lines)
            and (DATE_RE.search(lines[index + 1]) or SINGLE_DATE_RE.match(lines[index + 1]))
            and not DATE_RE.search(lines[index + 2])
        ):
            starts.append(index)
        if DATE_RE.search(line) and not _is_bullet_line(line):
            if index > 0 and _looks_like_title(lines[index - 1]):
                continue
            line_without_date = re.sub(DATE_RE, "", line).strip(" |-\t")
            if not line_without_date and index + 2 < len(lines) and _looks_like_title(lines[index + 2]):
                starts.append(index + 1)
            elif not line_without_date and index + 1 < len(lines) and index >= 2 and not _looks_like_title(lines[index - 1]):
                starts.append(index + 1)
            elif not line_without_date:
                continue
            else:
                starts.append(index)
    return sorted(set(start for start in starts if start < len(lines)))


def parse_experience(section_text: str) -> List[Dict[str, Optional[str]]]:
    """Extract work experience from experience section text."""
    if not section_text or not section_text.strip():
        return []

    lines = _normalize_experience_lines([line.strip() for line in section_text.split("\n") if line.strip()])
    if not lines:
        return []

    entry_starts = _entry_start_indexes(lines)
    entries = []
    for index, start_idx in enumerate(entry_starts):
        end_idx = entry_starts[index + 1] if index + 1 < len(entry_starts) else len(lines)
        entries.append(lines[start_idx:end_idx])

    experiences = []
    for entry_lines in entries:
        if not entry_lines or len("\n".join(entry_lines)) < 20:
            continue

        exp_item = {
            "title": None,
            "company": None,
            "description": None,
            "startDate": None,
            "endDate": None,
            "current": False,
            "location": None,
            "skills": None,
        }

        date_match = DATE_RE.search(entry_lines[0])
        date_line_idx = 0 if date_match else None
        if not date_match:
            for index, line in enumerate(entry_lines):
                date_match = DATE_RE.search(line)
                if date_match:
                    date_line_idx = index
                    break

        if date_match:
            exp_item["startDate"] = _normalize_date(date_match.group(1))
            end_date = date_match.group(2).strip().lower()
            if end_date in {"present", "current"}:
                exp_item["current"] = True
            else:
                exp_item["endDate"] = _normalize_date(date_match.group(2))
        elif ORG_YEAR_LINE_RE.search(entry_lines[0]):
            start_date, end_date, current = _extract_year_dates(entry_lines[0])
            exp_item["startDate"] = start_date
            exp_item["endDate"] = end_date
            exp_item["current"] = current

        trailing_date_idx = date_line_idx if date_line_idx is not None and date_line_idx >= 2 else None

        title_line = entry_lines[0]
        title = re.sub(DATE_RE, "", title_line).strip(" |-\t")
        first_line_titleish = _looks_like_title(title)
        second_line_titleish = len(entry_lines) > 1 and _looks_like_title(entry_lines[1])
        company_date_first = bool(
            date_match
            and second_line_titleish
            and (not first_line_titleish or (_has_title_hint(entry_lines[1]) and not _has_title_hint(title)))
        )
        company_first_no_standard_date = bool(
            not date_match
            and second_line_titleish
            and _has_title_hint(entry_lines[1])
            and not _has_title_hint(title)
            and re.search(r"\b\d{4}\b|summer|spring|fall|winter", title, re.IGNORECASE)
        )

        company_line_idx = 1 if len(entry_lines) > 1 else None
        org_year_title_next = bool(ORG_YEAR_LINE_RE.search(entry_lines[0]) and len(entry_lines) > 1)
        if org_year_title_next:
            title_line = re.sub(BULLET_RE, "", entry_lines[1]).strip()
            exp_item["title"] = title_line or None
            company, skills, location = _parse_company_line(entry_lines[0])
            exp_item["company"] = company
            exp_item["skills"] = _format_skills(skills)
            exp_item["location"] = location
            company_line_idx = None
        elif company_date_first or company_first_no_standard_date:
            exp_item["title"] = entry_lines[1].strip()
            company, skills, location = _parse_company_line(entry_lines[0])
            if company_first_no_standard_date:
                company = re.sub(r"\b(?:summer|spring|fall|winter)?\s*\d{4}\b.*$", "", company or "", flags=re.IGNORECASE).strip()
            exp_item["company"] = company
            exp_item["skills"] = _format_skills(skills)
            exp_item["location"] = location
            company_line_idx = None
        else:
            exp_item["title"] = title or None

        if company_line_idx is not None:
            company, skills, location = _parse_company_line(entry_lines[company_line_idx])
            exp_item["company"] = company
            exp_item["skills"] = _format_skills(skills)
            exp_item["location"] = location

        title_date_company = bool(
            len(entry_lines) >= 3
            and _looks_like_title(entry_lines[0])
            and (DATE_RE.search(entry_lines[1]) or SINGLE_DATE_RE.match(entry_lines[1]))
            and not DATE_RE.search(entry_lines[2])
        )
        if title_date_company:
            date_match = DATE_RE.search(entry_lines[1])
            if date_match:
                exp_item["startDate"] = _normalize_date(date_match.group(1))
                end_date = date_match.group(2).strip().lower()
                if end_date in {"present", "current"}:
                    exp_item["current"] = True
                    exp_item["endDate"] = None
                else:
                    exp_item["endDate"] = _normalize_date(date_match.group(2))
            elif SINGLE_DATE_RE.match(entry_lines[1]):
                exp_item["startDate"] = _normalize_date(entry_lines[1])
                exp_item["endDate"] = None
            exp_item["title"] = entry_lines[0].strip()
            company, skills, location = _parse_company_line(entry_lines[2])
            exp_item["company"] = company
            exp_item["skills"] = _format_skills(skills)
            exp_item["location"] = location
            company_line_idx = 2

        if trailing_date_idx is not None and len(entry_lines) >= 3:
            company, skills, location = _parse_company_line(entry_lines[0])
            exp_item["company"] = company
            exp_item["skills"] = _format_skills(skills)
            exp_item["location"] = location
            exp_item["title"] = entry_lines[1].strip()
            company_line_idx = 1

        location_role_re = re.compile(
            r"^(Remote|On-site|Onsite|Hybrid|Full-time|Part-time|Contract|Internship|Freelance|Temporary)$",
            re.IGNORECASE,
        )
        for line in entry_lines:
            if LOCATION_KEYWORD_RE.match(line) and not exp_item["location"]:
                exp_item["location"] = line

        start_desc = 2
        if org_year_title_next:
            start_desc = 2
        if title_date_company:
            start_desc = 3
        if date_line_idx is not None and trailing_date_idx is None:
            start_desc = max(start_desc, date_line_idx + 1)
        if company_line_idx is not None:
            start_desc = max(start_desc, company_line_idx + 1)

        description_lines = []
        end_desc = trailing_date_idx if trailing_date_idx is not None else len(entry_lines)
        for line in entry_lines[start_desc:end_desc]:
            if DATE_RE.search(line) and not _is_bullet_line(line):
                break
            if location_role_re.match(line):
                continue
            description_lines.append(line)

        exp_item["description"] = _format_description(description_lines)

        if exp_item["title"]:
            experiences.append(exp_item)

    return experiences
