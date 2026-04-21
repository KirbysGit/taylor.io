// Shared helpers for ResumePreview: panel bounds, saved-resume / tailor merge.

import { normalizeSectionOrder } from './resumeDataTransform'

export const defaultSectionVisibility = {
	summary: false,
	education: true,
	experience: true,
	projects: true,
	skills: true,
}

// --- normalized empty resume data.
export function createEmptyResumeData() {
	return {
		header: {
			first_name: '',
			last_name: '',
			email: '',
			phone: '',
			location: '',
			github: '',
			linkedin: '',
			portfolio: '',
			tagline: '',
		},
		education: [],
		experience: [],
		projects: [],
		skills: [],
		hiddenSkills: [],
		summary: { summary: '' },
		sectionVisibility: { ...defaultSectionVisibility },
		sectionOrder: normalizeSectionOrder(null),
	}
}

/** Min/max left panel width from viewport (used for drag, double-click, window resize). */
export function getPanelWidthBounds(viewportWidth) {
	if (viewportWidth < 768) {
		return { min: 320, max: Math.floor(viewportWidth * 0.6) }
	}
	if (viewportWidth < 1024) {
		return { min: 400, max: Math.floor(viewportWidth * 0.55) }
	}
	if (viewportWidth < 1440) {
		return { min: 500, max: 800 }
	}
	if (viewportWidth < 1920) {
		return { min: 600, max: 1000 }
	}
	return { min: 700, max: 1200 }
}

export function snapshotResumeBaseline(data) {
	return JSON.parse(
		JSON.stringify({
			header: data.header,
			education: data.education || [],
			experience: data.experience || [],
			projects: data.projects || [],
			skills: data.skills || [],
			hiddenSkills: data.hiddenSkills || [],
			summary: data.summary || { summary: '' },
		})
	)
}

/** Merge raw saved/API resume_data into the shape used by preview state. */
export function buildResumeStateFromResumeData(rd) {
	const ord = normalizeSectionOrder(rd?.sectionOrder)
	return {
		header: rd.header,
		education: rd.education ?? [],
		experience: rd.experience ?? [],
		projects: rd.projects ?? [],
		skills: rd.skills ?? [],
		hiddenSkills: rd.hiddenSkills ?? [],
		summary: rd.summary ?? { summary: '' },
		sectionVisibility: rd.sectionVisibility,
		sectionOrder: ord,
		skillsCategoryOrder: rd.skillsCategoryOrder,
	}
}

/** Drop-in merge for tailor API `updatedResumeData` onto current editor state. */
export function mergeTailoredResumePayload(prev, updated) {
	if (!updated || typeof updated !== 'object') return prev
	return { ...prev, ...buildResumeStateFromResumeData({ ...prev, ...updated }) }
}
