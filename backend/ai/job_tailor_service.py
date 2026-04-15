from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from .debug import (
    PROVIDER_RESPONSE_LATEST,
    strip_resume_data_from_user_prompt,
    write_debug_output,
    write_provider_debug_output,
    write_provider_response_text,
)
from .extraction import extract_keywords
from .openai import build_openai_request_payload, get_openai_model, is_openai_enabled, request_chat_completion
from .planning import build_edit_plan
from .post_processing import (
    apply_patch_to_resume_data,
    apply_provider_json_if_safe,
    build_classified_changes,
    build_concept_warnings,
    build_fallback_section_optimizations,
    build_patch_from_section_optimizations,
    build_reasoning_feed,
    extract_skill_names_from_resume,
)
from .processing import build_tailor_context
from .prompt import build_job_tailor_prompt
from .schemas import JobTailorSuggestRequest, JobTailorSuggestResponse, SectionOptimizations

logger = logging.getLogger(__name__)


def build_job_tailor_suggestions(payload, user_id):
    
    # extract the job's keywords.
    # - payload.job_description -> the job description
    # - limit=12 -> the number of keywords to extract
    # - target_role=payload.target_role -> the target role

    ext_result = extract_keywords(payload["job_description"], payload["target_role"], numKeywords=12)
    
    # get the keywords and active domains from our extraction result.
    keywords = ext_result["keywords"]
    active_domains = ext_result["active_domains"]

    # get the resume data.
    resume_data = payload["resume_data"] if isinstance(payload["resume_data"], dict) else {}

    #print(f"keywords: {keywords}\n")
    #print(f"active_domains: {active_domains}\n")
    #print(f"resume_data: {resume_data}\n")

    tailor_context = build_tailor_context(
        target_role=payload["target_role"],
        keywords=keywords,
        resume_data=resume_data,
    )

    #print(f"tailor_context: {tailor_context}\n")

    return 
    edit_plan = build_edit_plan(
        tailor_context=tailor_context,
        resume_data=resume_data,
        job_description=payload.job_description,
        target_role=payload.target_role or "",
    )
    prompt_bundle = build_job_tailor_prompt(payload, tailor_context=tailor_context, edit_plan=edit_plan)

    core_verified_keywords = list(tailor_context.get("core_verified_keywords", []))[:12]
    supporting_verified_keywords = list(tailor_context.get("supporting_verified_keywords", []))[:12]
    verified_keywords = list(
        dict.fromkeys(
            core_verified_keywords
            + supporting_verified_keywords
            + list(tailor_context.get("verified_resume_terms", tailor_context.get("resume_hits", [])))
        )
    )[:12]
    target_gap_keywords = list(tailor_context.get("target_gap_terms", tailor_context.get("resume_gaps", [])))[:12]
    ui_keywords = core_verified_keywords or verified_keywords or (
        tailor_context.get("keywords_primary", [])
        + [term for term in tailor_context.get("keywords_secondary", []) if term not in tailor_context.get("keywords_primary", [])]
    )[:12] or reusable_keywords or raw_keywords

    selected_model = get_openai_model()
    provider_output_debug: Dict[str, Any] = {
        "enabled": is_openai_enabled(),
        "attempted": False,
        "model": selected_model,
        "finish_reason": None,
        "error": None,
        "response_preview": None,
        "parsed_json": None,
        "usage": None,
    }
    provider_full_content = ""

    logger.info("AI provider status enabled=%s model=%s user_id=%s", provider_output_debug["enabled"], selected_model, user_id)
    if provider_output_debug["enabled"]:
        provider_output_debug["attempted"] = True
        try:
            provider_result = request_chat_completion(
                model=selected_model,
                system_prompt=prompt_bundle["system_prompt"],
                user_prompt=prompt_bundle["user_prompt"],
            )
            provider_output_debug["finish_reason"] = provider_result.get("finish_reason")
            provider_full_content = str(provider_result.get("content") or "")
            provider_output_debug["response_preview"] = provider_full_content[:1800]
            provider_output_debug["parsed_json"] = provider_result.get("parsed_json")
            provider_output_debug["usage"] = provider_result.get("usage")
            logger.info(
                "AI provider response ok model=%s finish_reason=%s tokens=%s",
                selected_model,
                provider_output_debug["finish_reason"],
                provider_output_debug["usage"],
            )
        except Exception as exc:
            provider_output_debug["error"] = str(exc)
            logger.exception("AI provider call failed model=%s", selected_model)
    else:
        logger.info("AI provider call skipped (AI_USE_OPENAI not enabled or API key missing)")

    write_debug_output(
        {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "request": {
                "target_role": payload.target_role,
                "job_description_chars": len(payload.job_description),
                "template_name": payload.template_name,
                "strict_truth": payload.strict_truth,
            },
            "extraction": {
                "active_domains": extraction_result["active_domains"],
                "top_keywords_raw": extraction_result["keywords"][:12],
                "keywords_filtered": reusable_keywords[:12],
                "keywords_abstracted": abstracted_keywords[:12],
                "dynamic_phrase_candidates": extraction_result["dynamic_phrase_candidates"][:10],
                "tailor_context": tailor_context,
                "edit_plan": edit_plan,
            },
            "prompt_setup": {
                "prompt_version": prompt_bundle["prompt_version"],
                "context": prompt_bundle["context"],
                "system_prompt": prompt_bundle["system_prompt"],
                "user_prompt": strip_resume_data_from_user_prompt(prompt_bundle["user_prompt"]),
                "resume_input_debug": prompt_bundle.get("resume_input_debug", {}),
                "openai_payload_preview": build_openai_request_payload(
                    model=selected_model,
                    system_prompt=prompt_bundle["system_prompt"],
                    user_prompt=strip_resume_data_from_user_prompt(prompt_bundle["user_prompt"]),
                ),
                "provider_output_debug": provider_output_debug,
            },
        }
    )

    normalized_resume_data = tailor_context.get("normalized_resume_data") if isinstance(tailor_context.get("normalized_resume_data"), dict) else resume_data
    keywords = ui_keywords
    warnings: List[str] = []

    section_optimizations = build_fallback_section_optimizations(
        edit_plan=edit_plan if isinstance(edit_plan, dict) else {},
        resume_data=normalized_resume_data if isinstance(normalized_resume_data, dict) else {},
    )
    suggested_resume_data_patch = build_patch_from_section_optimizations(section_optimizations)
    suggested_resume_data = apply_patch_to_resume_data(normalized_resume_data, suggested_resume_data_patch)

    provider_parse_debug: Dict[str, Any] = {"used": False}
    parsed_json = provider_output_debug.get("parsed_json")
    if isinstance(parsed_json, dict):
        (
            keywords,
            core_verified_keywords,
            supporting_verified_keywords,
            target_gap_keywords,
            warnings,
            suggested_resume_data,
            section_optimizations,
            suggested_resume_data_patch,
            provider_parse_debug,
        ) = apply_provider_json_if_safe(
            parsed_json=parsed_json,
            resume_gaps=list(tailor_context.get("resume_gaps", [])),
            resume_hits=list(tailor_context.get("resume_hits", [])),
            core_verified_keywords=core_verified_keywords,
            supporting_verified_keywords=supporting_verified_keywords,
            resume_evidence_lines=list(edit_plan.get("resume_evidence_lines", [])) if isinstance(edit_plan, dict) else [],
            has_experience=isinstance(resume_data.get("experience"), list) and bool(resume_data.get("experience")),
            has_projects=isinstance(resume_data.get("projects"), list) and bool(resume_data.get("projects")),
            has_skills=isinstance(resume_data.get("skills"), list) and bool(resume_data.get("skills")),
            fallback_resume_data=normalized_resume_data,
            fallback_section_optimizations=section_optimizations,
            fallback_keywords=keywords,
            fallback_core_keywords=core_verified_keywords,
            fallback_supporting_keywords=supporting_verified_keywords,
            fallback_target_gap_keywords=target_gap_keywords,
            available_skills=extract_skill_names_from_resume(normalized_resume_data if isinstance(normalized_resume_data, dict) else {}),
            fallback_warnings=warnings,
        )

    concept_warnings = build_concept_warnings(
        target_concepts=target_gap_keywords[:6],
        resume_hits=list(tailor_context.get("verified_resume_terms", tailor_context.get("resume_hits", []))),
        resume_evidence_lines=list(edit_plan.get("resume_evidence_lines", [])) if isinstance(edit_plan, dict) else [],
        resume_data=normalized_resume_data if isinstance(normalized_resume_data, dict) else {},
        limit=4,
    )
    for warning in concept_warnings:
        if warning not in warnings:
            warnings.append(warning)

    classified_changes = build_classified_changes(section_optimizations)
    reasoning_feed = build_reasoning_feed(
        target_role=payload.target_role or "",
        verified_keywords=keywords,
        target_gap_keywords=target_gap_keywords,
        warnings=warnings,
        edit_plan=edit_plan if isinstance(edit_plan, dict) else {},
        classified_changes=classified_changes,
    )

    write_provider_response_text(provider_full_content)
    write_provider_debug_output(
        {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "target_role": payload.target_role,
            "provider": {
                "enabled": provider_output_debug.get("enabled"),
                "attempted": provider_output_debug.get("attempted"),
                "model": provider_output_debug.get("model"),
                "finish_reason": provider_output_debug.get("finish_reason"),
                "error": provider_output_debug.get("error"),
                "usage": provider_output_debug.get("usage"),
            },
            "response": {
                "file": str(PROVIDER_RESPONSE_LATEST),
                "preview": provider_output_debug.get("response_preview"),
                "preview_chars": len(str(provider_output_debug.get("response_preview") or "")),
            },
            "resume_input_debug": prompt_bundle.get("resume_input_debug", {}),
            "parsed_json": provider_output_debug.get("parsed_json"),
            "validation": provider_parse_debug,
            "classified_changes": classified_changes,
            "reasoning_feed": reasoning_feed,
        }
    )

    return JobTailorSuggestResponse(
        prompt_version=prompt_bundle["prompt_version"],
        model=selected_model,
        summary=(
            "Prompt scaffold prepared and mock tailoring complete. "
            "Use usage.prompt_debug and usage.provider_output_debug to inspect request/response mapping."
        ),
        ats_keywords=keywords,
        verified_ats_keywords=keywords,
        core_verified_keywords=core_verified_keywords,
        supporting_verified_keywords=supporting_verified_keywords,
        target_gap_keywords=target_gap_keywords,
        warnings=warnings,
        suggestions=[],
        section_optimizations=SectionOptimizations.model_validate(section_optimizations),
        suggested_resume_data_patch=suggested_resume_data_patch,
        suggested_resume_data=suggested_resume_data,
        classified_changes=classified_changes,
        reasoning_feed=reasoning_feed,
        usage={
            "user_id": user_id,
            "job_description_chars": len(payload.job_description),
            "suggestion_count": 0,
            "is_mock": True,
            "openai_live_enabled": provider_output_debug["enabled"],
            "provider_response_file": str(PROVIDER_RESPONSE_LATEST),
            "verified_ats_keywords": keywords,
            "core_verified_keywords": core_verified_keywords,
            "supporting_verified_keywords": supporting_verified_keywords,
            "target_gap_keywords": target_gap_keywords,
            "classified_changes": classified_changes,
            "reasoning_feed": reasoning_feed,
            "suggested_resume_data_patch": suggested_resume_data_patch,
            "section_optimizations": section_optimizations,
            "tailor_context": tailor_context,
            "edit_plan": edit_plan,
            "provider_output_debug": provider_output_debug,
            "provider_parse_debug": provider_parse_debug,
            "prompt_debug": {
                "context": prompt_bundle["context"],
                "resume_input_debug": prompt_bundle.get("resume_input_debug", {}),
                "prompt_char_counts": {
                    "system_prompt": len(prompt_bundle["system_prompt"]),
                    "user_prompt": len(prompt_bundle["user_prompt"]),
                },
                "prompt_preview": {
                    "system_prompt": prompt_bundle["system_prompt"][:600],
                    "user_prompt": prompt_bundle["user_prompt"][:1200],
                },
                "extraction_debug": {
                    "active_domains": extraction_result["active_domains"],
                    "top_keywords_raw": extraction_result["keywords"][:12],
                    "keywords_filtered": reusable_keywords[:12],
                    "keywords_abstracted": abstracted_keywords[:12],
                    "dynamic_phrase_candidates": extraction_result["dynamic_phrase_candidates"][:10],
                    "tailor_context": tailor_context,
                    "edit_plan": edit_plan,
                },
            },
        },
    )


