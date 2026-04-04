from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List


def _ensure_backend_on_path() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))


_ensure_backend_on_path()

from ai.extraction import extract_job_keywords_detailed  # noqa: E402
from ai.extraction.abstraction import abstract_terms, filter_non_reusable  # noqa: E402


def _default_paths() -> tuple[Path, Path, Path]:
    ai_root = Path(__file__).resolve().parents[1]
    debug_inputs = ai_root / "debug_inputs"
    debug_outputs = ai_root / "debug_outputs"
    return (
        debug_inputs / "jd_batch.txt",
        debug_outputs / "jd_batch_results.json",
        debug_outputs / "jd_batch_results.md",
    )


def _parse_text_block(block: str, fallback_index: int) -> Dict[str, Any] | None:
    lines = [line.rstrip() for line in block.strip().splitlines()]
    if not lines:
        return None

    title = ""
    role = ""
    company = ""
    body_lines: List[str] = []

    for line in lines:
        if line.upper().startswith("TITLE:"):
            title = line.split(":", 1)[1].strip()
            continue
        if line.upper().startswith("ROLE:"):
            role = line.split(":", 1)[1].strip()
            continue
        if line.upper().startswith("COMPANY:"):
            company = line.split(":", 1)[1].strip()
            continue
        if line.strip().startswith("#"):
            continue
        body_lines.append(line)

    description = "\n".join(body_lines).strip()
    if not description:
        return None

    inferred_title = title or role or f"JD {fallback_index}"
    return {
        "title": inferred_title,
        "role": role or title or "",
        "company": company,
        "job_description": description,
    }


def _parse_input_file(path: Path) -> List[Dict[str, Any]]:
    raw = path.read_text(encoding="utf-8")
    if not raw.strip():
        return []

    # Optional JSON mode: list of {"title","role","job_description"}
    if raw.lstrip().startswith("["):
        loaded = json.loads(raw)
        parsed: List[Dict[str, Any]] = []
        for idx, item in enumerate(loaded, start=1):
            if not isinstance(item, dict):
                continue
            jd = str(item.get("job_description") or "").strip()
            if not jd:
                continue
            parsed.append(
                {
                    "title": str(item.get("title") or item.get("role") or f"JD {idx}"),
                    "role": str(item.get("role") or item.get("title") or ""),
                    "company": str(item.get("company") or ""),
                    "job_description": jd,
                }
            )
        return parsed

    # Text mode: split by === JD === delimiter.
    chunks = re.split(r"(?mi)^\s*===\s*JD\s*===\s*$", raw)
    if len(chunks) == 1:
        single = _parse_text_block(chunks[0], fallback_index=1)
        return [single] if single else []

    parsed: List[Dict[str, Any]] = []
    for idx, chunk in enumerate(chunks, start=1):
        item = _parse_text_block(chunk, fallback_index=idx)
        if item:
            parsed.append(item)
    return parsed


def _evaluate_jds(items: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for idx, item in enumerate(items, start=1):
        extraction = extract_job_keywords_detailed(
            job_description=item["job_description"],
            target_role=item.get("role") or None,
            limit=limit,
        )
        raw_terms = [entry["term"] for entry in extraction["keywords"]]
        filtered = filter_non_reusable(raw_terms)
        abstracted = abstract_terms(filtered, limit=limit)

        results.append(
            {
                "index": idx,
                "title": item["title"],
                "role": item.get("role") or "",
                "company": item.get("company") or "",
                "job_description_chars": len(item["job_description"]),
                "active_domains": extraction.get("active_domains", []),
                "keywords_raw_ranked": extraction["keywords"][:limit],
                "keywords_filtered": filtered[:limit],
                "keywords_abstracted": abstracted[:limit],
                "dynamic_phrase_candidates": extraction.get("dynamic_phrase_candidates", [])[:limit],
            }
        )
    return results


def _write_outputs(results: List[Dict[str, Any]], input_file: Path, json_path: Path, md_path: Path) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "input_file": str(input_file),
        "total_jds": len(results),
        "results": results,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")

    lines: List[str] = []
    lines.append("# JD Batch Extraction Results")
    lines.append("")
    lines.append(f"- Generated: `{payload['generated_at_utc']}`")
    lines.append(f"- Input: `{input_file}`")
    lines.append(f"- Total JDs: `{len(results)}`")
    lines.append("")
    lines.append("| # | Title | Domains | Raw Top 5 | Abstracted |")
    lines.append("|---|---|---|---|---|")
    for row in results:
        raw_top = ", ".join(k["term"] for k in row["keywords_raw_ranked"][:5])
        abstracted = ", ".join(row["keywords_abstracted"][:5])
        domains = ", ".join(row["active_domains"])
        lines.append(f"| {row['index']} | {row['title']} | {domains} | {raw_top} | {abstracted} |")
    lines.append("")

    for row in results:
        lines.append(f"## {row['index']}. {row['title']}")
        lines.append("")
        lines.append(f"- Role: `{row['role'] or 'n/a'}`")
        lines.append(f"- Company: `{row['company'] or 'n/a'}`")
        lines.append(f"- Active domains: `{', '.join(row['active_domains']) or 'none'}`")
        lines.append(f"- Description chars: `{row['job_description_chars']}`")
        lines.append("")
        lines.append("### Raw Ranked Keywords")
        for term in row["keywords_raw_ranked"][:12]:
            lines.append(f"- `{term['term']}` (score={term['score']}, freq={term['frequency']}, sources={','.join(term['sources'])})")
        lines.append("")
        lines.append("### Filtered Keywords")
        for term in row["keywords_filtered"][:12]:
            lines.append(f"- `{term}`")
        lines.append("")
        lines.append("### Abstracted Keywords")
        for term in row["keywords_abstracted"][:12]:
            lines.append(f"- `{term}`")
        lines.append("")
        lines.append("### Dynamic Phrase Candidates")
        for phrase, count in row["dynamic_phrase_candidates"][:12]:
            lines.append(f"- `{phrase}` ({count})")
        lines.append("")

    md_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    default_input, default_json, default_md = _default_paths()

    parser = argparse.ArgumentParser(description="Batch-evaluate JD extraction output.")
    parser.add_argument("--input", type=Path, default=default_input, help="Input JD file (text with === JD === delimiters or JSON list).")
    parser.add_argument("--output-json", type=Path, default=default_json, help="Path for JSON output.")
    parser.add_argument("--output-md", type=Path, default=default_md, help="Path for markdown output.")
    parser.add_argument("--limit", type=int, default=12, help="Top N terms to keep per JD.")
    args = parser.parse_args()

    if not args.input.exists():
        print(f"[bulk_eval] Input file not found: {args.input}")
        return 1

    items = _parse_input_file(args.input)
    if not items:
        print(f"[bulk_eval] No JD entries found in: {args.input}")
        return 1

    results = _evaluate_jds(items, limit=max(1, args.limit))
    _write_outputs(results, args.input, args.output_json, args.output_md)

    print(f"[bulk_eval] Processed {len(results)} JDs")
    print(f"[bulk_eval] JSON: {args.output_json}")
    print(f"[bulk_eval] Markdown: {args.output_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
