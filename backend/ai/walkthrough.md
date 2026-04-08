
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
- `verified_resume_terms` -> resume-supported terms allowed in rewrite content.
- `target_gap_terms` -> JD target terms not verified in resume evidence.
- `section_item_ids` -> stable IDs for `experience` and `projects`.
- `normalized_resume_data` -> resume copy with deterministic `item_id` fields injected.

### Planning Stage (Deterministic)

`planning/edit_plan.py` converts `tailor_context` into a rewrite strategy before prompt generation:

- `emphasis_targets` -> ordered targets (gaps first, then validated hits/phrases).
- `evidence_to_preserve` -> terms with verified resume support that should be kept strong.
- `gap_priorities` -> missing high-value terms to address carefully.
- `jd_evidence_lines` -> top ranked JD lines (compact, high-signal evidence).
- `resume_evidence_lines` -> top ranked resume lines that best match JD evidence.
- `section_priorities` -> section-by-section action plan (`rewrite`, `emphasize`, `reorder`, `suggest_addition`).
- `risk_flags` -> safety signals (ex: too many gaps, sparse evidence).
- `section_scoring` -> full-section scoring output:
  - `experience[]` and `projects[]` each include `item_id`, `decision`, `jd_alignment_score`, `evidence_strength_score`, `risk_score`, `overall_priority`
  - `skills_candidates` includes top verified+aligned skill names for tailored top-N output

### Prompt Stage (Context-Aware)

`prompt/builder.py` now supports a compact `v2` prompt flow:

- `system_prompt` stays stable (rules + truth constraints)
- `user_prompt` is structured from `tailor_context` + `edit_plan` with a **full-section optimizer** contract:
  - role summary (`target_role`, `template`, `focus`, `tone`, `strict_truth`)
  - minimal planning summary:
  - `keywords_primary`
  - `resume_gaps`
  - `plan_section_priorities`
  - `plan_risk_flags`
  - grounding evidence:
    - `top_jd_evidence_lines`
    - `top_resume_evidence_lines`
  - full `experience` / `projects` item candidate blocks with `item_id` and score hints
  - required output now includes:
    - `section_optimizations.summary`
    - `section_optimizations.experience[]` with decisions per `item_id`
    - `section_optimizations.projects[]` with decisions per `item_id`
    - `section_optimizations.skills` with `replace_top_n`
    - `suggested_resume_data_patch` using ID-targeted operations

If `tailor_context` is missing, it falls back to the original `v1` prompt scaffold.

### OpenAI Stage (Provider Setup)

`openai/provider.py` now provides initial provider helpers:

- `build_chat_messages` -> builds role-based chat messages from system/user prompts.
- `build_openai_request_payload` -> builds a provider request payload preview (`model`, `messages`, `temperature`).
- `is_openai_configured` -> checks whether `OPENAI_API_KEY` is present.

Live call behavior (optional):

- Set `AI_USE_OPENAI=true` and provide `OPENAI_API_KEY` to enable provider calls.
- Model defaults to `gpt-4o-mini` (override with `OPENAI_MODEL`).
- Service writes provider output into debug:
  - `prompt_setup.provider_output_debug` in `debug_outputs/job_tailor_latest.json`
  - `prompt_setup.resume_input_debug` in `debug_outputs/job_tailor_latest.json`
  - `usage.provider_output_debug` in API response
  - `usage.prompt_debug.resume_input_debug` in API response
  - full raw text in `debug_outputs/openai_latest_response.txt`
  - full provider record in `debug_outputs/openai_latest.json`
- `provider_output_debug` includes:
  - `response_preview` (truncated)
  - `parsed_json` (if response is valid JSON object)
  - provider token usage
  - error string if the call fails
- Service-side safety gate:
  - parsed model suggestions are accepted only when rewrite text avoids unverified `resume_gaps` terms
  - parsed model suggestions must also align with verified resume evidence (hits/evidence-lines overlap)
  - parsed model suggestions are rejected if they introduce unsupported ownership/customer-facing implementation claims
  - section optimization entries with unknown `item_id` are rejected
  - skills `replace_top_n` is accepted only when every skill already exists in resume evidence
  - semantic drift checks reject JD-flavored business framing not supported by evidence
  - rejected rewrites are skipped and reported in warnings/debug

### Default Output Mode (Full Section Optimization)

The response now includes both compatibility fields and optimizer-native fields:

- `verified_ats_keywords` and `target_gap_keywords` (separate lists, never merged)
- `section_optimizations` (full section decisions/results)
- `suggested_resume_data_patch` (ID-based patch operations):
  - `summary.update`
  - `experience.update_by_id[]`
  - `projects.update_by_id[]`
  - `skills.replace_top_n`

Debug output now includes per-section counts and applied patch summary in `openai_latest.json`.