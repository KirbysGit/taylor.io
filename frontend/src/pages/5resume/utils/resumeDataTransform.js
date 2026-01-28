// utils / resumeDataTransform.js

// applyVisibilityFilters -> handle visibility filters for header (as of right now).
// compareResumeData -> compare resume data and return which sections changed.
// hasResumeDataChanged -> compareResumeData boolean result.
// getResumeChangeDescriptions -> get simple descriptions of what changed.
// downloadBlob -> download a blob as a file.

// ----- functions -----

// apply visibility filters to resume data for preview/pdf generation.
// filters out hidden header fields based on visibility settings.
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
		},
	}

	// remove visibility object (not needed for backend).
	delete filteredData.header.visibility

	return filteredData
}

// compare resume data and return which sections changed (helper function).
// ignores visibility field in comparison (visibility doesn't count as a change).
function compareResumeData(currentData, baselineData) {
	if (!baselineData.header || !baselineData.education || !baselineData.experience || !baselineData.projects) {
		return { headerChanged: false, educationChanged: false, experienceChanged: false, projectsChanged: false }
	}
	if (!currentData.header || !currentData.education || !currentData.experience || !currentData.projects) {
		return { headerChanged: false, educationChanged: false, experienceChanged: false, projectsChanged: false }
	}

	// create copies without visibility field for comparison.
	const currentHeaderForCompare = { ...currentData.header }
	const baselineHeaderForCompare = { ...baselineData.header }
	delete currentHeaderForCompare.visibility
	delete baselineHeaderForCompare.visibility

	// compare serialized versions.
	const currentHeaderStr = JSON.stringify(currentHeaderForCompare)
	const baselineHeaderStr = JSON.stringify(baselineHeaderForCompare)
	const currentEduStr = JSON.stringify(currentData.education)
	const baselineEduStr = JSON.stringify(baselineData.education)
	const currentExpStr = JSON.stringify(currentData.experience)
	const baselineExpStr = JSON.stringify(baselineData.experience)
	const currentProjStr = JSON.stringify(currentData.projects)
	const baselineProjStr = JSON.stringify(baselineData.projects)



	return {
		headerChanged: currentHeaderStr !== baselineHeaderStr,
		educationChanged: currentEduStr !== baselineEduStr,
		experienceChanged: currentExpStr !== baselineExpStr,
		projectsChanged: currentProjStr !== baselineProjStr,
	}
}

// check if resume data has changed compared to baseline.
export function hasResumeDataChanged(currentData, baselineData) {
	const { headerChanged, educationChanged, experienceChanged, projectsChanged } = compareResumeData(currentData, baselineData)
	return headerChanged || educationChanged || experienceChanged || projectsChanged
}

// get simple descriptions of what changed (reuses comparison logic).
export function getResumeChangeDescriptions(currentData, baselineData) {
	const { headerChanged, educationChanged, experienceChanged, projectsChanged } = compareResumeData(currentData, baselineData)
	const changes = []

	if (headerChanged) {
		changes.push('Contact information updated')
	}
	if (educationChanged) {
		changes.push('Education section updated')
	}
	if (experienceChanged) {
		changes.push('Experience section updated')
	}
	if (projectsChanged) {
		changes.push('Projects section updated')
	}

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
