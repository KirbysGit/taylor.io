# AI Tailoring Pipeline Walkthrough

This document explains the current end-to-end flow for resume tailoring and the new module boundaries.

## 1) Request In

From frontend, `POST /ai/job-tailor/suggest` sends:

- `target_role`
- `job_description`
- `resume_data`
- `template_name`, `focus`, `tone`, `strict_truth`

Primary entrypoint:

- `backend/ai/job_tailor_service.py`
- Function: `build_job_tailor_suggestions(...)`

That file is now an orchestrator only (no heavy helper logic).

## 2) Extraction Stage

File:

- `backend/ai/extraction/extractor.py`

Called by orchestrator:

- `extract_job_keywords_detailed(job_description, target_role, limit=12)`


Output includes:

- `active_domains`
- ranked `keywords` (`term`, `score`, `frequency`, `sources`)
- `dynamic_phrase_candidates`

## 3) Processing Stage

File:

- `backend/ai/processing/tailor_context.py`

Called by orchestrator:

- `build_tailor_context(...)`

Produces normalized tailoring context:

- `keywords_primary`, `keywords_secondary`, `phrase_focus`
- `verified_resume_terms` / `target_gap_terms`
- `core_verified_keywords` / `supporting_verified_keywords`
- deterministic `item_id` fields for experience/projects
- `normalized_resume_data`

## 4) Planning Stage

File:

- `backend/ai/planning/edit_plan.py`

Called by orchestrator:

- `build_edit_plan(...)`

Produces deterministic guidance:

- evidence ranking (`jd_evidence_lines`, `resume_evidence_lines`)
- section priorities
- risk flags
- per-item section scoring (`experience`, `projects`)
- `skills_candidates`

## 5) Prompt Stage

File:

- `backend/ai/prompt/builder.py`

Called by orchestrator:

- `build_job_tailor_prompt(payload, tailor_context, edit_plan)`

Produces:

- `system_prompt`
- `user_prompt`
- prompt context metadata for debugging

Prompt remains evidence-first with strict structured output expectations (`section_optimizations` as canonical decision object).

## 6) OpenAI Provider Stage

Files:

- `backend/ai/openai/provider.py`

Called by orchestrator:

- `is_openai_enabled()`
- `get_openai_model()`
- `request_chat_completion(...)`
- `build_openai_request_payload(...)` (debug preview)

If provider is disabled, orchestration continues with deterministic fallback outputs.

## 7) New Shared Utilities Stage

File:

- `backend/ai/shared/text_utils.py`

Contains reusable logic previously duplicated in service-level helpers:

- term matching: `contains_term(...)`
- lightweight tokenization: `tokenize(...)`
- concept token normalization helpers
- `safe_float(...)`

Used by post-processing validation/classification modules.

## 8) New Post-Processing Stage

Folder:

- `backend/ai/post_processing/`

This stage handles acceptance, safety checks, patching, and UI-friendly outputs after model response.

### 8.1 Validation

File:

- `post_processing/validation.py`

Key checks:

- unverified gap-term usage
- evidence alignment
- unsupported claim language
- semantic drift
- dropped quantified evidence
- unverified infra/process claims
- supporting-without-core overuse
- generalized concept warnings (`direct` / `adjacent` / `missing`)

### 8.2 Formatting Preservation

File:

- `post_processing/formatting.py`

Preserves bullet formatting when model rewrites come back as paragraph text:

- detect bullets
- split paragraph into points
- re-apply bullet prefix

### 8.3 Patch Construction + Apply

File:

- `post_processing/patching.py`

Responsibilities:

- fallback `section_optimizations` from deterministic plan
- compile canonical `suggested_resume_data_patch`
- apply patch to `normalized_resume_data`
- skills safety helpers (`extract_skill_names_from_resume`, reorder validation)

### 8.4 Provider Acceptance Gate

File:

- `post_processing/provider_acceptance.py`

Function:

- `apply_provider_json_if_safe(...)`

Behavior:

- accepts model fields only if safe and verifiable
- rejects unknown `item_id` operations
- validates rewrites before they enter canonical optimizations
- keeps fallback values where model output is invalid
- returns parse/validation debug counters for observability

### 8.5 Change Classification + Reasoning Feed

File:

- `post_processing/classification.py`

Functions:

- `build_classified_changes(...)`
- `build_reasoning_feed(...)`

Purpose:

- produce frontend-ready change cards with risk levels
- produce reasoning summary payload for assist UI

## 9) New Debug I/O Stage

Folder:

- `backend/ai/debug/`

File:

- `debug/io.py`

Responsibilities:

- writes run-level debug snapshots
- writes provider debug snapshots
- writes raw provider response text
- strips raw `resume_data` from prompt debug copy when needed

Primary debug outputs:

- `backend/ai/debug_outputs/job_tailor_latest.json`
- `backend/ai/debug_outputs/job_tailor_history.jsonl`
- `backend/ai/debug_outputs/openai_latest.json`
- `backend/ai/debug_outputs/openai_history.jsonl`
- `backend/ai/debug_outputs/openai_latest_response.txt`

## 10) Canonical Data Flow (Current)

1. Extract JD signals.
2. Build transformed `tailor_context`.
3. Build deterministic `edit_plan`.
4. Build prompt bundle.
5. Optional provider call.
6. Build fallback section optimizations.
7. If provider JSON exists, run acceptance gate and merge safely.
8. Build patch from canonical `section_optimizations`.
9. Apply patch to produce `suggested_resume_data`.
10. Build `classified_changes` + `reasoning_feed`.
11. Return `JobTailorSuggestResponse`.

## 11) Canonical Decision Rule

Single source of truth:

- `section_optimizations`

Derived downstream only:

- `suggested_resume_data_patch`
- `suggested_resume_data`
- `classified_changes`
- `reasoning_feed`

This avoids contradictory parallel decision layers.

## 12) High-Level Module Map

- `extraction/` -> signal capture
- `processing/` -> normalized tailoring context
- `planning/` -> deterministic evidence + scoring strategy
- `prompt/` -> model input contract
- `openai/` -> provider transport + parsing
- `shared/` -> common text/numeric helpers
- `post_processing/` -> validation, acceptance, patching, formatting, UI outputs
- `debug/` -> persisted trace/debug artifacts
- `job_tailor_service.py` -> orchestrator

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
    - `section_optimizations.skills` with `reorder_verified_front`
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
  - skills front-priority reorder is accepted only when every promoted skill already exists in resume evidence
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
  - `skills.reorder_front`

Debug output now includes per-section counts and applied patch summary in `openai_latest.json`.