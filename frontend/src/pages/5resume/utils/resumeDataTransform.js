// utils / resumeDataTransform.js

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
			// apply visibility filters - set to empty string if hidden.
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

// check if resume data has changed compared to baseline.
// ignores visibility field in comparison (visibility doesn't count as a change).
export function hasResumeDataChanged(currentData, baselineData) {
	if (!baselineData.header || !baselineData.education) return false
	if (!currentData.header || !currentData.education) return false

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

    console.log("currentHeaderStr: ", currentHeaderStr)
    console.log("baselineHeaderStr: ", baselineHeaderStr)
	return currentHeaderStr !== baselineHeaderStr || currentEduStr !== baselineEduStr
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
