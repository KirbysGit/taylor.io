# generator / templates.py

import json
import mimetypes
import re
from pathlib import Path, PurePosixPath
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse

router = APIRouter(prefix="/api/templates", tags=["templates"])

# get abs path to templates directory.
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

_VALID_STYLING_MODES = frozenset({"locked", "hybrid", "themeable"})
_SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
_ASSET_NAME_RE = re.compile(r"^[a-zA-Z0-9][-a-zA-Z0-9._]*$")


def safe_template_asset_path(folder_name, asset_path):
    raw = str(asset_path or "").strip().replace("\\", "/")
    if not raw or raw.startswith("/"):
        return None
    pure_path = PurePosixPath(raw)
    if any(part in ("", ".", "..") for part in pure_path.parts):
        return None
    if any(not _ASSET_NAME_RE.match(part) for part in pure_path.parts):
        return None
    base_dir = (TEMPLATES_DIR / folder_name).resolve()
    cand = (base_dir / Path(*pure_path.parts)).resolve()
    try:
        cand.relative_to(base_dir)
    except ValueError:
        return None
    if not cand.is_file():
        return None
    return raw, cand


def _default_styling_meta(folder_name: str) -> Dict[str, Any]:
    return {
        "displayName": folder_name,
        "description": "",
        "stylingMode": "themeable",
        "allowedControls": [],
        "layoutLocked": False,
        "capabilitiesVersion": 1,
        # layoutProfile: shared DOCX/HTML engine id (see generator.layouts.registry).
        "layoutProfile": "classic_single_column",
        "family": "",
        "variantLabel": "",
        "tags": [],
        "intent": "",
        "defaultStylePreferences": {},
        "controlOptions": {},
    }


def load_template_styling_meta(folder_name: str) -> Dict[str, Any]:
    """Load meta.json from a template folder; merge with defaults. Safe on missing/invalid file."""
    base = _default_styling_meta(folder_name)
    path = TEMPLATES_DIR / folder_name / "meta.json"
    if not path.exists():
        return base
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, json.JSONDecodeError):
        return base
    if not isinstance(raw, dict):
        return base

    mode = str(raw.get("stylingMode", base["stylingMode"])).lower()
    if mode not in _VALID_STYLING_MODES:
        mode = "themeable"

    controls = raw.get("allowedControls")
    if not isinstance(controls, list):
        controls = []
    controls = [str(c).strip() for c in controls if c and str(c).strip()]

    out: Dict[str, Any] = {
        "displayName": str(raw.get("displayName") or base["displayName"]),
        "description": str(raw.get("description") or base["description"]),
        "stylingMode": mode,
        "allowedControls": controls,
        "layoutLocked": bool(raw.get("layoutLocked", base["layoutLocked"])),
        "capabilitiesVersion": int(raw.get("capabilitiesVersion", base["capabilitiesVersion"])),
        "layoutProfile": str(raw.get("layoutProfile") or base["layoutProfile"]).strip()
        or base["layoutProfile"],
    }

    tags = raw.get("tags")
    if isinstance(tags, list):
        out["tags"] = [
            str(tag).strip()[:80]
            for tag in tags
            if tag is not None and str(tag).strip()
        ][:8]

    intent = raw.get("intent")
    if isinstance(intent, str) and intent.strip():
        out["intent"] = intent.strip()[:120]

    defaults = raw.get("defaultStylePreferences")
    if isinstance(defaults, dict):
        out["defaultStylePreferences"] = {
            str(k).strip(): v
            for k, v in defaults.items()
            if k is not None and str(k).strip()
        }

    control_options = raw.get("controlOptions")
    if isinstance(control_options, dict):
        out["controlOptions"] = {
            str(k).strip(): v
            for k, v in control_options.items()
            if k is not None and str(k).strip()
        }

    docx_max_pages = raw.get("docxMaxPages")
    if isinstance(docx_max_pages, int) and docx_max_pages >= 1:
        out["docxMaxPages"] = docx_max_pages
    elif isinstance(docx_max_pages, str) and docx_max_pages.strip().isdigit():
        parsed_pages = int(docx_max_pages.strip())
        if parsed_pages >= 1:
            out["docxMaxPages"] = parsed_pages

    fam = raw.get("family")
    if isinstance(fam, str) and fam.strip():
        out["family"] = fam.strip()[:120]

    vl = raw.get("variantLabel")
    if isinstance(vl, str) and vl.strip():
        out["variantLabel"] = vl.strip()[:120]

    sd = raw.get("shortDescription")
    if isinstance(sd, str) and sd.strip():
        out["shortDescription"] = sd.strip()[:400]

    pi = raw.get("previewImage")
    if isinstance(pi, str) and pi.strip():
        asset_info = safe_template_asset_path(folder_name, pi)
        if asset_info:
            asset_name, _ = asset_info
            out["previewImage"] = asset_name
            out["previewUrl"] = f"/api/templates/{folder_name}/asset/{asset_name}"

    snippets = raw.get("previewSnippets")
    if isinstance(snippets, dict):
        safe_snippets = {}
        for key, val in snippets.items():
            if not isinstance(key, str) or not key.strip() or not isinstance(val, str):
                continue
            asset_info = safe_template_asset_path(folder_name, val)
            if not asset_info:
                continue
            asset_name, _ = asset_info
            safe_snippets[key.strip()[:80]] = {
                "image": asset_name,
                "url": f"/api/templates/{folder_name}/asset/{asset_name}",
            }
        if safe_snippets:
            out["previewSnippets"] = safe_snippets

    out.setdefault("family", base["family"])
    out.setdefault("variantLabel", base["variantLabel"])
    out.setdefault("tags", base["tags"])
    out.setdefault("intent", base["intent"])
    out.setdefault("defaultStylePreferences", base["defaultStylePreferences"])
    out.setdefault("controlOptions", base["controlOptions"])

    return out


