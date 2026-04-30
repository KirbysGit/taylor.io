// grabs the user's profile data based on state (e.g. choose, start fresh, no mode)

// --- imports ---

import { useEffect, useRef } from 'react'
import { getMyProfile } from '@/api/services/profile'
import { initializeResumeDataFromBackend, initializeResumeDataWithOptions } from '../utils/resumeDataInitializer'
import { normalizeSectionOrder } from '../utils/resumeDataTransform'
import { defaultSectionLabels } from '../utils/resumePreviewConstants'

// --- hook ---
export function useResumePreviewBootstrap({
	navigate,
	location,
	sectionOrder,
	setUser,
	setResumeData,
	setSectionOrder,
	setSectionLabels,
	chooseFullProfileRef,
}) {

	// we need to know if we've fetched the profile yet.
	const hasFetchedProfileRef = useRef(false)

	// we need to fetch the profile data and set the initial state.
	useEffect(() => {
		// if we've already fetched the profile, return.
		if (hasFetchedProfileRef.current) return

		// set the flag.
		hasFetchedProfileRef.current = true

		// check if we have a token for authentication.
		const token = localStorage.getItem('token')
		
		// if we don't have a token, navigate to the auth page.
		if (!token) {
			navigate('/auth')
			return
		}

		// try to fetch the current user.
		try {
			const fetchCurrentUser = async () => {

				// fetch the current user & response data.
				const response = await getMyProfile()
				const responseData = response.data
				const state = location.state || {}

				// Preserve full profile lists so "Save to profile" can merge edits onto every row, not wipe unselected items.
				if (
					chooseFullProfileRef &&
					state.createMode === 'choose' &&
					(state.selectedEducationIds || state.selectedExperienceIds || state.selectedProjectIds)
				) {
					chooseFullProfileRef.current = structuredClone(responseData)
				}

				// initialize the resume data.
				let initialized
				if (state.createMode === 'choose' && (state.selectedEducationIds || state.selectedExperienceIds || state.selectedProjectIds)) {
					// if we're in choose mode, and we have selected education, experience, or project ids, initialize the resume data with the selected ids.
					initialized = initializeResumeDataWithOptions(responseData, sectionOrder, {
						selectedEducationIds: state.selectedEducationIds,
						selectedExperienceIds: state.selectedExperienceIds,
						selectedProjectIds: state.selectedProjectIds,
					})
				} else if (state.createMode === 'startFresh') {
					// if we're in start fresh mode, initialize the resume data with the start fresh option.
					initialized = initializeResumeDataWithOptions(responseData, sectionOrder, { startFresh: true })
				} else {
					// if we're in no mode, initialize the resume data with the backend data.
					initialized = initializeResumeDataFromBackend(responseData, sectionOrder)
				}

				// set the user.
				setUser(initialized.user)

				// normalize the section order.
				const ord = normalizeSectionOrder(initialized.resumeData.sectionOrder)
				setResumeData({ ...initialized.resumeData, sectionOrder: ord })
				setSectionOrder(ord)

				// set the section labels.
				if (responseData.section_labels) {
					setSectionLabels({ ...defaultSectionLabels, ...responseData.section_labels })
				}
			}

			// fetch the current user.
			fetchCurrentUser()

		// if there's an error, set the user to null.
		} catch {
			setUser(null)
		}


		// you only want to fetch the profile data once based on the page you came from.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [navigate])
}
