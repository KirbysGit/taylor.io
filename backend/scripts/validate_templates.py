from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Iterable


repoRoot = Path(__file__).resolve().parents[2]
backendRoot = repoRoot / "backend"
templatesDir = backendRoot / "templates"
defaultFixturePath = templatesDir / "preview_fixture.json"

# Match the backend runtime import style (`from generator.pipeline import ...`).
# Adding backendRoot first avoids a package-initialization loop that can happen
# when importing the same modules through the `backend.generator.*` package path.
if str(backendRoot) not in sys.path:
    sys.path.insert(0, str(backendRoot))
if str(repoRoot) not in sys.path:
    sys.path.insert(1, str(repoRoot))

from generator.pipeline import generate_docx, generate_pdf, generate_resume
from generator.layouts.registry import SUPPORTED_DOCX_PROFILES
from generator.word.docx_styles import DocxStyleConfig


SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
CSS_VAR_RE = re.compile(r"var\(\s*--rt-([a-zA-Z0-9-]+)")
TOKEN_KEY_RE = re.compile(r"^[a-z][a-z0-9_]*$")
ASSET_NAME_RE = re.compile(r"^[a-zA-Z0-9][-a-zA-Z0-9._]*$")

REQUIRED_TEMPLATE_FILES = (
    "meta.json",
    "template.html",
    "preview.css",
    "resume_tokens.json",
)

VALID_STYLING_MODES = frozenset({"locked", "hybrid", "themeable"})

# Keep this list aligned with frontend/src/pages/5resume/utils/resumeStyleControls.js
# and backend/generator/shared/style_presets.py. Planned controls are deliberately
# excluded because listing one in meta.json would expose UI that is not wired.
IMPLEMENTED_TEMPLATE_CONTROLS = frozenset(
    {
        "marginPreset",
        "typeScale",
        "fontPairing",
        "lineSpacingPreset",
    }
)

GLOBAL_STYLE_CONTROLS = frozenset({"contactUrlDisplay"})

STYLE_PREFERENCE_KEYS = frozenset(
    {
        "marginPreset",
        "lineSpacingPreset",
        "typeScalePreset",
        "fontPairing",
        "contactUrlDisplay",
    }
)

KNOWN_TEMPLATE_PLACEHOLDERS = (
    "{{template_css}}",
    "{name}",
    "{tagline_block}",
    "{header_line}",
    "{contact_rail}",
    "{sections}",
    "{sidebar_sections}",
)

COMMON_TEMPLATE_PLACEHOLDERS = (
    "{{template_css}}",
    "{name}",
    "{tagline_block}",
    "{sections}",
)

SIDEBAR_TEMPLATE_PLACEHOLDERS = (
    "{contact_rail}",
    "{sidebar_sections}",
)

SINGLE_COLUMN_TEMPLATE_PLACEHOLDERS = (
    "{header_line}",
)

DOCX_STYLE_FIELDS = frozenset(DocxStyleConfig.__dataclass_fields__.keys())


@dataclass(frozen=True)
class Issue:
    template: str
    message: str
    path: Path | None = None

    def format(self) -> str:
        location = ""
        if self.path is not None:
            try:
                location = f" ({self.path.relative_to(repoRoot)})"
            except ValueError:
                location = f" ({self.path})"
        return f"[{self.template}] {self.message}{location}"


