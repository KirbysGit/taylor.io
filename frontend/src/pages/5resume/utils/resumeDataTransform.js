// utils / resumeDataTransform.js

// applyVisibilityFilters -> handle visibility filters for header (as of right now).
// compareResumeData -> compare resume data and return which sections changed.
// hasResumeDataChanged -> compareResumeData boolean result.
// getResumeChangeDescriptions -> get simple descriptions of what changed.
// downloadBlob -> download a blob as a file.

import {
	transformEducationForStep,
	transformExperienceForStep,
	transformProjectForStep,
	transformSkillForStep,
} from '@/pages/info/utils/dataTransform'
import {
	normalizeEducationForBackend,
	normalizeExperienceForBackend,
	normalizeProjectForBackend,
	normalizeSkillForBackend,
} from '@/pages/utils/DataFormatting'

/** Map list entries through step transform + backend normalizer so shape matches what Save sends (ignores harmless UI-only / key-alias drift). */
function canonicalEducationList(arr) {
	if (!Array.isArray(arr)) return []
	return arr.map((edu) => normalizeEducationForBackend(transformEducationForStep(edu)))
}

function canonicalExperienceList(arr) {
	if (!Array.isArray(arr)) return []
	return arr.map((exp) => normalizeExperienceForBackend(transformExperienceForStep(exp)))
}

function canonicalProjectList(arr) {
	if (!Array.isArray(arr)) return []
	return arr.map((proj) => normalizeProjectForBackend(transformProjectForStep(proj)))
}

function canonicalSkillList(arr) {
	if (!Array.isArray(arr)) return []
	return arr.map((skill) => normalizeSkillForBackend(transformSkillForStep(skill)))
}

/** Full section order including locked `header` (first) and `summary` (second). */
const DEFAULT_FULL_SECTION_ORDER = [
	'header',
	'summary',
	'education',
	'experience',
	'projects',
	'skills',
]

/**
 * Lock Professional Summary directly under header; user may only reorder other sections.
 * @param {string[]|null|undefined} order
 * @returns {string[]}
 */
export function normalizeSectionOrder(order) {
	if (!Array.isArray(order) || order.length === 0) {
		return [...DEFAULT_FULL_SECTION_ORDER]
	}
	const allowed = new Set(DEFAULT_FULL_SECTION_ORDER)
	const seen = new Set()
	const tail = []
	for (const k of order) {
		if (k === 'header' || k === 'summary') continue
		if (allowed.has(k) && !seen.has(k)) {
			seen.add(k)
			tail.push(k)
		}
	}
	for (const k of DEFAULT_FULL_SECTION_ORDER) {
		if (k !== 'header' && k !== 'summary' && !seen.has(k)) {
			seen.add(k)
			tail.push(k)
		}
	}
	return ['header', 'summary', ...tail]
}

// ----- functions -----

// apply visibility filters to resume data for preview/pdf generation.
// filters out hidden header fields and sections based on visibility settings.
export function applyVisibilityFilters(resumeData) {
	if (!resumeData || !resumeData.header) {
		return resumeData
	}

	// create a copy of resume data with visibility filters applied.
	const filteredData = {
		...resumeData,
		header: {
			...resumeData.header,
			phone: resumeData.header.visibility?.showPhone ? resumeData.header.phone : '',
			location: resumeData.header.visibility?.showLocation ? resumeData.header.location : '',
			linkedin: resumeData.header.visibility?.showLinkedin ? resumeData.header.linkedin : '',
			github: resumeData.header.visibility?.showGithub ? resumeData.header.github : '',
			portfolio: resumeData.header.visibility?.showPortfolio ? resumeData.header.portfolio : '',
			tagline:
				resumeData.header.visibility?.showTagline !== false
					? resumeData.header.tagline || ''
					: '',
		},
	}

	// remove visibility object (not needed for backend).
	delete filteredData.header.visibility

	// apply section visibility filters - remove sections that are hidden
	const sectionVisibility = resumeData.sectionVisibility || {
		summary: false,
		education: true,
		experience: true,
		projects: true,
		skills: true,
	}

	if (!sectionVisibility.summary) {
		filteredData.summary = null
	}
	if (!sectionVisibility.education) {
		filteredData.education = []
	}
	if (!sectionVisibility.experience) {
		filteredData.experience = []
	}
	if (!sectionVisibility.projects) {
		filteredData.projects = []
	}
	if (!sectionVisibility.skills) {
		filteredData.skills = []
	}

	// preserve sectionOrder for backend (exclude 'header' as it's always first)
	// only include visible sections - reordering hidden sections should not affect preview
	if (resumeData.sectionOrder) {
		filteredData.sectionOrder = resumeData.sectionOrder.filter((key) => {
			if (key === 'header') return false
			// exclude hidden sections so reordering them won't trigger a preview refresh
			if (key === 'summary' && !sectionVisibility.summary) return false
			if (key === 'education' && !sectionVisibility.education) return false
			if (key === 'experience' && !sectionVisibility.experience) return false
			if (key === 'projects' && !sectionVisibility.projects) return false
			if (key === 'skills' && !sectionVisibility.skills) return false
			return true
		})
		// summary always first in document body (under fixed header), matching editor lock
		if (filteredData.sectionOrder.length) {
			const si = filteredData.sectionOrder.indexOf('summary')
			if (si > 0) {
				filteredData.sectionOrder = [
					'summary',
					...filteredData.sectionOrder.filter((k) => k !== 'summary'),
				]
			}
		}
	}

	// remove sectionVisibility object (not needed for backend)
	delete filteredData.sectionVisibility

	return filteredData
}

