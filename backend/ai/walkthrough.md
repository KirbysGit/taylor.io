
# How We Tailor The Resumes.

### Beginning Of Input

From our frontend we are giving :

Job Description -> Description of the role user inputted.
Resume Data -> All of user's relevant data associated with account.

Our `extraction.py` takes that input and returns:

- `active_domains` -> detected domain labels (ex: `sales`, `finance`, `engineering`)
- `keywords` -> ranked keyword entries:

    `term` -> keyword/phrase text
    `score` -> relevance score
    `frequency` -> how often it appears
    `sources` -> where it came from (phrase, token, stack, title, etc.)

- `dynamic_phrase_candidates` -> extra phrase candidates found from JD text

### Next Stage (Post-Extraction Processing)

`processing/tailor_context.py` transforms extraction output into compact guidance:

- `target_role` -> role title used for this tailoring run.
- `active_domains` -> detected role domains from extraction (ex: engineering, sales, healthcare).
- `keywords_primary` -> top high-signal terms/phrases to prioritize in tailoring.
- `keywords_secondary` -> supporting terms that are useful but lower priority.
- `phrase_focus` -> best multi-word phrases to preserve ATS and role context.
- `resume_hits` -> primary terms already found in the current resume data.
- `resume_gaps` -> primary terms not found in the resume data (focus candidates).

### Planning Stage (Deterministic)

`planning/edit_plan.py` converts `tailor_context` into a rewrite strategy before prompt generation:

- `emphasis_targets` -> ordered targets (gaps first, then validated hits/phrases).
- `evidence_to_preserve` -> terms with verified resume support that should be kept strong.
- `gap_priorities` -> missing high-value terms to address carefully.
- `section_priorities` -> section-by-section action plan (`rewrite`, `emphasize`, `reorder`, `suggest_addition`).
- `risk_flags` -> safety signals (ex: too many gaps, sparse evidence).

### Prompt Builder (Context-Aware)

`prompt_builder.py` now supports a compact `v2` prompt flow:

- `system_prompt` stays stable (rules + truth constraints)
- `user_prompt` is structured from `tailor_context` + `edit_plan` + compact snippets:
  - `active_domains`
  - `keywords_primary`
  - `phrase_focus`
  - `resume_hits` / `resume_gaps`
  - `plan_emphasis_targets`
  - `plan_evidence_to_preserve`
  - `plan_gap_priorities`
  - `plan_section_priorities`
  - `plan_risk_flags`
  - `jd_requirements_snippet`
  - `jd_responsibilities_snippet`
  - relevant resume sections (`summary`, `skills`, `experience`, `projects`)

If `tailor_context` is missing, it falls back to the original `v1` prompt scaffold.