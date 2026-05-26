from __future__ import annotations

import re
from typing import Any

from ..shared.text_utils import normalize_term


def _clean(value: Any, limit: int = 120) -> str:
    text = " ".join(str(value or "").strip().split())
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)].rstrip() + "..."


def _norm_list(items: Any, limit: int = 12) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for item in items or []:
        if isinstance(item, dict):
            text = item.get("term") or item.get("label") or item.get("theme")
        else:
            text = item
        cleaned = _clean(text, limit=80)
        if not cleaned:
            continue
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(cleaned)
        if len(out) >= limit:
            break
    return out


def _joined_signal_text(payload: dict, tailor_context: dict, alignment_context: dict) -> str:
    parts: list[str] = []
    for key in ("target_role", "company", "job_description"):
        value = payload.get(key) if isinstance(payload, dict) else ""
        if isinstance(value, str):
            parts.append(value)
    for key in ("keywords", "priorityKeywords", "rawKeywords"):
        for entry in tailor_context.get(key) or []:
            if isinstance(entry, dict):
                parts.append(str(entry.get("term") or ""))
            elif isinstance(entry, str):
                parts.append(entry)
    for key in ("resumeHits", "resumeGaps", "activeDomains"):
        parts.extend(str(x) for x in (tailor_context.get(key) or []) if str(x).strip())
    for item in alignment_context.get("jdSignalIntent") or []:
        if isinstance(item, dict):
            parts.append(str(item.get("term") or ""))
            parts.append(str(item.get("intent") or ""))
    return normalize_term(" ".join(parts))


def _has_any(text: str, terms: set[str]) -> bool:
    for term in terms:
        if re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", text):
            return True
    return False


