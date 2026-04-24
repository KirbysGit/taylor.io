from __future__ import annotations

import logging
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict, List



# in use.
from .extraction import extract_keywords
from .processing import build_tailor_context
from .planning import build_tailor_plan
from .narrative import request_narrative_brief
from .prompt import build_prompt
from .openai import ai_chat_completion
from .post_processing import parse_chat_json
from .post_processing.resume_diff import assemble_tailor_result

# schemas.
from .schemas import JobTailorSuggestRequest, JobTailorSuggestResponse

debug = True

logger = logging.getLogger(__name__)


def tailor_resume(JobTailorSuggestRequest: JobTailorSuggestRequest, user_id):
    payload = JobTailorSuggestRequest.model_dump()

    ext_result = extract_keywords(
        payload["job_description"],
        payload["target_role"],
        numKeywords=12,
        company=payload.get("company") or "",
    )
    
    # get the keywords and active domains from our extraction result.
    keywords = ext_result["keywords"]
    activeDomains = ext_result["activeDomains"]
    relevantJDLines = ext_result["relevantJDLines"]

    # get the resume data.
    resumeData = payload["resume_data"] if isinstance(payload["resume_data"], dict) else {}

    # build the tailor context.
    tailorContext = build_tailor_context(targetRole=payload["target_role"], activeDomains=activeDomains, keywords=keywords, resumeData=resumeData)

    # get what we want to focus on per section and row.
    sectionDetails = build_tailor_plan(resumeData=resumeData, tailorContext=tailorContext)

    # narrative spine: plan-ranked row hints (rowsPerSectionRanked) are passed in sectionDetails so hero picks are grounded in JD hit scores, not a vacuum.
    narrative_brief = request_narrative_brief(payload=payload, tailorContext=tailorContext, sectionDetails=sectionDetails)

    # build the prompts.
    system_prompt, user_prompt = build_prompt(
        payload=payload,
        tailorContext=tailorContext,
        sectionDetails=sectionDetails,
        relevantJDLines=relevantJDLines,
        narrativeBrief=narrative_brief,
    )

    # request chat completion.
    text, usage = ai_chat_completion(system_prompt=system_prompt, user_prompt=user_prompt)
    
  
    out = parse_chat_json(text)
    target_role_str = str((payload or {}).get("target_role") or "") if isinstance(payload, dict) else ""

    if debug:
        final_out, diff_audit = assemble_tailor_result(
            original_resume=resumeData,
            stage_a=out,
            narrative_brief=narrative_brief,
            target_role=target_role_str,
            return_audit_debug=True,
            rows_per_section_ranked=(sectionDetails or {}).get("rowsPerSectionRanked") or {},
        )
    else:
        final_out = assemble_tailor_result(
            original_resume=resumeData,
            stage_a=out,
            narrative_brief=narrative_brief,
            target_role=target_role_str,
            return_audit_debug=False,
            rows_per_section_ranked=(sectionDetails or {}).get("rowsPerSectionRanked") or {},
        )
        diff_audit = None
    
    if debug:
        # create the debug output directory.
        base = Path(__file__).resolve().parent / "debug_out"
        base.mkdir(parents=True, exist_ok=True)
        # write the debug output.
        def write_debug(name, obj):
            (base / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

        write_debug("job_tailor_latest_system.json", {"prompt": system_prompt})
        write_debug("job_tailor_latest_user.json", {"prompt": user_prompt})
        write_debug("job_tailor_narrative.json", narrative_brief)
        write_debug("job_tailor_stage_a.json", out)
        write_debug("job_tailor_latest_model.json", final_out)
        if diff_audit is not None:
            if usage is not None and isinstance(usage, dict):
                diff_audit = {**diff_audit, "llm_usage_rewrite_pass": usage}
            elif usage is not None:
                diff_audit = {**diff_audit, "llm_usage_rewrite_pass": str(usage)}
            write_debug("job_tailor_diff_audit.json", diff_audit)
        text_meta = (diff_audit or {}).get("text") or {}
        rw_chars = text_meta.get("rewrite_note_chars")
        if rw_chars is None and diff_audit is not None:
            rw_chars = (diff_audit.get("rewrite_note") or {}).get("chars")
        wq = (diff_audit or {}).get("quality") or (diff_audit or {}).get("rewrite_quality") or {}
        wint = wq.get("rewrite_intensity") or {}
        wflags = wq.get("flags") or {}
        phf = (diff_audit or {}).get("plan_hero_fit") or {}
        p_proj = phf.get("projects") or {}
        hsg = phf.get("hero_slot_gap") or {}
        seg = phf.get("segment") or {}
        logger.info(
            "tailor diff_audit: patch_sections=%s change_reasons=%d warnings=%d rewrite_note_chars=%s fell_back=%s "
            "intensity exp=%s proj=%s sk=%s heroes_proj=%s heroes_exp=%s low_intensity=%s removed_rows=%s flags=%s "
            "plan_hero_in_top_k=%s plan_hero_ratio_proj=%s plan_inversions=%s "
            "hero_slot_gap_proj=%s segment_proj_heroes=%s",
            list((final_out.get("patchDiff") or {}).keys()),
            len(final_out.get("changeReasons") or []),
            len(final_out.get("warnings") or []),
            rw_chars if rw_chars is not None else "n/a",
            ((diff_audit or {}).get("merge") or {}).get("fell_back")
            if diff_audit is not None
            else "n/a",
            wint.get("experience_rows_touched"),
            wint.get("project_rows_touched"),
            wint.get("skill_rows_touched"),
            wint.get("hero_projects_edited_count"),
            wint.get("hero_experience_edited_count"),
            wint.get("low_intensity_hint"),
            wint.get("rows_removed_total"),
            {k: v for k, v in wflags.items() if v},
            p_proj.get("in_top_k"),
            p_proj.get("ratio"),
            phf.get("inversion_pair_count"),
            hsg.get("projects"),
            seg.get("narrative_had_project_heroes"),
        )

    ch = (final_out.get("summary") or "").strip()
    return JobTailorSuggestResponse(
        summary=ch,
        updatedResumeData=final_out["updatedResumeData"],
        patchDiff=final_out["patchDiff"],
        changeReasons=final_out["changeReasons"],
        warnings=final_out["warnings"],
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
        "company": "Interval Partners",
        "target_role": target_role,
        "resume_data": resume_data,
    }

    tailor_resume(
        JobTailorSuggestRequest=JobTailorSuggestRequest(
            job_description=job_description,
            company="Interval Partners",
            target_role=target_role,
            resume_data=resume_data,
        ),
        user_id=1,
    )