// compare resume data and return which sections changed (helper function).
// Excludes preview-only layout: header.visibility, header.contactOrder, sectionVisibility,
// sectionOrder, skillsCategoryOrder (use "Save for later" / saved resumes for those).
function compareResumeData(currentData, baselineData) {
	if (!baselineData.header || !baselineData.education || !baselineData.experience || !baselineData.projects) {
		return { headerChanged: false, educationChanged: false, experienceChanged: false, projectsChanged: false, skillsChanged: false, summaryChanged: false }
	}
	if (!currentData.header || !currentData.education || !currentData.experience || !currentData.projects) {
		return { headerChanged: false, educationChanged: false, experienceChanged: false, projectsChanged: false, skillsChanged: false, summaryChanged: false }
	}

	const stripPreviewOnlyHeader = (h) => {
		if (!h) return h
		const { visibility: _v, contactOrder: _c, ...rest } = h
		return rest
	}
	const currentHeaderForCompare = stripPreviewOnlyHeader(currentData.header)
	const baselineHeaderForCompare = stripPreviewOnlyHeader(baselineData.header)

	const currentDataForCompare = { ...currentData }
	const baselineDataForCompare = { ...baselineData }
	delete currentDataForCompare.sectionVisibility
	delete baselineDataForCompare.sectionVisibility
	delete currentDataForCompare.sectionOrder
	delete baselineDataForCompare.sectionOrder
	delete currentDataForCompare.skillsCategoryOrder
	delete baselineDataForCompare.skillsCategoryOrder

	// compare serialized versions.
	const currentHeaderStr = JSON.stringify(currentHeaderForCompare)
	const baselineHeaderStr = JSON.stringify(baselineHeaderForCompare)
	const currentEduStr = JSON.stringify(canonicalEducationList(currentDataForCompare.education))
	const baselineEduStr = JSON.stringify(canonicalEducationList(baselineDataForCompare.education))
	const currentExpStr = JSON.stringify(canonicalExperienceList(currentDataForCompare.experience))
	const baselineExpStr = JSON.stringify(canonicalExperienceList(baselineDataForCompare.experience))
	const currentProjStr = JSON.stringify(canonicalProjectList(currentDataForCompare.projects))
	const baselineProjStr = JSON.stringify(canonicalProjectList(baselineDataForCompare.projects))
	const currentSkillsStr = JSON.stringify({
		skills: canonicalSkillList(currentDataForCompare.skills || []),
		hiddenSkills: canonicalSkillList(currentDataForCompare.hiddenSkills || []),
	})
	const baselineSkillsStr = JSON.stringify({
		skills: canonicalSkillList(baselineDataForCompare.skills || []),
		hiddenSkills: canonicalSkillList(baselineDataForCompare.hiddenSkills || []),
	})
	const currentSummaryStr = JSON.stringify({
		summary: (currentDataForCompare.summary?.summary ?? '').trim(),
	})
	const baselineSummaryStr = JSON.stringify({
		summary: (baselineDataForCompare.summary?.summary ?? '').trim(),
	})

	return {
		headerChanged: currentHeaderStr !== baselineHeaderStr,
		educationChanged: currentEduStr !== baselineEduStr,
		experienceChanged: currentExpStr !== baselineExpStr,
		projectsChanged: currentProjStr !== baselineProjStr,
		skillsChanged: currentSkillsStr !== baselineSkillsStr,
		summaryChanged: currentSummaryStr !== baselineSummaryStr,
	}
}

// check if resume data has changed compared to baseline.
export function hasResumeDataChanged(currentData, baselineData) {
	const { headerChanged, educationChanged, experienceChanged, projectsChanged, skillsChanged, summaryChanged } = compareResumeData(currentData, baselineData)
	return headerChanged || educationChanged || experienceChanged || projectsChanged || skillsChanged || summaryChanged
}

// get simple descriptions of what changed (reuses comparison logic).
export function getResumeChangeDescriptions(currentData, baselineData) {
	const { headerChanged, educationChanged, experienceChanged, projectsChanged, skillsChanged, summaryChanged } = compareResumeData(currentData, baselineData)
	const changes = []

	if (headerChanged) changes.push('Header')
	if (educationChanged) changes.push('Education')
	if (experienceChanged) changes.push('Experience')
	if (projectsChanged) changes.push('Projects')
	if (skillsChanged) changes.push('Skills')
	if (summaryChanged) changes.push('Summary')

	return changes
}

// download a blob as a file.
export function downloadBlob(blob, filename = 'download') {
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = filename

	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}