class TemplateValidator:
    def __init__(
        self,
        fixture_path: Path,
        template_filters: Iterable[str] | None = None,
        *,
        include_pdf: bool = False,
    ):
        self.fixture_path = fixture_path
        self.template_filters = set(template_filters or [])
        self.include_pdf = include_pdf
        self.errors: list[Issue] = []
        self.checked: list[str] = []

    def add_error(self, template: str, message: str, path: Path | None = None) -> None:
        self.errors.append(Issue(template=template, message=message, path=path))

    def read_json_object(self, template: str, path: Path, label: str) -> dict[str, Any] | None:
        try:
            with open(path, "r", encoding="utf-8") as file:
                data = json.load(file)
        except FileNotFoundError:
            self.add_error(template, f"missing {label}", path)
            return None
        except json.JSONDecodeError as exc:
            self.add_error(template, f"{label} is not valid JSON: {exc.msg}", path)
            return None
        except OSError as exc:
            self.add_error(template, f"could not read {label}: {exc}", path)
            return None

        if not isinstance(data, dict):
            self.add_error(template, f"{label} must contain a JSON object", path)
            return None
        return data

    def read_text(self, template: str, path: Path, label: str) -> str | None:
        try:
            return path.read_text(encoding="utf-8")
        except FileNotFoundError:
            self.add_error(template, f"missing {label}", path)
        except OSError as exc:
            self.add_error(template, f"could not read {label}: {exc}", path)
        return None

    def load_fixture(self) -> dict[str, Any] | None:
        data = self.read_json_object("fixture", self.fixture_path, "preview fixture")
        return data

    def discover_templates(self) -> list[Path]:
        if not templatesDir.is_dir():
            self.add_error("templates", "templates directory does not exist", templatesDir)
            return []

        folders = sorted(item for item in templatesDir.iterdir() if item.is_dir())
        if self.template_filters:
            requested = {slug.strip() for slug in self.template_filters if slug.strip()}
            folders = [folder for folder in folders if folder.name in requested]
            found = {folder.name for folder in folders}
            for missing in sorted(requested - found):
                self.add_error(missing, "requested template folder does not exist", templatesDir / missing)

        return folders

    def validate_required_files(self, slug: str, template_dir: Path) -> None:
        for filename in REQUIRED_TEMPLATE_FILES:
            path = template_dir / filename
            if not path.is_file():
                self.add_error(slug, f"missing required file: {filename}", path)

    def validate_meta(self, slug: str, template_dir: Path) -> dict[str, Any] | None:
        meta_path = template_dir / "meta.json"
        meta = self.read_json_object(slug, meta_path, "meta.json")
        if meta is None:
            return None

        layout_profile = meta.get("layoutProfile", "classic_single_column")
        if not isinstance(layout_profile, str) or not layout_profile.strip():
            self.add_error(slug, "meta.layoutProfile must be a non-empty string", meta_path)
        elif layout_profile.strip() not in SUPPORTED_DOCX_PROFILES:
            supported = ", ".join(sorted(SUPPORTED_DOCX_PROFILES))
            self.add_error(
                slug,
                f"unsupported layoutProfile '{layout_profile}'. Supported profiles: {supported}",
                meta_path,
            )

        styling_mode = meta.get("stylingMode", "themeable")
        if not isinstance(styling_mode, str) or styling_mode not in VALID_STYLING_MODES:
            modes = ", ".join(sorted(VALID_STYLING_MODES))
            self.add_error(slug, f"meta.stylingMode must be one of: {modes}", meta_path)

        allowed_controls = meta.get("allowedControls", [])
        if not isinstance(allowed_controls, list):
            self.add_error(slug, "meta.allowedControls must be a list", meta_path)
            allowed_controls = []

        for control in allowed_controls:
            if not isinstance(control, str) or not control.strip():
                self.add_error(slug, "meta.allowedControls entries must be non-empty strings", meta_path)
                continue
            if control not in IMPLEMENTED_TEMPLATE_CONTROLS:
                implemented = ", ".join(sorted(IMPLEMENTED_TEMPLATE_CONTROLS))
                self.add_error(
                    slug,
                    f"allowed control '{control}' is not wired. Implemented controls: {implemented}",
                    meta_path,
                )

        defaults = meta.get("defaultStylePreferences", {})
        if defaults is not None and not isinstance(defaults, dict):
            self.add_error(slug, "meta.defaultStylePreferences must be an object when present", meta_path)
        elif isinstance(defaults, dict):
            allowed_preference_keys = STYLE_PREFERENCE_KEYS | GLOBAL_STYLE_CONTROLS
            for key in defaults:
                if key not in allowed_preference_keys:
                    self.add_error(slug, f"unknown defaultStylePreferences key '{key}'", meta_path)

        control_options = meta.get("controlOptions", {})
        if control_options is not None and not isinstance(control_options, dict):
            self.add_error(slug, "meta.controlOptions must be an object when present", meta_path)
        elif isinstance(control_options, dict):
            allowed_control_set = set(allowed_controls) | GLOBAL_STYLE_CONTROLS
            for control_id, options in control_options.items():
                if control_id not in allowed_control_set:
                    self.add_error(
                        slug,
                        f"controlOptions includes '{control_id}' but it is not allowed for this template",
                        meta_path,
                    )
                if not isinstance(options, list):
                    self.add_error(slug, f"controlOptions.{control_id} must be a list", meta_path)

        if "layoutLocked" in meta and not isinstance(meta["layoutLocked"], bool):
            self.add_error(slug, "meta.layoutLocked must be a boolean", meta_path)

        docx_max_pages = meta.get("docxMaxPages")
        if docx_max_pages is not None:
            if isinstance(docx_max_pages, int):
                valid_pages = docx_max_pages >= 1
            elif isinstance(docx_max_pages, str):
                valid_pages = docx_max_pages.strip().isdigit() and int(docx_max_pages.strip()) >= 1
            else:
                valid_pages = False
            if not valid_pages:
                self.add_error(slug, "meta.docxMaxPages must be an integer >= 1", meta_path)

        self.validate_meta_assets(slug, template_dir, meta)
        return meta

    def validate_meta_assets(self, slug: str, template_dir: Path, meta: dict[str, Any]) -> None:
        preview_image = meta.get("previewImage")
        if preview_image is not None:
            self.validate_asset_path(slug, template_dir, preview_image, "meta.previewImage")

        snippets = meta.get("previewSnippets")
        if snippets is None:
            return
        if not isinstance(snippets, dict):
            self.add_error(slug, "meta.previewSnippets must be an object when present", template_dir / "meta.json")
            return
        for key, raw_path in snippets.items():
            if not isinstance(key, str) or not key.strip():
                self.add_error(slug, "meta.previewSnippets keys must be non-empty strings", template_dir / "meta.json")
            self.validate_asset_path(slug, template_dir, raw_path, f"meta.previewSnippets.{key}")

    def validate_asset_path(self, slug: str, template_dir: Path, raw_path: Any, label: str) -> None:
        if not isinstance(raw_path, str) or not raw_path.strip():
            self.add_error(slug, f"{label} must be a non-empty relative path", template_dir / "meta.json")
            return

        raw = raw_path.strip().replace("\\", "/")
        if raw.startswith("/"):
            self.add_error(slug, f"{label} must be relative to the template folder", template_dir / "meta.json")
            return

        pure_path = PurePosixPath(raw)
        if any(part in ("", ".", "..") for part in pure_path.parts):
            self.add_error(slug, f"{label} cannot contain empty, current, or parent path segments", template_dir / "meta.json")
            return
        if any(not ASSET_NAME_RE.match(part) for part in pure_path.parts):
            self.add_error(slug, f"{label} contains an unsafe path segment", template_dir / "meta.json")
            return

        candidate = (template_dir / Path(*pure_path.parts)).resolve()
        try:
            candidate.relative_to(template_dir.resolve())
        except ValueError:
            self.add_error(slug, f"{label} escapes the template folder", template_dir / "meta.json")
            return

        if not candidate.is_file():
            self.add_error(slug, f"{label} points to a missing asset: {raw}", candidate)

    def validate_template_html(self, slug: str, template_dir: Path, layout_profile: str) -> None:
        html_path = template_dir / "template.html"
        html = self.read_text(slug, html_path, "template.html")
        if html is None:
            return

        required = list(COMMON_TEMPLATE_PLACEHOLDERS)
        if layout_profile == "sidebar_split":
            required.extend(SIDEBAR_TEMPLATE_PLACEHOLDERS)
        else:
            required.extend(SINGLE_COLUMN_TEMPLATE_PLACEHOLDERS)

        for placeholder in required:
            if placeholder not in html:
                self.add_error(slug, f"template.html is missing placeholder {placeholder}", html_path)

    def validate_tokens_and_css(self, slug: str, template_dir: Path) -> None:
        tokens_path = template_dir / "resume_tokens.json"
        css_path = template_dir / "preview.css"
        tokens = self.read_json_object(slug, tokens_path, "resume_tokens.json")
        css = self.read_text(slug, css_path, "preview.css")
        if tokens is None or css is None:
            return

        effective_tokens = {
            key: value
            for key, value in tokens.items()
            if isinstance(key, str) and not key.startswith("_")
        }

        for key in effective_tokens:
            if not TOKEN_KEY_RE.match(key):
                self.add_error(slug, f"resume token key '{key}' should use snake_case", tokens_path)

        css_refs = {
            match.group(1).replace("-", "_")
            for match in CSS_VAR_RE.finditer(css)
        }
        for ref in sorted(css_refs - set(effective_tokens)):
            self.add_error(slug, f"preview.css references missing token '{ref}'", css_path)

    def validate_docx_styles(self, slug: str, template_dir: Path) -> None:
        docx_path = template_dir / "docx_styles.json"
        if not docx_path.exists():
            return

        overrides = self.read_json_object(slug, docx_path, "docx_styles.json")
        if overrides is None:
            return

        for key in overrides:
            if isinstance(key, str) and key.startswith("_"):
                continue
            if key not in DOCX_STYLE_FIELDS:
                self.add_error(slug, f"docx_styles.json contains unknown DocxStyleConfig field '{key}'", docx_path)

    def validate_rendering(self, slug: str, fixture: dict[str, Any]) -> None:
        try:
            html = generate_resume(slug, fixture, style_preferences={})
        except Exception as exc:
            self.add_error(slug, f"HTML generation failed: {exc}")
            return

        for placeholder in KNOWN_TEMPLATE_PLACEHOLDERS:
            if placeholder in html:
                self.add_error(slug, f"rendered HTML still contains placeholder {placeholder}")

        try:
            docx_bytes = generate_docx(slug, fixture, style_preferences={})
        except Exception as exc:
            self.add_error(slug, f"DOCX generation failed: {exc}")
            return

        # DOCX files are ZIP packages. This cheap signature check catches empty
        # responses or accidental text/error bytes without parsing the document.
        if not docx_bytes.startswith(b"PK"):
            self.add_error(slug, "DOCX generation did not return a valid DOCX/ZIP payload")

        if not self.include_pdf:
            return

        try:
            pdf_bytes = asyncio.run(generate_pdf(slug, fixture, style_preferences={}))
        except Exception as exc:
            self.add_error(slug, f"PDF generation failed: {exc}")
            return

        if not pdf_bytes.startswith(b"%PDF"):
            self.add_error(slug, "PDF generation did not return a valid PDF payload")

    def validate_template(self, template_dir: Path, fixture: dict[str, Any]) -> None:
        slug = template_dir.name
        self.checked.append(slug)

        if not SLUG_RE.match(slug):
            self.add_error(slug, "template folder name must be lowercase kebab-case", template_dir)

        self.validate_required_files(slug, template_dir)
        meta = self.validate_meta(slug, template_dir)

        layout_profile = "classic_single_column"
        if isinstance(meta, dict) and isinstance(meta.get("layoutProfile"), str):
            layout_profile = meta["layoutProfile"].strip() or layout_profile

        self.validate_template_html(slug, template_dir, layout_profile)
        self.validate_tokens_and_css(slug, template_dir)
        self.validate_docx_styles(slug, template_dir)
        self.validate_rendering(slug, fixture)

    def run(self) -> int:
        fixture = self.load_fixture()
        if fixture is None:
            return 1

        for template_dir in self.discover_templates():
            self.validate_template(template_dir, fixture)

        if self.errors:
            print(f"Template validation failed: {len(self.errors)} error(s) in {len(self.checked)} template(s).")
            for issue in self.errors:
                print(f"  - {issue.format()}")
            return 1

        print(f"Template validation passed: {len(self.checked)} template(s) checked.")
        for slug in self.checked:
            print(f"  - {slug}")
        return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate Tailor resume template folders before design review or release."
    )
    parser.add_argument(
        "--fixture",
        default=str(defaultFixturePath),
        help="Path to the resume fixture JSON used for render smoke checks.",
    )
    parser.add_argument(
        "--template",
        action="append",
        dest="template_slugs",
        help="Template slug to validate. Repeat to validate multiple. Defaults to every template folder.",
    )
    parser.add_argument(
        "--include-pdf",
        action="store_true",
        help="Also smoke-test PDF generation. Requires Playwright Chromium to be installed.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    validator = TemplateValidator(
        fixture_path=Path(args.fixture).resolve(),
        template_filters=args.template_slugs,
        include_pdf=args.include_pdf,
    )
    return validator.run()


if __name__ == "__main__":
    raise SystemExit(main())