if __name__ == "__main__":

    job_description = """
        About the job
        ABOUT THE ROLE

        Interval Partners is a multi-billion-dollar alternative investment firm located in midtown Manhattan. We are seeking a Full Stack Analytics Engineer to join our team. This is a hands‑on, ownership‑oriented role: you will build and maintain alternative data pipelines, develop forward‑looking KPI estimates, and design analytics and tools that directly support portfolio managers and analysts. The ideal candidate is intellectually rigorous, comfortable working end‑to‑end across data, modeling, and tooling, and motivated by turning complex datasets into clear, actionable investment insight.


        KEY RESPONSIBILITIES

        Data Pipelines & KPI Estimation

        Collaborate with the data team to build and maintain robust ingestion pipelines for alternative datasets. 
        Transform raw vendor data into clean, analysis-ready outputs that map to fundamental KPIs such as revenue, same store sales, GMV, and others.


        Analyst and Portfolio Manager Support

        Dig into the "why" behind trends you and the analysts see in the data.
        Translate analyst hypotheses into testable frameworks and deliver clear, well-documented findings with appropriate statistical context and caveats.
        Proactively surface insights and data-driven alerts that may be relevant to existing or prospective positions. 
        Implement requests from Analysts and PM’s for their reporting needs.


        Dashboards & Visual Analytics

        Design and maintain custom web applications that allow analysts to explore, compare, combine, and benchmark signals across multiple alternative data providers for a given company or sector. Own the full lifecycle from backend data layer through frontend UI. Collaborate with vendor to ensure product meets business needs.
        Build intuitive, interactive visualizations of trends, seasonal adjustments, revision histories, and cross-provider discrepancies within the firm's custom analytics platform. 
        Work with the investment team to iterate on dashboard design and ensure outputs align with how PMs and analysts make decisions. 
        Architect and maintain the firm's alternative data web application, including backend APIs, data models, and frontend components, iterating on design with the investment team to ensure outputs map to how PMs and analysts make decisions. 


        AI Agent Integration

        Structure and expose processed alternative data outputs in formats consumable by internal AI/LLM-based research agents (e.g., retrieval-augmented generation pipelines, structured APIs). 
        Collaborate with the data and technology teams to ensure data is contextualized, well-documented, and retrievable in ways that maximize its utility for automated research workflows. 
        Build and maintain MCP servers and AI Agents to allow analysts to query, explore, and synthesize alternative data conversationally. 
        Design and implement LLM-powered research workflows on cloud infrastructure (Azure), including retrieval-augmented generation pipelines, structured tool-use agents, and conversational interfaces over alternative data. 
        Drive the transition of alternative data consumption from static, report-based delivery toward interactive, on-demand access through LLM agents, custom dashboards, and web applications  


        Multi-Source Forecasting Models

        Develop quantitative models that combine signals from multiple alternative data providers to generate forward-looking KPI estimates (e.g., quarterly revenue nowcasts, consensus-relative surprise probabilities). 
        Rigorously evaluate model performance, document assumptions, and communicate confidence intervals and known limitations to the investment team. 
        Continuously improve models by incorporating new data sources, refining aggregation methodologies, and learning from forecast errors.


        Data Scouting, Backtesting & Onboarding

        Proactively identify and evaluate new alternative data vendors and datasets through independent research, industry conferences, and broker relationships. 
        Conduct thorough back tests of candidate datasets: assess coverage, historical depth, survivorship bias, look-ahead bias, and signal-to-noise ratio versus public benchmarks. 
        Manage vendor relationships, trial negotiations, and technical onboarding for approved datasets; maintain a living catalogue of the fund’s alt data assets.


        QUALIFICATIONS

        Required

        4–6 years of experience in a data analysis, data science, quantitative research, or data engineering role.
        Proficiency in Python (pandas, numpy, scikit-learn, statsmodels), comfortable working with large datasets. 
        Familiarity with cloud platforms (Azure preferred) for deploying data pipelines, APIs, and LLM-based workflows. 
        Experience with containerized deployments (Docker) and CI/CD practices. 
        Demonstrated experience building and owning end-to-end data pipelines in a production environment. 
        Ability to map alternative data observations to fundamental drivers. 
        Solid grasp of statistical methods, time-series analysis, and the pitfalls of backtesting (overfitting, multiple testing, survivorship bias). 
        Excellent written and verbal communication skills; ability to present complex quantitative work clearly to non-technical stakeholders. 
        Experience building web applications (e.g., React, Next.js, FastAPI, Flask, or similar frameworks) with both backend and frontend components. 
        Highly organized, self-directed, and comfortable managing multiple concurrent projects in a fast-paced investment environment.


        Preferred

        Direct prior experience working with alternative data vendors. 
        Familiarity with equity research, the earnings estimate process, and sell-side consensus data providers (FactSet, IBES, Bloomberg). 
        Experience building LLM-integrated data products or retrieval-augmented generation (RAG) pipelines. 
        Advanced degree (MS or PhD) in Statistics, Computer Science, Applied Mathematics, Engineering, or related quantitative discipline.


        This is a fully onsite 5 days a week role based in our Midtown office. Benefits: Full medical & vision, 401k. 

        Compensation range is 120k-150k
    """

    target_role = "Full Stack Analytics Engineer"

    resume_data = {'header': {'first_name': 'Colin', 'last_name': 'Kirby', 'email': 'kirbycolin26@gmail.com', 'phone': '407-876-8172', 'location': 'Orlando, FL', 'linkedin': 'https://linkedin.com/in/colinwkirby/', 'github': 'https://github.com/KirbysGit', 'portfolio': 'https://colinkirby.dev', 'tagline': '**Software Engineer** | _Product_ * _Design_ * _Development_', 'visibility': {'showEmail': True, 'showPhone': True, 'showLocation': True, 'showLinkedin': True, 'showGithub': True, 'showPortfolio': True, 'showTagline': False}, 'contactOrder': ['email', 'phone', 'location', 'linkedin', 'github', 'portfolio']}, 'education': [{'id': 1, 'school': 'University of Central Florida', 'degree': 'Bachelor of Science', 'discipline': 'Computer Engineering', 'location': 'Orlando, FL', 'start_date': '2021-05-01', 'end_date': '2025-05-01', 'current': False, 'gpa': '3.7 / 4.0', 'minor': 'FinTech', 'subsections': {'Honors & Awards': "Dean's List 2021, President's Honor Roll 2023 - 2025, Pegasus Gold Scholarship", 'Clubs & Extracurriculars': 'AI @ UCF , Knight Hacks , SHPE @ UCF', 'Relevant Coursework': 'Massive Storage & Big Data, Enterprise Computing, Object-Oriented Software Design'}}], 'experience': [{'id': 1, 'title': 'Software Engineering Intern', 'company': 'BitGo', 'description': '• Designed and maintained backend services and REST APIs in Python/Django supporting secure data flows across internal financial/compliance systems.\n• Collaborated with senior engineers on system design, requirements, and architecture, contributing to scalable service patterns and data modeling.\n• Built internal dashboards using React + Django APIs, enabling real-time visibility into backend data workflows and operational metrics.\n• Optimized Python data-processing pipelines and PostgreSQL queries, improving system scalability and reducing latency by ~40%.', 'start_date': '2024-05-01', 'end_date': '2025-06-01', 'current': False, 'location': 'Remote', 'skills': 'Python, Django, React, PostgreSQL, AWS EC2'}], 'projects': [{'id': 1, 'title': 'Centi – Personal Finance Web App', 'description': '• Built FastAPI backend services deployed in production, integrating financial data via ETL pipelines and normalized SQL schemas to support real-time account analytics.\n• Implemented scalable API endpoints, caching, and data modeling patterns for high-volume financial transactions.\n• Developed React dashboards for insights and authentication; deployed via containerized services and cloud-based CI/CD.', 'tech_stack': ['Python', 'SQL', 'FinBERT', 'XGBoost'], 'url': 'https://centi.dev'}, {'id': 2, 'title': 'SentimentTrader – Real-Time Stock Sentiment Pipeline ', 'description': '• Designed and implemented a full ML-driven data pipeline for real-time sentiment analytics, processing 1K+ Reddit finance posts per run via multi-stage ETL.\n• Applied NLP models (FinBERT) and feature engineering to build 40+ predictive features per ticker; trained XGBoost models achieving 55–70% ROC-AUC.\n• Built modular components for data ingestion, transformation, model inference, and distributed-style batching, aligned with message-driven architectures.\n• Automated end-to-end data collection, preprocessing, and model inference workflows, enabling scalable real-time analytics.', 'tech_stack': [], 'url': ''}, {'id': 3, 'title': 'ShelfVision – Dense Retail Shelf Object Detector ', 'description': '• Implemented a custom deep learning object detection pipeline using PyTorch with dynamic IoU matching and modular training loops.\n• Handled large-scale vision datasets (11K+ images) via optimized data loaders and GPU-accelerated training.\n• Applied ML engineering workflows including dataset preprocessing, hyperparameter tuning, checkpointing, and analysis.', 'tech_stack': [], 'url': ''}, {'id': 4, 'title': 'SecureScape – Portable Smart Security System ', 'description': '• Designed async communication layers for distributed IoT nodes, ensuring near real-time (<3.5 s) alert propagation and cross-node synchronization.\n• Built fault-tolerant Python backend supporting message handling and system reliability across constrained devices.', 'tech_stack': [], 'url': ''}], 'skills': [{'id': 1, 'name': 'Python', 'category': 'Languages'}, {'id': 2, 'name': 'JavaScript', 'category': 'Languages'}, {'id': 4, 'name': 'SQL', 'category': 'Languages'}, {'id': 5, 'name': 'Java', 'category': 'Languages'}, {'id': 6, 'name': 'Django', 'category': 'Frameworks'}, {'id': 7, 'name': 'FastAPI', 'category': 'Frameworks'}, {'id': 8, 'name': 'React', 'category': 'Frameworks'}, {'id': 9, 'name': 'Node.js', 'category': 'Frameworks'}, {'id': 10, 'name': 'PyTorch', 'category': 'Frameworks'}, {'id': 11, 'name': 'TensorFlow Lite', 'category': 'Frameworks'}, {'id': 12, 'name': 'PostgreSQL', 'category': 'Data Tools'}, {'id': 13, 'name': 'MySQL', 'category': 'Data Tools'}, {'id': 14, 'name': 'MongoDB', 'category': 'Data Tools'}, {'id': 15, 'name': 'Pandas', 'category': 'Data Tools'}, {'id': 16, 'name': 'NumPy', 'category': 'Data Tools'}, {'id': 17, 'name': 'AWS (EC2)', 'category': 'Data Tools'}, {'id': 18, 'name': 'ETL Pipelines', 'category': 'Data Tools'}, {'id': 19, 'name': 'Backend Development', 'category': 'Focus Areas'}, {'id': 20, 'name': 'Data Pipelines', 'category': 'Focus Areas'}, {'id': 21, 'name': 'ML / NLP Engineering', 'category': 'Focus Areas'}, {'id': 22, 'name': 'Rest API Design', 'category': 'Focus Areas'}], 'hiddenSkills': [], 'summary': {'summary': 'Full-stack engineer specializing in scalable data pipelines, platforms, and backend services. Skilled in React, Python, and Java, with strong database and API expertise. Passionate about turning complex data into reliable, user-focused applications.'}, 'sectionVisibility': {'summary': False, 'education': True, 'experience': True, 'projects': True, 'skills': True}, 'sectionOrder': ['header', 'summary', 'education', 'skills', 'experience', 'projects'], 'sectionLabels': {'summary': 'Professional Summary', 'education': 'Education', 'experience': 'Experience', 'projects': 'Projects', 'skills': 'Skills'}}

    payload = {
        "job_description": job_description,
        "target_role": target_role,
        "resume_data": resume_data,
    }

    build_job_tailor_suggestions(
        payload=payload,
        user_id=1,
    )