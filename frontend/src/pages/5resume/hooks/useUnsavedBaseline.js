// tracks the baseline data for the resume, so our "clean" state.
// upon updating the resume data, we can compare the new data to the baseline data to see if there are any changes, which is "dirty" state.

// --- imports ---

import { useEffect, useState } from 'react'
import { hasResumeDataChanged, getResumeChangeDescriptions } from '../utils/resumeDataTransform'
import { snapshotResumeBaseline, createEmptyResumeData } from '../utils/resumePreviewHelpers'

// --- hook ---
export function useUnsavedBaseline(resumeData) {
	
	// first, create empty baseline snapshot of our data.
	const [baselineData, setBaselineData] = useState(() => snapshotResumeBaseline(createEmptyResumeData()))

	// we need to know if we've set the baseline data yet.
	const [hasSetBaseline, setHasSetBaseline] = useState(false)

	// we need to know if we should show the save banner.
	const [showSaveBanner, setShowSaveBanner] = useState(false)

	// we need to know the change descriptions.
	const [changeDescriptions, setChangeDescriptions] = useState([])

	// --- event handlers ---

	// prevents page from being unloaded if there are unsaved changes.
	// brings up the "Reload site? Changes you made may not be saved." dialog.
	useEffect(() => {
		const onBeforeUnload = (e) => {
			if (showSaveBanner) e.preventDefault()
		}
		window.addEventListener('beforeunload', onBeforeUnload)
		return () => window.removeEventListener('beforeunload', onBeforeUnload)
	}, [showSaveBanner])

	// sets the baseline data when the resume data changes.
	useEffect(() => {
		// if we've already set the baseline data, return.
		if (hasSetBaseline) return
		
		// if we haven't set the baseline data yet, and the resume data is empty, return.
		if (!resumeData.header?.first_name) return

		// set the baseline data & flag.
		setBaselineData(snapshotResumeBaseline(resumeData))
		setHasSetBaseline(true)

	}, [resumeData, hasSetBaseline])

	// sets the show save banner and change descriptions when the resume data changes.
	useEffect(() => {
		// if we haven't set the baseline data yet, return.
		if (!hasSetBaseline) return

		// check if the resume data has changed.
		const hasChanges = hasResumeDataChanged(resumeData, baselineData)

		// get the change descriptions. (e.g. "Header changed", "Education changed", etc.)
		const descriptions = hasChanges ? getResumeChangeDescriptions(resumeData, baselineData) : []

		// set the show save banner and change descriptions.
		setShowSaveBanner(hasChanges)
		setChangeDescriptions(descriptions)
	}, [resumeData, baselineData, hasSetBaseline])

	// return the baseline data, set baseline data, has set baseline, show save banner, set show save banner, and change descriptions.
	return { baselineData, setBaselineData, hasSetBaseline, showSaveBanner, setShowSaveBanner, changeDescriptions }
}
