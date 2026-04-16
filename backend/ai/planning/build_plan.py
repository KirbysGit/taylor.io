import json

from ..shared.text_utils import normalize_term

# --- buckets for our resume sections. --- #
def build_relevant_resume_sections(resumeData):

    sections = {
        "experience": [],
        "projects": [],
        "skills": [],
        "education": [],
    }

    if not isinstance(resumeData, dict):
        return sections

    buckets = {
        "experience": ['title', 'description', 'skills'],
        "projects": ['title', 'description', 'tech_stack'],
        "skills": ['name', 'category'],
        "education": ['degree', 'discipline', 'minor', 'subsections'],
    }

    for section, fields in buckets.items():
        rows = resumeData.get(section, [])

        if not isinstance(rows, list):
            continue

        for idx, row in enumerate(rows):
            if not isinstance(row, dict):
                continue

            rowId = row.get("id", idx)

            cleanedFields = {}

            for field in fields:
                value = row.get(field, "")

                if isinstance(value, dict):
                    for subkey, subvalue in value.items():
                        cleaned = normalize_term(subvalue)
                        if cleaned:
                            cleanedFields[f"{field} | {normalize_term(subkey)}"] = cleaned
                elif isinstance(value, list):
                    joined = ", ".join(str(x) for x in value if str(x).strip())
                    cleaned = normalize_term(joined)
                    if cleaned:
                        cleanedFields[field] = cleaned
                else:
                    cleaned = normalize_term(value)
                    if cleaned:
                        cleanedFields[field] = cleaned
                    
            if not cleanedFields:
                continue

            searchText = " | ".join(cleanedFields.values())

            sections[section].append({
                "id": rowId,
                "searchText": searchText,
                "cleanedFields": cleanedFields,
            })

    return sections

# --- determine hits for resume sections. --- #
def score_resume_sections(resumeSections, resumeHits):

    # initialize our section scores.
    sectionScores = {
        "experience": {
            "hits": 0,
            "rows": []
        },
        "projects": {
            "hits": 0,
            "rows": []
        },
        "skills": {
            "hits": 0,
            "rows": []
        },
        "education": {
            "hits": 0,
            "rows": []
        }
    }

    # if the resume sections are not a dictionary, return the section scores.
    if not isinstance(resumeSections, dict):
        return sectionScores

    # iterate over the resume sections.
    for section, rows in resumeSections.items():

        # iterate over the rows in the section.
        for row in rows:

            # if the row is not a dictionary, continue.
            if not isinstance(row, dict):
                continue
            
            # grab the row id & search text.
            rowId = row.get("id", -1)
            searchText = row.get("searchText", "")

            # initialize our matched terms.
            matchedTerms = set()

            # iterate over resume hits.
            for hit in resumeHits:

                # checking if the hit is in the search text.
                if hit in searchText:

                    # if it is, add it to our matched terms.
                    matchedTerms.add(hit)

            # calculate the number of hits for the row.
            rowHits = len(matchedTerms)

            # if the row has no hits, continue.
            if rowHits <= 0:
                continue

            # increment the hits for the section.
            sectionScores[section]["hits"] += rowHits
            
            # append the row to the section rows.
            sectionScores[section]["rows"].append({
                "id": rowId,
                "hits": rowHits,
                "matchedTerms": list(matchedTerms),
                "searchText": searchText,
                "cleanedFields": row.get("cleanedFields", {}),
            })

    # sort the section rows by # of hits.
    sectionScores[section]["rows"].sort(key=lambda row: (-row["hits"], row["id"]))

    return sectionScores

def build_section_priorities(sectionScores, resumeSections):
    priorities = {
        "projectsPriorityIds": [],
        "educationPriorityIds": [],
        "experiencePriorityIds": [],
        "skillsCategoriesToEmphasize": [],
    }

    if not isinstance(sectionScores, dict):
        return priorities

    for row in sectionScores.get("experience", {}).get("rows", []):
        priorities["experiencePriorityIds"].append(row["id"])

    for row in sectionScores.get("projects", {}).get("rows", []):
        priorities["projectsPriorityIds"].append(row["id"])

    for row in sectionScores.get("education", {}).get("rows", []):
        priorities["educationPriorityIds"].append(row["id"])

    skillCategoryHits = {}

    skillRows = {row.get("id"): row for row in resumeSections.get("skills", [])}

    print(skillRows)

    for scoredRow in sectionScores.get("skills", {}).get("rows", []):
        rowId = scoredRow.get("id", -1)
        rawRow = skillRows.get(rowId, {})
        category = rawRow.get("category", "")

        if not category:
            continue

        skillCategoryHits[category] = skillCategoryHits.get(category, 0) + scoredRow.get("hits", 0)

    priorities["skillCategoriesToEmphasize"] = sorted(skillCategoryHits.items(), key=lambda x: (-x[1], x[0]))

    return priorities

# --- builds the tailor plan. --- #
# input -> job description (str), tailor context (dict)
# output -> tailor plan (dict)
def build_tailor_plan(resumeData, tailorContext): 

    # initialize our data from our tailor context.
    keywords = tailorContext["keywords"]
    resumeHits = tailorContext["resumeHits"]
    resumeGaps = tailorContext["resumeGaps"]
    targetRole = tailorContext["targetRole"]
    activeDomains = tailorContext["activeDomains"]


    resumeSections = build_relevant_resume_sections(resumeData)

    sectionScores = score_resume_sections(resumeSections=resumeSections, resumeHits=resumeHits)

    sectionPriorities = build_section_priorities(sectionScores, resumeSections)
    
    # plan our edit.

    # from this we basically want to tell the ai. 

    # what the user has.

    # what points in our resume support that, so like what our resume_hits tells us we should strengthen and focus on.

    # what points in our resume are gaps, so like what our resume_gaps tells us we should fill in, if the user doesn't have it listed.

    # we should do this through focusing our sections (education, experience, projects, skills) based on the number of hits per section.

    # determine how we want to order based on the number of hits per section.

    # coming back 04 / 16 / 2026 @ 2:20 am

    # we're in the process of setting up section priorities.

    # this will tell us how we should prioritize our sections, obviously there will be some discernment, 
    # but we want a general like maybe we focus projects, maybe we focus experience, maybe we focus education, or maybe we rearrange skills.

    # the idea is that per section from what we have the ai can :

    # - rewrite the sections important data included in our buckets, like the description for projects or experience, or the relevant courses for education.
    # - rearrange our section ordering based on the number of hits per section.

    return