def _match_count(text: str, terms: set[str]) -> int:
    return sum(1 for term in terms if re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", text))


def _score(text: str, terms: set[str]) -> int:
    return _match_count(text, terms)


def _target_text(payload: dict, tailor_context: dict) -> str:
    role = payload.get("target_role") if isinstance(payload, dict) else ""
    target = role or tailor_context.get("targetRole") if isinstance(tailor_context, dict) else role
    return normalize_term(target or "")


def _archetype_term_sets() -> dict[str, set[str]]:
    return {
        "ai_backend_integration": {
            "conversational ai",
            "llm",
            "llm models",
            "dialogflow",
            "google ces",
            "amazon bedrock",
            "openai",
            "prompt engineering",
            "api integration",
            "api integrations",
            "backend services",
            "cloud platform",
            "intelligent interactions",
            "conversational applications",
        },
        "data_dashboard_development": {
            "streamlit",
            "dashboard",
            "dashboards",
            "data visualization",
            "visualization",
            "reporting tools",
            "web ui",
            "analytical interfaces",
            "python",
            "sql",
            "database",
        },
        "data_ai_analytics_ownership_stretch": {
            "data lead",
            "data & ai lead",
            "first data hire",
            "data repository",
            "roi reporting",
            "dashboards",
            "analytics",
            "multi source",
            "multi-source",
            "executive insights",
            "reporting to leadership",
            "operations data",
            "automated reporting",
        },
        "full_stack_product_engineering": {
            "full stack",
            "full stack engineer",
            "full stack developer",
            "software engineer",
            "developer",
            "django",
            "react",
            "postgresql",
            "api",
            "apis",
            "customer-facing products",
            "internal products",
            "product mindset",
            "deployment",
            "production-grade",
            "feature ownership",
            "typescript",
            "javascript",
        },
        "functional_analyst_bridge": {
            "functional analyst",
            "business analyst",
            "systems analyst",
            "requirements gathering",
            "requirements analysis",
            "user stories",
            "acceptance criteria",
            "uat",
            "testing",
            "stakeholder communication",
            "technical documentation",
            "process mapping",
            "workflow design",
            "backlog",
            "business requirements",
        },
        "engineering_product_development_stretch": {
            "product development engineer",
            "mechanical",
            "hvac",
            "airflow",
            "manufacturing",
            "lab testing",
            "testing",
            "compliance testing",
            "cad",
            "solidworks",
            "product lifecycle",
            "thermal",
            "troubleshooting",
            "engineering documentation",
            "design verification",
        },
        "hospitality_customer_service": {
            "host",
            "hostess",
            "server",
            "restaurant",
            "hospitality",
            "dining",
            "guests",
            "guest",
            "phone etiquette",
            "reservations",
            "seating",
            "front of house",
            "customer service",
        },
        "financial_customer_education": {
            "financial services representative",
            "financial representative",
            "finance representative",
            "life insurance",
            "insurance",
            "debt",
            "money",
            "helping families",
            "financial education",
            "training",
            "customer trust",
            "financial goals",
        },
        "sales_growth_outreach": {
            "sales",
            "sales representative",
            "outreach",
            "outbound",
            "discovery calls",
            "book discovery calls",
            "qualified leads",
            "leads",
            "b2b sales",
            "go-to-market",
            "go to market",
            "account management",
            "client relations",
            "growth intern",
            "pipeline development",
        },
        "operations_admin_bridge": {
            "operations",
            "operations coordinator",
            "coordinator",
            "scheduling",
            "resource",
            "process improvement",
            "workflow optimization",
            "metrics reporting",
            "compliance",
            "administrative",
        },
    }


def _infer_role_archetype(payload: dict, tailor_context: dict, text: str, alignment_context: dict) -> str:
    target = _target_text(payload, tailor_context)
    terms = _archetype_term_sets()
    target_scores = {name: _score(target, values) for name, values in terms.items()}
    text_scores = {name: _score(text, values) for name, values in terms.items()}

    # Title-level signals are strongest and prevent broad words like growth/product/customer
    # from stealing technical, hospitality, or analyst roles.
    title_priority = (
        "hospitality_customer_service",
        "functional_analyst_bridge",
        "engineering_product_development_stretch",
        "ai_backend_integration",
        "data_ai_analytics_ownership_stretch",
        "data_dashboard_development",
        "full_stack_product_engineering",
        "financial_customer_education",
        "sales_growth_outreach",
        "operations_admin_bridge",
    )
    for archetype in title_priority:
        if target_scores.get(archetype, 0) > 0:
            # A plain "developer" title alone is too broad; require stack/product evidence.
            if archetype == "full_stack_product_engineering" and target_scores[archetype] == 1:
                if text_scores.get(archetype, 0) < 3:
                    continue
            return archetype

    if text_scores.get("ai_backend_integration", 0) >= 3:
        return "ai_backend_integration"
    if text_scores.get("data_ai_analytics_ownership_stretch", 0) >= 3:
        return "data_ai_analytics_ownership_stretch"
    if text_scores.get("data_dashboard_development", 0) >= 3:
        return "data_dashboard_development"
    if text_scores.get("full_stack_product_engineering", 0) >= 4:
        return "full_stack_product_engineering"
    if text_scores.get("functional_analyst_bridge", 0) >= 3:
        return "functional_analyst_bridge"
    if text_scores.get("engineering_product_development_stretch", 0) >= 3:
        return "engineering_product_development_stretch"
    if text_scores.get("hospitality_customer_service", 0) >= 3:
        return "hospitality_customer_service"
    if text_scores.get("financial_customer_education", 0) >= 2:
        return "financial_customer_education"
    if text_scores.get("sales_growth_outreach", 0) >= 3:
        return "sales_growth_outreach"
    if text_scores.get("operations_admin_bridge", 0) >= 3:
        return "operations_admin_bridge"

    persona = _infer_persona(text, alignment_context)
    return {
        "technical_engineering": "technical_engineering_general",
        "data_ai": "data_ai_general",
        "sales_growth": "sales_growth_outreach",
        "operations_admin": "operations_admin_bridge",
        "executive_leadership": "executive_leadership_stretch",
    }.get(persona, "general_adjacent")


def _persona_for_archetype(role_archetype: str, text: str, alignment_context: dict) -> str:
    mapping = {
        "ai_backend_integration": "data_ai",
        "data_dashboard_development": "data_ai",
        "data_ai_analytics_ownership_stretch": "data_ai",
        "full_stack_product_engineering": "technical_engineering",
        "functional_analyst_bridge": "operations_admin",
        "engineering_product_development_stretch": "general_adjacent",
        "hospitality_customer_service": "sales_growth",
        "financial_customer_education": "sales_growth",
        "sales_growth_outreach": "sales_growth",
        "operations_admin_bridge": "operations_admin",
        "technical_engineering_general": "technical_engineering",
        "data_ai_general": "data_ai",
        "executive_leadership_stretch": "executive_leadership",
    }
    return mapping.get(role_archetype) or _infer_persona(text, alignment_context)


def _lane_for_archetype(role_archetype: str, persona: str) -> str:
    mapping = {
        "full_stack_product_engineering": "technical",
        "technical_engineering_general": "technical",
        "ai_backend_integration": "technical_ai",
        "data_dashboard_development": "data",
        "data_ai_analytics_ownership_stretch": "data_ai",
        "data_ai_general": "data_ai",
        "sales_growth_outreach": "sales_customer",
        "financial_customer_education": "sales_customer",
        "hospitality_customer_service": "hospitality",
        "functional_analyst_bridge": "business_analysis",
        "operations_admin_bridge": "operations",
        "engineering_product_development_stretch": "engineering_product",
        "executive_leadership_stretch": "executive_stretch",
        "general_adjacent": "general_adjacent",
    }
    if role_archetype in mapping:
        return mapping[role_archetype]
    return {
        "technical_engineering": "technical",
        "data_ai": "data_ai",
        "sales_growth": "sales_customer",
        "operations_admin": "operations",
        "executive_leadership": "executive_stretch",
        "general_adjacent": "general_adjacent",
    }.get(persona, "general_adjacent")


def _infer_persona(text: str, alignment_context: dict) -> str:
    fit_risk = alignment_context.get("fitRisk") if isinstance(alignment_context.get("fitRisk"), dict) else {}
    unsupported_scope = " ".join(str(x) for x in (fit_risk.get("unsupportedSeniorityTerms") or []))
    leadership_text = f"{text} {normalize_term(unsupported_scope)}"

    executive = {
        "vice president",
        "vp",
        "executive",
        "senior executive",
        "strategic leadership",
        "people management",
        "organizational capacity",
        "external representation",
        "cross functional oversight",
    }
    sales = {
        "sales",
        "outreach",
        "growth",
        "account manager",
        "account management",
        "client relations",
        "discovery calls",
        "go to market",
        "marketing",
        "customer service",
        "phone",
        "pipeline development",
    }
    operations_core = {
        "operations",
        "coordinator",
        "scheduling",
        "resource",
        "process improvement",
        "operational excellence",
        "administrative",
    }
    operations_support = {"compliance", "workflow optimization", "metrics reporting", "reporting", "coordination"}
    data_ai = {
        "data engineer",
        "data engineering",
        "data pipelines",
        "etl",
        "analytics",
        "sql",
        "python",
        "machine learning",
        "ml",
        "artificial intelligence",
        "ai",
        "llm",
        "openai",
        "prompt engineering",
        "rag",
        "model",
        "data modeling",
    }
    technical = {
        "software engineer",
        "developer",
        "full stack",
        "backend",
        "frontend",
        "react",
        "django",
        "fastapi",
        "api",
        "system design",
        "production",
        "typescript",
        "javascript",
    }

    if _has_any(leadership_text, executive):
        return "executive_leadership"
    if _has_any(text, sales):
        return "sales_growth"
    data_hits = _match_count(text, data_ai)
    technical_hits = _match_count(text, technical)
    operations_hits = _match_count(text, operations_core)
    operations_support_hits = _match_count(text, operations_support)
    if data_hits >= 2:
        return "data_ai"
    if technical_hits >= 2:
        return "technical_engineering"
    if operations_hits >= 1 or operations_support_hits >= 3:
        return "operations_admin"
    if data_hits >= 1:
        return "data_ai"
    if technical_hits >= 1:
        return "technical_engineering"
    return "general_adjacent"


def _length_mode(payload: dict) -> str:
    prefs = payload.get("style_preferences") if isinstance(payload, dict) else {}
    if not isinstance(prefs, dict):
        return "standard"
    target = str(prefs.get("length_target") or "").strip().lower().replace("-", "_")
    if target in {"one_page", "detailed"}:
        return target
    return "standard"


def _base_budget(length_mode: str, persona: str) -> dict[str, Any]:
    if length_mode == "one_page":
        projects = 1 if persona == "sales_growth" else 3
        return {"experience": 2, "projects": projects, "skillsGroups": 3, "advisory": True}
    if length_mode == "detailed":
        return {"experience": 3, "projects": 5, "skillsGroups": 5, "advisory": True}
    return {"experience": None, "projects": None, "skillsGroups": None, "advisory": True}


def _persona_defaults(persona: str) -> dict[str, list[str] | str]:
    defaults = {
        "technical_engineering": {
            "readerGoal": "Show shipped technical systems, stack evidence, architecture, and measurable engineering impact.",
            "proofStyle": ["systems and APIs", "stack evidence", "shipped projects", "architecture", "production impact", "metrics"],
            "keepPriorities": ["technical experience", "high-fit engineering projects", "evidenced stack terms", "measurable outcomes"],
            "trimPriorities": ["service rows unless communication matters", "unsupported tools", "off-lane projects"],
            "claimRules": ["Do not claim tools, platforms, or production scope unless the resume proves them."],
        },
        "data_ai": {
            "readerGoal": "Make data, AI, automation, and backend evidence easy to scan without claiming unsupported platforms.",
            "proofStyle": ["Python and SQL", "pipelines", "data modeling", "analytics", "AI/ML workflows", "automation"],
            "keepPriorities": ["data-heavy projects", "pipeline or ETL evidence", "Python/SQL rows", "AI/API evidence when supported"],
            "trimPriorities": ["generic frontend-only rows", "service rows unless communication matters", "unsupported cloud or AI tools"],
            "claimRules": ["Unsupported exact AI, cloud, or data platforms belong in cautions, not resume claims."],
        },
        "sales_growth": {
            "readerGoal": "Prove customer-facing growth readiness through communication, revenue-adjacent impact, and truthful product interest.",
            "proofStyle": ["customer communication", "people-facing work", "revenue-adjacent metrics", "relationship handling", "domain-relevant product interest"],
            "keepPriorities": ["customer-facing roles", "sales or revenue evidence", "interpersonal proof", "one relevant product/software project"],
            "trimPriorities": ["deep technical projects", "unsupported sales ownership", "non-role technical stacks"],
            "claimRules": ["Do not call the candidate a sales professional unless formal sales or outreach is directly evidenced."],
        },
        "operations_admin": {
            "readerGoal": "Bridge proven work into coordination, compliance, process, metrics, and operational follow-through.",
            "proofStyle": ["coordination", "compliance", "metrics and reporting", "workflow optimization", "fast-paced execution"],
            "keepPriorities": ["coordination evidence", "compliance or reporting rows", "metrics work", "process/workflow examples"],
            "trimPriorities": ["deep stack details", "unsupported scheduling/resource ownership", "low-fit projects"],
            "claimRules": ["Use workflow and reporting language only where the resume supports the underlying work."],
        },
        "executive_leadership": {
            "readerGoal": "Keep the draft cautious when senior leadership scope is not directly proven.",
            "proofStyle": ["transferable ownership", "collaboration", "operational metrics", "communication", "scope caution"],
            "keepPriorities": ["real leadership or management evidence", "measurable ownership", "credible transferable experience"],
            "trimPriorities": ["technical implementation detail", "unsupported executive scope", "inflated management claims"],
            "claimRules": ["Do not inflate intern, project, or service work into executive leadership or people-management scope."],
        },
        "general_adjacent": {
            "readerGoal": "Use the strongest supported evidence to create an honest transferable fit story.",
            "proofStyle": ["direct evidence first", "transferable proof", "measurable outcomes", "claim caution"],
            "keepPriorities": ["strongest supported rows", "transferable evidence", "role-adjacent metrics"],
            "trimPriorities": ["unsupported title claims", "off-lane rows", "keyword-only overlap"],
            "claimRules": ["Do not treat weak keyword overlap as direct experience."],
        },
    }
    return defaults.get(persona, defaults["general_adjacent"])


def _archetype_defaults(role_archetype: str) -> dict[str, Any]:
    defaults: dict[str, dict[str, Any]] = {
        "ai_backend_integration": {
            "readerGoal": "Show Python backend, OpenAI/LLM integration, API workflows, and cloud-adjacent deployment without claiming unsupported AI platforms.",
            "proofStyle": ["Python backend services", "OpenAI or LLM integration", "API integrations", "cloud-adjacent deployment", "automation workflows"],
            "keepPriorities": ["OpenAI/API evidence", "Python backend services", "API integration rows", "automation or workflow projects"],
            "trimPriorities": ["service rows", "unrelated frontend-only projects", "unsupported exact AI platforms"],
            "claimRules": ["Do not claim Dialogflow, Google CES, Amazon Bedrock, GCP, Azure, or CI/CD unless directly evidenced."],
            "skillPreserve": ["AWS EC2", "REST API Design", "Automation Systems", "ETL Pipelines", "OpenAI API", "Python", "FastAPI", "Django"],
            "skillReframeTargets": ["AI-Driven Workflows", "API Integrations", "Backend Services", "Prompt/Workflow Optimization"],
            "skillDeprioritize": ["hospitality/service skills", "unrelated design-only skills"],
            "summaryGuardrails": ["Do not write a generic AI expert summary.", "Name only AI/cloud tools the resume proves."],
        },
        "data_dashboard_development": {
            "readerGoal": "Prove Python/SQL data-backed web tools, dashboards, reporting, and usable analytical interfaces without inventing Streamlit.",
            "proofStyle": ["Python and SQL", "dashboards", "data visualization", "database-backed applications", "API integrations", "UI-aware delivery"],
            "keepPriorities": ["dashboard/data UI rows", "Python/SQL evidence", "database-backed projects", "reporting or analytics workflows"],
            "trimPriorities": ["service roles", "security-heavy projects without data UI", "ML expert framing"],
            "claimRules": ["Do not claim Streamlit unless it appears in resume evidence."],
            "skillPreserve": ["Python", "SQL", "PostgreSQL", "MySQL", "REST API Design", "Django", "FastAPI", "Pandas", "React", "JavaScript"],
            "skillReframeTargets": ["Dashboards", "Data Visualization", "Reporting Tools", "Database-Backed Applications"],
            "skillDeprioritize": ["PyTorch", "TensorFlow Lite", "service/customer skills"],
            "summaryGuardrails": ["Do not make this a generic full-stack resume.", "Use ML evidence as analytics support, not AI expertise."],
        },
        "data_ai_analytics_ownership_stretch": {
            "readerGoal": "Frame data, analytics, reporting, dashboards, and AI workflow ownership while staying cautious about lead-level or domain-specific claims.",
            "proofStyle": ["SQL and analytics", "dashboards and reporting", "data repositories", "automation", "AI workflow improvement", "executive-facing insights"],
            "keepPriorities": ["data workflow projects", "dashboard/reporting evidence", "AI/API workflow evidence", "measurable analytics rows"],
            "trimPriorities": ["service roles", "unrelated frontend-only work", "unsupported healthcare or lead ownership"],
            "claimRules": ["Do not claim healthcare data, Claude, Excel, or true lead-level ownership unless directly evidenced."],
            "skillPreserve": ["SQL", "PostgreSQL", "Django", "AWS EC2", "ETL Pipelines", "Data Pipelines", "AI-Driven Workflows", "REST API Design"],
            "skillReframeTargets": ["Analytics Reporting", "Dashboard Workflows", "Data Repositories", "Operational Insights"],
            "skillDeprioritize": ["hospitality/service skills", "visual-design-only skills"],
            "summaryGuardrails": ["Use ownership language cautiously for lead roles.", "Avoid unsupported healthcare or executive authority claims."],
        },
        "full_stack_product_engineering": {
            "readerGoal": "Show end-to-end product engineering with Python/Django or FastAPI backends, React UI, APIs, databases, deployment, and product judgment.",
            "proofStyle": ["full-stack product delivery", "Python/Django backend work", "React UI", "REST APIs", "database-backed apps", "production-minded delivery"],
            "keepPriorities": ["professional engineering experience", "full-stack product projects", "backend/frontend integration", "database and API evidence"],
            "trimPriorities": ["service rows", "ML-only projects when product value is weak", "design-only project details"],
            "claimRules": ["Do not claim TypeScript, on-call, CI/CD, GraphQL, microservices, or production ownership unless directly evidenced."],
            "skillPreserve": ["Python", "Django", "FastAPI", "React", "PostgreSQL", "SQL", "JavaScript", "AWS EC2", "REST API Design", "Node.js", "MongoDB", "MySQL"],
            "skillReframeTargets": ["Full-Stack Product Delivery", "Backend/API Development", "Database-Backed Applications", "Product-Minded Engineering"],
            "skillDeprioritize": ["service skills", "computer vision", "generic data science"],
            "summaryGuardrails": ["Do not make this data/AI-first.", "Avoid frontend-only or AI/ML-first positioning."],
        },
        "functional_analyst_bridge": {
            "readerGoal": "Bridge software-building evidence into requirements, process, documentation, testing, and stakeholder-facing systems analysis without claiming senior BA credentials.",
            "proofStyle": ["requirements translation", "stakeholder communication", "process improvement", "documentation", "testing/UAT", "technical workflows"],
            "keepPriorities": ["stakeholder/process evidence", "user-facing workflow projects", "technical documentation or structured data projects", "communication rows when useful"],
            "trimPriorities": ["deep frontend polish", "ML/framework depth", "unsupported BA certifications or enterprise tooling"],
            "claimRules": ["Do not claim 5-10 years of BA experience, CBAP/PMI, BPM tools, Azure DevOps, or senior analyst ownership unless evidenced."],
            "skillPreserve": ["SQL", "REST APIs"],
            "skillReframeTargets": ["Requirements Gathering", "Technical Documentation", "Process Improvement", "User Stories", "Stakeholder Communication", "Testing/UAT", "Workflow Design"],
            "skillDeprioritize": ["React polish", "ML frameworks", "computer vision", "restaurant/service skills"],
            "summaryGuardrails": ["Do not call the candidate a senior certified business analyst.", "Position as a technical builder with adjacent process experience."],
        },
        "engineering_product_development_stretch": {
            "readerGoal": "Use engineering problem-solving, testing mindset, documentation, and cross-functional collaboration as a cautious bridge into physical product development.",
            "proofStyle": ["engineering problem-solving", "testing/debugging mindset", "documentation", "product iteration", "cross-functional collaboration"],
            "keepPriorities": ["testing or benchmarking evidence", "engineering coursework", "cross-functional technical work", "documentation/process evidence"],
            "trimPriorities": ["software architecture depth", "sales/customer-growth framing", "unsupported mechanical/HVAC claims"],
            "claimRules": ["Do not claim HVAC, CAD, thermodynamics, airflow, manufacturing, or lab testing unless directly evidenced."],
            "skillPreserve": ["Python", "Data Pipelines", "TensorFlow Lite"],
            "skillReframeTargets": ["Engineering Problem Solving", "Testing and Validation", "Technical Documentation", "Product Iteration"],
            "skillDeprioritize": ["sales skills", "deep web stack details", "unsupported mechanical tools"],
            "summaryGuardrails": ["Do not write a full-stack/backend/data-pipeline summary.", "Make the stretch clear and honest."],
        },
        "hospitality_customer_service": {
            "readerGoal": "Show direct hospitality fit through guest communication, phone etiquette, teamwork, pace, professionalism, and service reliability.",
            "proofStyle": ["guest communication", "hospitality service", "phone etiquette", "team coordination", "fast-paced reliability"],
            "keepPriorities": ["host/server experience", "guest-facing communication", "restaurant teamwork", "availability and professionalism evidence"],
            "trimPriorities": ["software projects", "technical frameworks", "product/project explanations"],
            "claimRules": ["Do not treat software projects as proof for a host or hospitality role unless employment continuity requires them."],
            "skillPreserve": ["Customer Service", "Communication", "Teamwork", "Problem Solving", "Reliability", "Hospitality"],
            "skillReframeTargets": ["Guest Communication", "Hospitality Service", "Team Coordination", "Fast-Paced Environments", "Phone Etiquette"],
            "skillDeprioritize": ["Python", "SQL", "React", "APIs", "ML", "data pipelines"],
            "summaryGuardrails": ["Avoid dynamic/proven filler.", "Keep the summary hospitality/service focused."],
        },
        "financial_customer_education": {
            "readerGoal": "Frame customer-facing communication, trust-building, finance interest, coachability, and service reliability for financial education or representative work.",
            "proofStyle": ["customer communication", "trust-building", "finance interest", "coachability", "service reliability"],
            "keepPriorities": ["service/customer-facing roles", "finance-adjacent evidence", "communication rows", "training/learning readiness"],
            "trimPriorities": ["deep technical finance projects", "software engineer positioning", "unsupported representative ownership"],
            "claimRules": ["Do not write the summary as a full-stack engineer applying to finance.", "Do not claim proven representative or advisory experience unless evidenced."],
            "skillPreserve": ["Communication", "Customer Service", "Problem Solving", "Reliability"],
            "skillReframeTargets": ["Relationship Building", "Customer Trust", "Financial Interest", "Product Education", "Coachability"],
            "skillDeprioritize": ["Python", "SQL", "React", "APIs", "ML", "data pipelines"],
            "summaryGuardrails": ["Sound customer-facing and finance-interested, not like a technical finance engineer."],
        },
        "sales_growth_outreach": {
            "readerGoal": "Prove people-facing sales readiness through communication, outreach-adjacent service work, revenue-adjacent impact, and truthful product interest.",
            "proofStyle": ["customer communication", "people-facing work", "revenue-adjacent metrics", "relationship handling", "sales readiness"],
            "keepPriorities": ["customer-facing roles", "sales or revenue evidence", "interpersonal proof", "one relevant product/software project"],
            "trimPriorities": ["deep technical projects", "unsupported sales ownership", "non-role technical stacks"],
            "claimRules": ["Do not call the candidate a sales professional unless formal sales or outreach is directly evidenced."],
            "skillPreserve": ["Customer Service", "Communication", "Teamwork", "Problem Solving", "Reliability"],
            "skillReframeTargets": ["Relationship Building", "Sales Support", "Customer Engagement", "Goal-Oriented Communication", "Outreach Readiness"],
            "skillDeprioritize": ["Python", "SQL", "React", "APIs", "ML", "data pipelines", "security tools"],
            "summaryGuardrails": ["Do not make technical projects sound like sales proof.", "Use coachable/readiness language instead of expert claims."],
        },
        "operations_admin_bridge": {
            "readerGoal": "Bridge proven work into coordination, compliance, process, metrics, and operational follow-through.",
            "proofStyle": ["coordination", "compliance", "metrics and reporting", "workflow optimization", "fast-paced execution"],
            "keepPriorities": ["coordination evidence", "compliance or reporting rows", "metrics work", "process/workflow examples"],
            "trimPriorities": ["deep stack details", "unsupported scheduling/resource ownership", "low-fit projects"],
            "claimRules": ["Use workflow and reporting language only where the resume supports the underlying work."],
            "skillPreserve": ["Communication", "Problem Solving", "Organization"],
            "skillReframeTargets": ["Operations Coordination", "Metrics Reporting", "Process Improvement", "Workflow Optimization", "Compliance Support"],
            "skillDeprioritize": ["ML frameworks", "computer vision", "deep frontend polish"],
            "summaryGuardrails": ["Do not force technical depth when the role is coordination-heavy."],
        },
    }
    return defaults.get(role_archetype, {})


def _unsupported_claim_rules(alignment_context: dict, tailor_context: dict) -> list[str]:
    rules: list[str] = []
    unsupported = _norm_list(alignment_context.get("unsupportedTerms") or tailor_context.get("resumeGaps") or [], limit=5)
    if unsupported:
        rules.append("Do not claim unsupported terms directly: " + ", ".join(unsupported) + ".")
    exact = []
    for item in tailor_context.get("unsupportedExactKeywords") or []:
        if isinstance(item, dict):
            exact.append(item.get("term"))
    exact = _norm_list(exact, limit=4)
    if exact:
        rules.append("Exact tools/platforms stay as review gaps unless resume evidence exists: " + ", ".join(exact) + ".")
    fit_risk = alignment_context.get("fitRisk") if isinstance(alignment_context.get("fitRisk"), dict) else {}
    level = _clean(fit_risk.get("level"), limit=24).lower()
    guidance = _clean(fit_risk.get("claimGuidance"), limit=160)
    if level in {"high", "extreme"} and guidance:
        rules.append(guidance)
    return rules


def _merge_strategy_defaults(persona_defaults: dict[str, Any], archetype_defaults: dict[str, Any]) -> dict[str, Any]:
    out = dict(persona_defaults)
    for key in ("readerGoal",):
        if archetype_defaults.get(key):
            out[key] = archetype_defaults[key]
    for key in (
        "proofStyle",
        "keepPriorities",
        "trimPriorities",
        "claimRules",
        "skillPreserve",
        "skillReframeTargets",
        "skillDeprioritize",
        "summaryGuardrails",
    ):
        out[key] = _norm_list(
            list(archetype_defaults.get(key) or []) + list(persona_defaults.get(key) or []),
            limit=12,
        )
    return out


def _strategy_matches(persona: str, tailor_context: dict) -> dict[str, list[str]]:
    hits = _norm_list(tailor_context.get("resumeHits") or [], limit=8)
    gaps = _norm_list(tailor_context.get("resumeGaps") or [], limit=8)
    return {
        "supportedSignals": hits,
        "gapSignals": gaps,
    }


def build_job_strategy(payload: dict, tailorContext: dict, sectionDetails: dict | None = None) -> dict[str, Any]:
    """Build the compact strategy contract shared by narrative, prompts, reports, and guards.

    This is intentionally lightweight and advisory. It centralizes broad strategy language
    without replacing deterministic row scoring, narrative planning, or post-processing.
    """
    payload = payload if isinstance(payload, dict) else {}
    tailor_context = tailorContext if isinstance(tailorContext, dict) else {}
    alignment_context = (
        tailor_context.get("alignmentContext") if isinstance(tailor_context.get("alignmentContext"), dict) else {}
    )
    signal_text = _joined_signal_text(payload, tailor_context, alignment_context)
    role_archetype = _infer_role_archetype(payload, tailor_context, signal_text, alignment_context)
    persona = _persona_for_archetype(role_archetype, signal_text, alignment_context)
    lane = _lane_for_archetype(role_archetype, persona)
    defaults = _merge_strategy_defaults(_persona_defaults(persona), _archetype_defaults(role_archetype))
    fit_mode = _clean(alignment_context.get("mode"), limit=24).lower() or "unknown"
    length_mode = _length_mode(payload)

    claim_rules = list(defaults["claimRules"]) + _unsupported_claim_rules(alignment_context, tailor_context)
    match_details = _strategy_matches(persona, tailor_context)

    return {
        "lane": lane,
        "persona": persona,
        "roleArchetype": role_archetype,
        "fitMode": fit_mode,
        "lengthMode": length_mode,
        "readerGoal": defaults["readerGoal"],
        "proofStyle": list(defaults["proofStyle"]),
        "keepPriorities": list(defaults["keepPriorities"]),
        "trimPriorities": list(defaults["trimPriorities"]),
        "claimRules": _norm_list(claim_rules, limit=8),
        "skillPreserve": _norm_list(defaults.get("skillPreserve") or [], limit=12),
        "skillReframeTargets": _norm_list(defaults.get("skillReframeTargets") or [], limit=12),
        "skillDeprioritize": _norm_list(defaults.get("skillDeprioritize") or [], limit=12),
        "summaryGuardrails": _norm_list(defaults.get("summaryGuardrails") or [], limit=8),
        "sectionBudget": _base_budget(length_mode, persona),
        "supportedSignals": match_details["supportedSignals"],
        "gapSignals": match_details["gapSignals"],
    }
