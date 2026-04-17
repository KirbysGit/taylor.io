import json

import re
from collections import defaultdict
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
        "experience": {"hits": 0, "rows": []},
        "projects": {"hits": 0, "rows": []},
        "skills": {"hits": 0, "rows": []},
        "education": {"hits": 0, "rows": []}
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
                
                pattern = r"(?<![a-z0-9])" + re.escape(hit) + r"(?![a-z0-9])"

                # checking if the hit is in the search text.
                if re.search(pattern, searchText):
                    
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
                "cleanedFields": row.get("cleanedFields", {}),
            })

        # sort the section rows by # of hits.
        sectionScores[section]["rows"].sort(key=lambda row: (-row["hits"], row["id"]))

    return sectionScores

def list_scored_sections(sectionScores):

    # create initial buckets.
    buckets = {
        "experience": 0,
        "projects": 0,
        "skills": 0,
        "education": 0,
    }

    # make sure scores are dict.
    if not isinstance(sectionScores, dict):
        return buckets
    
    # iterate over the section scores, add the hits to the buckets.
    for section, data in sectionScores.items():
        # if the section is not in the buckets, continue.
        if section not in buckets:
            continue

        # add the hits to the buckets.
        buckets[section] = data.get("hits", 0)

    # return the buckets.
    return sorted(buckets.items(), key=lambda x: (-x[1], x[0]))

def list_rows_per_section(sectionScores, resumeSections):
    # initialize our buckets.
    buckets = {
        "experience": [],
        "projects": [],
        "skills": defaultdict(list),
        "education": [],
    }

    # create a dictionary of skill rows by id.
    skillRows = {row.get("id"): row for row in resumeSections.get("skills", []) if isinstance(row, dict)}

    # iterate over the section scores.
    for section, data in sectionScores.items():
        # get the rows for the section.
        rows = data.get("rows", [])

        # if the section is skills, group by category.
        if section == "skills":
            # initialize our category hits.
            categoryHits = defaultdict(lambda: {"hits": 0, "rows": []})

            # iterate over the rows.
            for row in rows:
                # get the row id and cleaned fields.
                rowId = row.get("id", -1)
                rawRow = row.get("cleanedFields", {})
                category = rawRow.get("category", "")

                # if the category is not in the buckets, continue.
                if not category:
                    continue

                # add the hits to the category hits.
                categoryHits[category]["hits"] += row.get("hits", 0)
                categoryHits[category]["rows"].append({
                    "id": rowId,
                    "hits": row.get("hits", 0),
                    "matchedTerms": row.get("matchedTerms", []),
                })

            # sort the category hits by hits and id.
            for category, data in categoryHits.items():
                data["rows"].sort(key=lambda x: (-x["hits"], x["id"]))

            # add the category hits to the buckets.
            buckets["skills"] = dict(
                sorted(categoryHits.items(), key=lambda x: (-x[1]["hits"], x[0]))
            )
            
            continue

        # iterate over the rows.
        for row in data.get("rows", []):
            # get the row id and hits.
            buckets[section].append({
                "id": row.get("id", -1),
                "hits": row.get("hits", 0),
                "matchedTerms": row.get("matchedTerms", []),
            })

        # sort the rows by hits and id.
        buckets[section].sort(key=lambda x: (-x["hits"], x["id"]))

    return buckets

def list_gaps_per_section(resumeGaps, sectionScores):

    buckets = {
        "experience": [],
        "projects": [],
        "skills": [],
        "education": [],
    }

    if not isinstance(resumeGaps, list):
        return buckets

    if not isinstance(sectionScores, dict):
        return buckets

    for section, data in sectionScores.items():
        if section not in buckets:
            continue

        matched = set()

        for row in data.get("rows", []):
            if not isinstance(row, dict):
                continue

            for term in row.get("matchedTerms", []):
                matched.add(term)
        buckets[section] = [gap for gap in resumeGaps if gap not in matched]

    return buckets

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

    # build relevant resume sections into strings for us to parse.
    resumeSections = build_relevant_resume_sections(resumeData)

    # score each section based on the number of hits per section.
    sectionScores = score_resume_sections(resumeSections=resumeSections, resumeHits=resumeHits)

    # rank the sections by the number of hits.
    sectionScoresRanked = list_scored_sections(sectionScores)

    # rank the rows per section by the number of hits.
    rowsPerSectionRanked = list_rows_per_section(sectionScores, resumeSections)

    gapsPerSection = list_gaps_per_section(resumeGaps, sectionScores)

    return {
        "sectionScoresRanked": sectionScoresRanked,
        "rowsPerSectionRanked": rowsPerSectionRanked,
        "gapsPerSection": gapsPerSection,
    }

    
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


    # basically telling the ai
    # - what the user has that is most relevant to the jd throughout our sections.
    # - what the user is missing.

    # so that spectrum we need to designate,
    # - we have stronger keywords that are more relevant, how do we prioritze our data to best support those keywords
    # - also rearranging our data to also support the keywords we are missing. 

    # also setting up our resume based prioritization.

    return