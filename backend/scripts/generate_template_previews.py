from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path, PurePosixPath


repoRoot = Path(__file__).resolve().parents[2]
backendRoot = repoRoot / "backend"
templatesDir = backendRoot / "templates"
defaultFixturePath = templatesDir / "preview_fixture.json"

if str(repoRoot) not in sys.path:
    sys.path.insert(0, str(repoRoot))

try:
    from playwright.sync_api import sync_playwright
except ImportError as exc:
    raise SystemExit(
        "Playwright is required to generate template previews. "
        "Install backend dependencies, then run: python -m playwright install chromium"
    ) from exc

from backend.generator.pipeline import generate_resume


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate PNG previews for resume templates using preview_fixture.json."
    )
    parser.add_argument(
        "--fixture",
        default=str(defaultFixturePath),
        help="Path to the resume fixture JSON used for all template previews.",
    )
    parser.add_argument(
        "--template",
        action="append",
        dest="templateSlugs",
        help="Template slug to render. Repeat to render multiple. Defaults to every template folder.",
    )
    parser.add_argument(
        "--output",
        default="preview.png",
        help="Relative card-preview output path inside each template folder. Default: preview.png",
    )
    parser.add_argument(
        "--full-output",
        default="previews/full.png",
        help="Relative full-page preview output path inside each template folder. Default: previews/full.png",
    )
    parser.add_argument(
        "--card-crop",
        type=float,
        default=0.56,
        help="Deprecated: retained for compatibility. Card previews now use --card-width/--card-height/--card-zoom.",
    )
    parser.add_argument(
        "--card-width",
        type=int,
        default=960,
        help="Generated card preview width in browser CSS pixels. Default: 960",
    )
    parser.add_argument(
        "--card-height",
        type=int,
        default=620,
        help="Generated card preview height in browser CSS pixels. Default: 620",
    )
    parser.add_argument(
        "--card-zoom",
        type=float,
        default=2.0,
        help="Zoom applied to the resume before taking the card screenshot. Default: 2.0",
    )
    parser.add_argument(
        "--card-align",
        choices=["center", "left"],
        default="center",
        help="Horizontal focus for the zoomed card preview. Default: center",
    )
    parser.add_argument(
        "--scale",
        type=float,
        default=3.0,
        help="Screenshot device scale factor. Higher values create sharper preview images.",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=980,
        help="Browser viewport width used while taking screenshots.",
    )
    parser.add_argument(
        "--height",
        type=int,
        default=1300,
        help="Browser viewport height used while taking screenshots.",
    )
    parser.add_argument(
        "--no-update-meta",
        action="store_true",
        help="Do not set meta.json previewImage to the generated output path.",
    )
    return parser.parse_args()


def load_fixture(fixturePath):
    with open(fixturePath, "r", encoding="utf-8") as file:
        resumeData = json.load(file)
    if not isinstance(resumeData, dict):
        raise ValueError(f"Fixture must contain a JSON object: {fixturePath}")
    return resumeData


def normalize_asset_path(rawPath):
    raw = str(rawPath or "").strip().replace("\\", "/")
    if not raw or raw.startswith("/"):
        raise ValueError("Asset path must be relative to the template folder.")
    purePath = PurePosixPath(raw)
    if any(part in ("", ".", "..") for part in purePath.parts):
        raise ValueError("Asset path cannot contain empty, current, or parent segments.")
    return purePath.as_posix()


def discover_template_slugs():
    slugs = []
    for item in sorted(templatesDir.iterdir(), key=lambda path: path.name):
        if not item.is_dir():
            continue
        if not (item / "meta.json").is_file():
            continue
        if not (item / "template.html").is_file():
            continue
        if not (item / "preview.css").is_file():
            continue
        slugs.append(item.name)
    return slugs


def update_meta_preview_image(templateDir, outputRelativePath, fullOutputRelativePath=None):
    metaPath = templateDir / "meta.json"
    with open(metaPath, "r", encoding="utf-8") as file:
        meta = json.load(file)
    if not isinstance(meta, dict):
        raise ValueError(f"meta.json must contain an object: {metaPath}")
    changed = False
    if meta.get("previewImage") != outputRelativePath:
        meta["previewImage"] = outputRelativePath
        changed = True

    if fullOutputRelativePath:
        snippets = meta.get("previewSnippets")
        if not isinstance(snippets, dict):
            snippets = {}
        if snippets.get("full") != fullOutputRelativePath:
            snippets["full"] = fullOutputRelativePath
            meta["previewSnippets"] = snippets
            changed = True

    if not changed:
        return False

    with open(metaPath, "w", encoding="utf-8") as file:
        json.dump(meta, file, indent=2)
        file.write("\n")
    return True


