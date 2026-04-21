// this is used for validating the resume data, making sure we have all the required fields present.

// --- constants ---
const DEFAULT_VISIBILITY = {
	summary: false,
	education: true,
	experience: true,
	projects: true,
	skills: true,
}

// --- function ---
export function validateResumeData(data) {
	// state for the issues.
	const issues = []

	// get the section visibility.
	const sectionVisibility = data.sectionVisibility || DEFAULT_VISIBILITY

	// if the full name is not present, add an issue.
	if (sectionVisibility.education && data.education && data.education.length > 0) {
		// per education...
		data.education.forEach((edu, index) => {
			const missing = []

			// if the school is not present, add an issue.
			if (!edu.school || !String(edu.school).trim()) missing.push('school')

			// if the degree is not present, add an issue.
			if (!edu.degree || !String(edu.degree).trim()) missing.push('degree')

			// if the discipline is not present, add an issue.
			if (!edu.discipline || !String(edu.discipline).trim()) missing.push('discipline')

			// if there are missing fields, add an issue.
			if (missing.length) {
				issues.push({
					id: `education-${index}`,
					section: 'education',
					missing,
				})
			}
		})
	}

	// if the experience section is visible and the experience data is present, validate the experience data.
	if (sectionVisibility.experience && data.experience && data.experience.length > 0) {
		// per experience...
		data.experience.forEach((exp, index) => {
			const missing = []

			// if the title is not present, add an issue.
			if (!exp.title || !String(exp.title).trim()) missing.push('title')

			// if the company is not present, add an issue.
			if (!exp.company || !String(exp.company).trim()) missing.push('company')

			// if the description is not present, add an issue.
			if (!exp.description || !String(exp.description).trim()) missing.push('description')
			
			// if there are missing fields, add an issue.
			if (missing.length) {
				issues.push({
					id: `experience-${index}`,
					section: 'experience',
					missing,
				})
			}
		})
	}

	// if the projects section is visible and the projects data is present, validate the projects data.
	if (sectionVisibility.projects && data.projects && data.projects.length > 0) {
		// per project...
		data.projects.forEach((proj, index) => {
			const missing = []

			// if the title is not present, add an issue.
			if (!proj.title || !String(proj.title).trim()) missing.push('title')

			// if the description is not present, add an issue.
			if (!proj.description || !String(proj.description).trim()) missing.push('description')

			// if there are missing fields, add an issue.
			if (missing.length) {
				issues.push({
					id: `projects-${index}`,
					section: 'projects',
					missing,
				})
			}
		})
	}

	// return the issues.
	return issues
}