@router.get("/list")
async def list_templates():
    """List template folders; include styling capabilities for each (from meta.json)."""
    if not TEMPLATES_DIR.exists():
        return {"templates": [], "templateStyling": {}}

    names = sorted(item.name for item in TEMPLATES_DIR.iterdir() if item.is_dir())
    styling = {name: load_template_styling_meta(name) for name in names}

    return {"templates": names, "templateStyling": styling}


@router.get("/{slug}/preview-html")
async def template_preview_html(slug: str):
    """Render the shared preview fixture through the actual template HTML."""
    if not _SLUG_RE.match(slug or ""):
        raise HTTPException(status_code=404, detail="Not found")
    templateDir = (TEMPLATES_DIR / slug).resolve()
    if not templateDir.is_dir():
        raise HTTPException(status_code=404, detail="Not found")
    fixturePath = TEMPLATES_DIR / "preview_fixture.json"
    if not fixturePath.is_file():
        raise HTTPException(status_code=404, detail="Preview fixture not found")
    try:
        with open(fixturePath, "r", encoding="utf-8") as f:
            resumeData = json.load(f)
    except (OSError, json.JSONDecodeError):
        raise HTTPException(status_code=500, detail="Could not load preview fixture")
    if not isinstance(resumeData, dict):
        raise HTTPException(status_code=500, detail="Preview fixture must be an object")

    try:
        try:
            from generator.pipeline import generate_resume
        except ModuleNotFoundError:
            from backend.generator.pipeline import generate_resume

        html = generate_resume(slug, resumeData, style_preferences={})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not render preview: {exc}") from exc

    preview_css = """
<style>
  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: #fff !important;
  }

  .body-wrapper {
    display: block !important;
    align-items: stretch !important;
    justify-content: flex-start !important;
    min-height: auto !important;
    overflow: hidden !important;
    background: #fff !important;
  }

  .resume {
    margin: 0 auto !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
</style>
"""
    html = html.replace("</head>", f"{preview_css}</head>", 1)
    return HTMLResponse(html)


@router.get("/{slug}/asset/{asset_path:path}")
async def template_asset(slug: str, asset_path: str):
    """Serve a static gallery asset from templates/<slug>/ (e.g. card preview SVG/PNG)."""
    if not _SLUG_RE.match(slug or ""):
        raise HTTPException(status_code=404, detail="Not found")
    asset_info = safe_template_asset_path(slug, asset_path)
    if not asset_info:
        raise HTTPException(status_code=404, detail="Not found")
    _, path = asset_info
    media_type, _ = mimetypes.guess_type(str(path))
    return FileResponse(path, media_type=media_type or "application/octet-stream")
