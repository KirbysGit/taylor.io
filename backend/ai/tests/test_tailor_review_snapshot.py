import sys
import types


if "openai" not in sys.modules:
    openai_stub = types.ModuleType("openai")
    openai_stub.OpenAI = object
    sys.modules["openai"] = openai_stub


from backend.ai.debugging import build_tailor_review_snapshot


def test_review_snapshot_includes_copy_paste_scorecard_and_issue_hints():
    payload = {
        "target_role": "Sales Outreach Representative",
        "company": "Coverview",
        "job_description": "Run outbound outreach and book discovery calls.",
        "resume_data": {
            "experience": [
                {"id": 7, "company": "Bar Louie", "title": "Server"},
                {"id": 8, "company": "Hawkers", "title": "Host / Expo"},
            ],
            "projects": [{"id": 20, "title": "SentimentTrader"}],
            "skills": [{"id": 60, "name": "AI-Driven Workflows"}],
            "education": [],
        },
        "style_preferences": {},
        "strict_truth": True,
    }
    ext_result = {
        "activeDomains": ["sales"],
        "keywords": [
            {"term": "sales", "score": 9, "signalType": "role_capability"},
            {"term": "platform", "score": 3, "signalType": "generic_fragment"},
        ],
        "rawKeywords": [
            {"term": "sales", "score": 9, "signalType": "role_capability"},
            {"term": "platform", "score": 3, "signalType": "generic_fragment"},
        ],
    }
    tailor_context = {
        "jobStrategy": {
            "lane": "sales_customer",
            "persona": "sales_growth",
            "roleArchetype": "sales_growth_outreach",
            "fitMode": "adjacent",
            "lengthMode": "standard",
            "readerGoal": "Prove customer-facing readiness.",
            "proofStyle": ["customer communication"],
            "keepPriorities": ["customer-facing roles"],
            "trimPriorities": ["deep technical projects"],
            "claimRules": ["Do not claim unsupported outreach ownership."],
            "supportedSignals": ["sales"],
            "gapSignals": ["outreach"],
        },
        "alignmentContext": {
            "mode": "adjacent",
            "unsupportedTerms": ["outreach"],
            "gapSupport": [{"term": "outreach", "status": "unsupported"}],
        },
    }
    section_details = {
        "rowsPerSectionRanked": {
            "experience": [{"id": 8, "score": 9.2, "hits": 1, "matchedTerms": ["sales"]}],
            "projects": [{"id": 20, "score": 3.2, "hits": 1, "matchedTerms": ["platform"]}],
        }
    }
    narrative = {
        "keepExperience": [8],
        "dropExperience": [7],
        "heroProjects": [20],
    }
    final_out = {
        "tailorExplanation": {
            "paragraph": "I focused on customer-facing evidence.",
            "chips": [{"label": "Bridge fit"}],
            "details": [{"title": "What I prioritized", "items": ["Customer communication."]}],
            "evidence": {"jobPriorityTerms": ["sales"]},
        },
        "patchDiff": {
            "experience": [{"id": 7, "removed": True, "before": {"company": "Bar Louie", "title": "Server"}, "after": None}],
            "projects": [{"id": 20, "fieldsChanged": {"description": {"before": "Old", "after": "New"}}}],
        },
        "warnings": ["Rewrite audit: filler phrasing survived in projects id 20 (robust)."],
        "changeReasons": [{"section": "projects", "id": 20, "reason": "project 20 revised"}],
    }

    snapshot = build_tailor_review_snapshot(
        payload=payload,
        ext_result=ext_result,
        tailor_context=tailor_context,
        section_details=section_details,
        narrative_brief=narrative,
        final_out=final_out,
        diff_audit={"quality": {"flags": {"filler_phrase_hits": True}}},
        model="gpt-4o-mini",
    )

    assert snapshot["run"]["targetRole"] == "Sales Outreach Representative"
    assert snapshot["strategy"]["lane"] == "sales_customer"
    assert snapshot["strategy"]["persona"] == "sales_growth"
    assert snapshot["humanReview"]["expected"]["lane"] == "sales_customer"
    assert snapshot["humanReview"]["expected"]["role_archetype"] == "sales_growth_outreach"
    assert snapshot["humanReview"]["scores_0_to_2"]["selection"] is None
    assert snapshot["selection"]["removedRows"]["experience"][0]["label"] == "Bar Louie Server"
    assert snapshot["warningsByCategory"]["rewrite"]
    assert any("selection:" in hint for hint in snapshot["likelyIssueHints"])
