# generator / templates.py

import json
import mimetypes
import re
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/templates", tags=["templates"])

# get abs path to templates directory.
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

_VALID_STYLING_MODES = frozenset({"locked", "hybrid", "themeable"})
_SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
_ASSET_NAME_RE = re.compile(r"^[a-zA-Z0-9][-a-zA-Z0-9._]*$")


def _default_styling_meta(folder_name: str) -> Dict[str, Any]:
    return {
        "displayName": folder_name,
        "description": "",
        "stylingMode": "themeable",
        "allowedControls": [],
        "layoutLocked": False,
        "capabilitiesVersion": 1,
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
    }

    sd = raw.get("shortDescription")
    if isinstance(sd, str) and sd.strip():
        out["shortDescription"] = sd.strip()[:400]

    pi = raw.get("previewImage")
    if isinstance(pi, str) and pi.strip():
        fn = Path(pi.strip()).name
        if _ASSET_NAME_RE.match(fn):
            base_dir = (TEMPLATES_DIR / folder_name).resolve()
            cand = (base_dir / fn).resolve()
            try:
                cand.relative_to(base_dir)
            except ValueError:
                pass
            else:
                if cand.is_file():
                    out["previewImage"] = fn
                    out["previewUrl"] = f"/api/templates/{folder_name}/asset/{fn}"

    return out


@router.get("/list")
async def list_templates():
    """List template folders; include styling capabilities for each (from meta.json)."""
    if not TEMPLATES_DIR.exists():
        return {"templates": [], "templateStyling": {}}

    names = sorted(item.name for item in TEMPLATES_DIR.iterdir() if item.is_dir())
    styling = {name: load_template_styling_meta(name) for name in names}

    return {"templates": names, "templateStyling": styling}


@router.get("/{slug}/asset/{filename}")
async def template_asset(slug: str, filename: str):
    """Serve a static gallery asset from templates/<slug>/ (e.g. card preview SVG/PNG)."""
    if not _SLUG_RE.match(slug or ""):
        raise HTTPException(status_code=404, detail="Not found")
    fn = Path(filename).name
    if not fn or not _ASSET_NAME_RE.match(fn):
        raise HTTPException(status_code=404, detail="Not found")
    base = (TEMPLATES_DIR / slug).resolve()
    if not base.is_dir():
        raise HTTPException(status_code=404, detail="Not found")
    path = (base / fn).resolve()
    try:
        path.relative_to(base)
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    media_type, _ = mimetypes.guess_type(str(path))
    return FileResponse(path, media_type=media_type or "application/octet-stream")
