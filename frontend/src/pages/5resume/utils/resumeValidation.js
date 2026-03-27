/** Structured validation issues for resume preview (used by UI copy, not raw API errors). */

/** @typedef {'header'|'education'|'experience'|'projects'} ResumeValidationSection */

/**
 * @typedef {Object} ResumeValidationIssue
 * @property {string} id
 * @property {ResumeValidationSection} section
 * @property {string[]} missing - stable field keys per section
 */

const DEFAULT_VISIBILITY = {
	summary: false,
	education: true,
	experience: true,
	projects: true,
	skills: true,
}

/**
 * @param {object} data - resumeData shape used in ResumePreview
 * @returns {ResumeValidationIssue[]}
 */
export function validateResumeData(data) {
	/** @type {ResumeValidationIssue[]} */
	const issues = []
	const sectionVisibility = data.sectionVisibility || DEFAULT_VISIBILITY

	const fullName = `${data.header?.first_name || ''} ${data.header?.last_name || ''}`.trim()
	if (!fullName) {
		issues.push({
			id: 'header-name',
			section: 'header',
			missing: ['name'],
		})
	}

	if (sectionVisibility.education && data.education && data.education.length > 0) {
		data.education.forEach((edu, index) => {
			const missing = []
			if (!edu.school || !String(edu.school).trim()) missing.push('school')
			if (!edu.degree || !String(edu.degree).trim()) missing.push('degree')
			if (!edu.discipline || !String(edu.discipline).trim()) missing.push('discipline')
			if (missing.length) {
				issues.push({
					id: `education-${index}`,
					section: 'education',
					missing,
				})
			}
		})
	}

	if (sectionVisibility.experience && data.experience && data.experience.length > 0) {
		data.experience.forEach((exp, index) => {
			const missing = []
			if (!exp.title || !String(exp.title).trim()) missing.push('title')
			if (!exp.company || !String(exp.company).trim()) missing.push('company')
			if (!exp.description || !String(exp.description).trim()) missing.push('description')
			if (missing.length) {
				issues.push({
					id: `experience-${index}`,
					section: 'experience',
					missing,
				})
			}
		})
	}

	if (sectionVisibility.projects && data.projects && data.projects.length > 0) {
		data.projects.forEach((proj, index) => {
			const missing = []
			if (!proj.title || !String(proj.title).trim()) missing.push('title')
			if (!proj.description || !String(proj.description).trim()) missing.push('description')
			if (missing.length) {
				issues.push({
					id: `projects-${index}`,
					section: 'projects',
					missing,
				})
			}
		})
	}

	return issues
}
