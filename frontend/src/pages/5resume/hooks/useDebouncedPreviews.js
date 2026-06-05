// this is used for the debounced previews of the resume.

// --- imports ---
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { generateResumePreview, generateResumePDF } from '@/api/services/resume'
import { validateResumeData } from '../utils/resumeValidation'

// --- constants ---
const draftPreviewDebounceMs = 450
const exactPdfDebounceMs = 1800

function isAbortError(error) {
	return error?.name === 'AbortError'
}

// --- hook ---
export function useDebouncedPreviews({
	resumeData,
	visibleResumePayload,
	previewInputKey,
	template,
	stylePreferences,
	tailorIntent,
	aiTailorPhase,
	allowExactPdfPreview = true,
}) {
	// state for the preview html.
	const [previewHtml, setPreviewHtml] = useState(null)

	// state for the generating preview flag.
	const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

	// reference to the last preview input key.
	const lastPreviewInputRef = useRef(null)

	// state for the exact pdf blob url.
	const [exactPdfBlobUrl, setExactPdfBlobUrl] = useState(null)
	const [exactPdfBlob, setExactPdfBlob] = useState(null)
	const [exactPdfInputKey, setExactPdfInputKey] = useState(null)

	// state for the exact pdf refreshing flag.
	const [exactPdfRefreshing, setExactPdfRefreshing] = useState(false)

	// --- references.
	const lastExactInputRef = useRef(null)	// to last exact input key.
	const exactPdfRequestIdRef = useRef(0)	// to track the exact pdf request id.
	const exactPdfBlobUrlRef = useRef(null)	// to track the exact pdf blob url.
	const refreshControllerRef = useRef(null)

	// state for the validation issues.
	const [validationIssues, setValidationIssues] = useState([])

	// --- effects ---

	// upon change of the exact pdf blob url, set the exact pdf blob url reference.
	useEffect(() => {
		exactPdfBlobUrlRef.current = exactPdfBlobUrl
	}, [exactPdfBlobUrl])

	// upon unmount, revoke the memory of the exact pdf blob url.
	useEffect(() => {
		return () => {
			refreshControllerRef.current?.abort()
			const u = exactPdfBlobUrlRef.current
			if (u) URL.revokeObjectURL(u)
		}
	}, [])


	// --- SLOWER PDF PREVIEW.
	// if the tailor intent is present and the ai tailor phase is requesting, set the exact pdf refreshing flag.
	useEffect(() => {
		// tailor flow: skip PDF generation until the user asks for the print-accurate step (saves work; HTML is enough for compare).
		if (!allowExactPdfPreview) {
			setExactPdfBlobUrl((prev) => {
				if (prev) URL.revokeObjectURL(prev)
				return null
			})
			setExactPdfBlob(null)
			setExactPdfInputKey(null)
			lastExactInputRef.current = null
			setExactPdfRefreshing(false)
			return
		}

		if (tailorIntent && aiTailorPhase === 'requesting') {
			setExactPdfRefreshing(true)
			return
		}

		// check for issues w/ resume data.
		const issues = validateResumeData(resumeData)

		// if there are issues, set the exact pdf blob url to null and set the exact pdf refreshing flag to false.
		if (issues.length > 0) {
			// revoke the memory of the exact pdf blob url.
			setExactPdfBlobUrl((prev) => {
				if (prev) URL.revokeObjectURL(prev)
				return null
			})
			setExactPdfBlob(null)
			setExactPdfInputKey(null)

			// set the last exact input reference to null.
			lastExactInputRef.current = null

			// set the exact pdf refreshing flag to false.
			setExactPdfRefreshing(false)
			return
		}
		
		// if our previous input and current input are the same, set the exact pdf refreshing flag to false.
		if (lastExactInputRef.current === previewInputKey) {
			setExactPdfRefreshing(false)
			return
		}

		// set the exact pdf refreshing flag to true.
		setExactPdfRefreshing(true)

		// increment the exact pdf request id.
		const reqId = ++exactPdfRequestIdRef.current

		// create a timer to generate the exact pdf.
		const controller = new AbortController()
		const timer = setTimeout(async () => {
			// try to generate the exact pdf.
			try {
				// generate the exact pdf.
				const blob = await generateResumePDF(template, visibleResumePayload, stylePreferences, {
					signal: controller.signal,
				})

				// if the request id is not the current request id, return.
				if (reqId !== exactPdfRequestIdRef.current) return

				// set the exact pdf blob url.
				setExactPdfBlobUrl((prev) => {
					if (prev) URL.revokeObjectURL(prev)
					return URL.createObjectURL(blob)
				})
				setExactPdfBlob(blob)
				setExactPdfInputKey(previewInputKey)

				// set the last exact input reference to the current input key.
				lastExactInputRef.current = previewInputKey
			} catch (error) {
				if (isAbortError(error)) return
				// if we run into an error, show a toast error.
				console.error('Exact PDF preview failed:', error)
				if (reqId === exactPdfRequestIdRef.current) {
					toast.error("Preview failed to load — try refreshing the page.")
				}
			} finally {
				// if the request id is the current request id, set the exact pdf refreshing flag to false.
				if (!controller.signal.aborted && reqId === exactPdfRequestIdRef.current) {
					setExactPdfRefreshing(false)
				}
			}
		}, exactPdfDebounceMs)

		// upon unmount, clear the timer.
		return () => {
			clearTimeout(timer)
			controller.abort()
		}
	}, [
		resumeData,
		previewInputKey,
		visibleResumePayload,
		tailorIntent,
		aiTailorPhase,
		template,
		stylePreferences,
		exactPdfDebounceMs,
		allowExactPdfPreview,
	])

	// --- FAST HTML PREVIEW.
	// if the resume data is changed, validate the resume data and set fast HTML preview.
	useEffect(() => {
		// check for issues w/ resume data.
		const issues = validateResumeData(resumeData)

		// if issues...
		if (issues.length > 0) {
			// set the validation issues and clear our preview.
			setValidationIssues(issues)
			setPreviewHtml(null)
			setIsGeneratingPreview(false)
			setExactPdfBlobUrl((prev) => {
				if (prev) URL.revokeObjectURL(prev)
				return null
			})
			setExactPdfBlob(null)
			setExactPdfInputKey(null)
			lastExactInputRef.current = null
			setExactPdfRefreshing(false)

			// this will prompt the user to fill in missing fields & try again.
			return
		}

		// clear the validation issues.
		setValidationIssues([])

		// if our previous input and current input are the same, set the generating preview flag to false.
		if (lastPreviewInputRef.current === previewInputKey) {
			setIsGeneratingPreview(false)
			return
		}

		// set the generating preview flag to true.
		setIsGeneratingPreview(true)

		// create a timer to generate the preview.
		const controller = new AbortController()
		const timer = setTimeout(async () => {
			// try to generate the preview.
			try {
				const htmlContent = await generateResumePreview(template, visibleResumePayload, stylePreferences, {
					signal: controller.signal,
				})
				setPreviewHtml(htmlContent)
				lastPreviewInputRef.current = previewInputKey
			} catch (error) {
				if (isAbortError(error)) return
				// if we run into an error, show a toast error.
				console.error('Failed to generate preview: ', error)
				toast.error("We're having an issue making the preview... Please try refreshing the page.")
			} finally {
				// if the request id is the current request id, set the generating preview flag to false.
				if (!controller.signal.aborted) {
					setIsGeneratingPreview(false)
				}
			}
		}, draftPreviewDebounceMs)

		return () => {
			clearTimeout(timer)
			controller.abort()
		}
	}, [resumeData, previewInputKey, visibleResumePayload, template, stylePreferences])

	// --- IMMEDIATE HTML PREVIEW REFRESH.
	// this is used to refresh the draft HTML preview manually.
	const refreshDraftNow = useCallback(

		// this is the callback function that is used to refresh the draft HTML preview manually.
		async (overrides = {}) => {
			// get the payload from the overrides or use the current visible resume payload.
			const payload = overrides.visibleResumePayload ?? visibleResumePayload

			// get the key from the overrides or use the current preview input key.
			const key = overrides.previewInputKey ?? JSON.stringify({ template, previewData: payload, stylePreferences })

			// check for issues w/ resume data.
			const issues = validateResumeData(resumeData)

			// if there are issues, set the validation issues and clear our preview.
			if (issues.length > 0) {
				setValidationIssues(issues)
				setPreviewHtml(null)
				return false
			}

			// clear the validation issues.
			setValidationIssues([])

			// set the generating preview flag to true.
			setIsGeneratingPreview(true)
			refreshControllerRef.current?.abort()
			const controller = new AbortController()
			refreshControllerRef.current = controller

			// try to generate the preview.
			try {
				const htmlContent = await generateResumePreview(template, payload, stylePreferences, {
					signal: controller.signal,
				})
				setPreviewHtml(htmlContent)
				lastPreviewInputRef.current = key
				return true
			} catch (error) {
				if (isAbortError(error)) return false
				console.error('Refresh preview failed:', error)
				return false
			} finally {
				if (refreshControllerRef.current === controller) {
					refreshControllerRef.current = null
				}
				if (!controller.signal.aborted) {
					setIsGeneratingPreview(false)
				}
			}
		},
		[resumeData, visibleResumePayload, template, stylePreferences]
	)

	// return the debounced previews.
	return {
		previewHtml,
		setPreviewHtml,
		isGeneratingPreview,
		setIsGeneratingPreview,
		exactPdfBlobUrl,
		exactPdfBlob,
		exactPdfInputKey,
		isExactPdfFresh: exactPdfInputKey === previewInputKey,
		exactPdfRefreshing,
		validationIssues,
		setValidationIssues,
		refreshDraftNow,
	}
}
