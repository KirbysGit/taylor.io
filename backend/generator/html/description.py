# Accepts multiline text / bullet points and organizes and builds them in HTML with their style preserved accordingly.

from __future__ import annotations

import re
from typing import List, Tuple

# --- Descriptions ---

# Takes in multiline text and formats it into HTML with bullet points and paragraphs respectively.
def format_description(description: str) -> str:
    if not description:
        return ""

    # Split description into lines.
    lines = description.split("\n")
    bullet_items: List[Tuple[str, str]] = []
    non_bullet_lines: List[str] = []

    # Iterate over each line.
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # If the line starts with a bullet, add it to the bullet items.
        if stripped.startswith("•"):
            if non_bullet_lines:
                bullet_items.append(("paragraph", "\n".join(non_bullet_lines)))
                non_bullet_lines = []
            bullet_text = re.sub(r"^•\s+", "", stripped)
            if bullet_text:
                bullet_items.append(("bullet", bullet_text))
        else:
            non_bullet_lines.append(stripped)

    # If there are any non-bullet lines, add them to the bullet items.
    if non_bullet_lines:
        bullet_items.append(("paragraph", "\n".join(non_bullet_lines)))

    # If there are any bullet items, build the HTML.
    if bullet_items and any(item[0] == "bullet" for item in bullet_items):

        # Initialize the HTML parts and current bullets.
        html_parts: List[str] = []
        current_bullets: List[str] = []

        # Iterate over each bullet item.
        for item_type, content in bullet_items:
            if item_type == "bullet":
                current_bullets.append(content)
            else:
                # If there are any current bullets, add them to the HTML parts.
                if current_bullets:
                    list_items = "".join([f"<li>{bullet}</li>" for bullet in current_bullets])
                    html_parts.append(f'<ul class="description-bullets">{list_items}</ul>')
                    current_bullets = []
                html_parts.append(f'<p class="description-paragraph">{content}</p>')

        # If there are any current bullets leftover, add them to the HTML.
        if current_bullets:
            list_items = "".join([f"<li>{bullet}</li>" for bullet in current_bullets])
            html_parts.append(f'<ul class="description-bullets">{list_items}</ul>')

        return "".join(html_parts)
    return f'<p class="description-paragraph">{description}</p>'
