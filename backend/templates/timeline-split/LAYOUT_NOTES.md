# Timeline Split Notes

DOCX timeline icons live in:

```text
backend/templates/timeline-split/docx_icons/
  summary.png
  experience.png
  projects.png
  education.png
  email.png
  phone.png
  location.png
  linkedin.png
  github.png
  portfolio.png
```

Square PNGs are expected. Large source images, such as 1254 x 1254, are fine;
the DOCX builder scales section icons down with `timeline_marker_size_pt` and
contact icons with `timeline_contact_icon_size_pt`.

The DOCX layout is Word-first:

- one full-width masthead
- one fixed-width body table
- left column for contact and skills
- middle columns for timeline icons and the rule
- right column for profile, work, projects, and education

Avoid nested content tables in this profile unless Word layout is re-tested.
