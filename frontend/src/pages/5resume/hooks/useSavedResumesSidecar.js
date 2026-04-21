// maanges our saved-resume slots, fetching, saving, loading, & deleting.

// --- imports.
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
	listSavedResumes,
	createSavedResume,
	getSavedResume,
	deleteSavedResume,
} from '@/api/services/profile'
import { buildResumeStateFromResumeData, snapshotResumeBaseline } from '../utils/resumePreviewHelpers'
import { normalizeTemplateSlug } from '../utils/resumePreviewConstants'

// --- hook ---
export function useSavedResumesSidecar({
	user,
	location,
	navigate,
	resumeData,
	template,
	sectionOrder,
	setResumeData,
	setBaselineData,
	setSectionOrder,
	setTemplate,
}) {
	// --- states.
	const [savedResumes, setSavedResumes] = useState({ items: [], max: 3 })	// # of saved resumes.
	const [savedResumesOpen, setSavedResumesOpen] = useState(false)	// whether the saved resumes popover is open.
	const [isSavingResume, setIsSavingResume] = useState(false)	// whether the resume is being saved.
	const [saveResumeName, setSaveResumeName] = useState('') // the name of the resume being saved.

	// --- references.
	const lastSavedResumesUserIdRef = useRef(null)	// to track the last saved resumes user id.

	// --- callbacks.

	// this fetches the saved resumes.
	const fetchSavedResumes = useCallback(async () => {
		try {
			// try to fetch the saved resumes.
			const res = await listSavedResumes()
			const data = res.data || res
			// set the saved resumes.
			setSavedResumes({ items: data.items || [], max: data.max ?? 3 })
		} catch {
			// if we run into an error, set the saved resumes to an empty array.
			setSavedResumes({ items: [], max: 3 })
		}
	}, [])

	// this saves the resume for later.
	const handleSaveForLater = useCallback(async () => {
		// get the name of the resume being saved.
		const name = (saveResumeName || 'Untitled Resume').trim()

		// if the name is empty, return.
		if (!name) return

		// set the saving resume flag to true.
		setIsSavingResume(true)

		// try to create the saved resume.
		try {
			// create the payload for the saved resume.
			const payload = { ...resumeData, sectionOrder: resumeData.sectionOrder ?? sectionOrder }

			// try to create the saved resume.
			await createSavedResume(name, payload, template)

			// show success msg.
			toast.success('Resume Saved! You can access it from Home.')

			// clear the save resume name.
			setSaveResumeName('')

			// fetch the saved resumes.
			fetchSavedResumes()
		} catch (err) {
			// if we run into an error, show a toast error.
			const msg = err?.response?.data?.detail || err?.message || 'Failed to save'
			toast.error(typeof msg === 'string' ? msg : msg[0]?.msg || 'Failed on saving...')
		} finally {
			// set the saving resume flag to false.
			setIsSavingResume(false)
		}
	}, [resumeData, template, sectionOrder, saveResumeName, fetchSavedResumes])

	// this loads the saved resume into the state.
	const loadSavedResumeIntoState = useCallback(
		async (id, { clearNavState = false } = {}) => {
			try {
				// try to get the saved resume.
				const res = await getSavedResume(id)
				const data = res.data || res

				// build the resume state from the resume data.
				const merged = buildResumeStateFromResumeData(data.resume_data || {})
				
				// set the resume data.
				setResumeData((prev) => ({ ...prev, ...merged }))
				setBaselineData(snapshotResumeBaseline(merged))
				setSectionOrder(merged.sectionOrder)

				// set the template.
				if (data.template) setTemplate(normalizeTemplateSlug(data.template))

				// show success msg.
				toast.success(`${data.name} loaded!`)

				// if we need to clear the navigation state, navigate to the preview page.
				if (clearNavState) navigate('/resume/preview', { replace: true })
				else setSavedResumesOpen(false)
			} catch {
				// if we run into an error, show a toast error.
				toast.error(clearNavState ? 'Failed to load saved resume' : 'Failed on loading...')

				// if we need to clear the navigation state, navigate to the preview page.
				if (clearNavState) navigate('/resume/preview', { replace: true })
			}
		},
		[navigate, setResumeData, setBaselineData, setSectionOrder, setTemplate, normalizeTemplateSlug]
	)

	// handler to delete the saved resume.
	const handleDeleteSaved = useCallback(
		async (id, name, e) => {
			// stop the event from bubbling.
			e?.stopPropagation()

			// grab label from resume name or default to "Resume".
			const label = (name && String(name).trim()) || 'Resume'
			try {
				// try to delete the saved resume.
				await deleteSavedResume(id)

				// fetch the saved resumes.
				fetchSavedResumes()

				// show success msg.
				toast.success(`${label} deleted!`)
			} catch {
				// if we run into an error, show a toast error.
				toast.error('Failed on deleting...')
			}
		},
		[fetchSavedResumes]
	)

	// --- side effects ---

	// this fetches the saved resumes when the user is logged in.
	useEffect(() => {
		const userId = user?.id
		if (!userId) return

		// have we already fetched the saved resumes for this user?
		if (lastSavedResumesUserIdRef.current === userId) return

		// if not, update our ref to the new user id & fetch the saved resumes.
		lastSavedResumesUserIdRef.current = userId
		fetchSavedResumes()
	}, [user?.id, fetchSavedResumes])

	// this loads the saved resume into the state when the location state changes.
	useEffect(() => {
		// do we have a load saved id in the location state?
		const loadSavedId = location.state?.loadSavedId
		if (!user || !loadSavedId) return	// if not, return.

		// if so, load the saved resume into the state.
		loadSavedResumeIntoState(loadSavedId, { clearNavState: true })
	}, [user, location.state?.loadSavedId, loadSavedResumeIntoState])

	// return the saved resumes sidecar.
	return {
		savedResumes,
		savedResumesOpen,
		setSavedResumesOpen,
		isSavingResume,
		saveResumeName,
		setSaveResumeName,
		fetchSavedResumes,
		handleSaveForLater,
		loadSavedResumeIntoState,
		handleDeleteSaved,
	}
}