def output_path_for_template(templateDir, outputRelativePath):
    return templateDir / Path(*PurePosixPath(outputRelativePath).parts)


def screenshot_resume_card(page, outputPath, cardWidth, cardHeight, cardZoom, cardAlign):
    zoom = max(1.0, float(cardZoom))
    alignLeft = cardAlign == "left"
    transformOrigin = "top left" if alignLeft else "top center"
    marginRule = "margin: 0 !important;" if alignLeft else "margin: 0 auto !important;"

    page.set_viewport_size({"width": int(cardWidth), "height": int(cardHeight)})
    page.add_style_tag(
        content=f"""
        html,
        body {{
            width: {int(cardWidth)}px !important;
            height: {int(cardHeight)}px !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #f8fafc !important;
        }}

        .body-wrapper {{
            display: block !important;
            width: {int(cardWidth)}px !important;
            height: {int(cardHeight)}px !important;
            overflow: hidden !important;
            background: #f8fafc !important;
        }}

        .resume {{
            {marginRule}
            transform: scale({zoom}) !important;
            transform-origin: {transformOrigin} !important;
            box-shadow: none !important;
            border-radius: 0 !important;
        }}
        """
    )
    outputPath.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(outputPath), animations="disabled")


def render_template_preview(
    page,
    templateSlug,
    resumeData,
    outputRelativePath,
    fullOutputRelativePath,
    cardCrop,
    cardWidth,
    cardHeight,
    cardZoom,
    cardAlign,
    fullViewportWidth,
    fullViewportHeight,
    updateMeta,
):
    templateDir = templatesDir / templateSlug
    outputPath = output_path_for_template(templateDir, outputRelativePath)
    fullOutputPath = output_path_for_template(templateDir, fullOutputRelativePath)
    fullOutputPath.parent.mkdir(parents=True, exist_ok=True)

    htmlContent = generate_resume(templateSlug, resumeData, style_preferences={})
    page.set_viewport_size({"width": int(fullViewportWidth), "height": int(fullViewportHeight)})
    page.set_content(htmlContent, wait_until="networkidle")
    page.locator(".resume").screenshot(path=str(fullOutputPath), animations="disabled")
    screenshot_resume_card(page, outputPath, cardWidth, cardHeight, cardZoom, cardAlign)

    metaUpdated = False
    if updateMeta:
        metaUpdated = update_meta_preview_image(
            templateDir,
            outputRelativePath,
            fullOutputRelativePath,
        )

    return {
        "template": templateSlug,
        "output": str(outputPath.relative_to(repoRoot)),
        "fullOutput": str(fullOutputPath.relative_to(repoRoot)),
        "metaUpdated": metaUpdated,
    }


def main():
    args = parse_args()
    fixturePath = Path(args.fixture).resolve()
    outputRelativePath = normalize_asset_path(args.output)
    fullOutputRelativePath = normalize_asset_path(args.full_output)
    resumeData = load_fixture(fixturePath)
    templateSlugs = args.templateSlugs or discover_template_slugs()

    if not templateSlugs:
        raise SystemExit("No template folders found.")

    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            context = browser.new_context(
                viewport={"width": args.width, "height": args.height},
                device_scale_factor=args.scale,
            )
            page = context.new_page()
            for templateSlug in templateSlugs:
                templateDir = templatesDir / templateSlug
                if not templateDir.is_dir():
                    raise SystemExit(f"Template folder does not exist: {templateSlug}")
                result = render_template_preview(
                    page,
                    templateSlug,
                    resumeData,
                    outputRelativePath,
                    fullOutputRelativePath,
                    args.card_crop,
                    args.card_width,
                    args.card_height,
                    args.card_zoom,
                    args.card_align,
                    args.width,
                    args.height,
                    updateMeta=not args.no_update_meta,
                )
                results.append(result)
        finally:
            browser.close()

    for result in results:
        suffix = " (meta updated)" if result["metaUpdated"] else ""
        print(f"{result['template']}: {result['output']} + {result['fullOutput']}{suffix}")


if __name__ == "__main__":
    main()
