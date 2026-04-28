// this is used for tailoring the resume via our backend ai service if the user has a tailor intent.

// --- imports ---
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { tailorResume } from '@/api/services/ai'
import { mergeTailoredResumePayload } from '../utils/resumePreviewHelpers'
import { normalizeSectionOrder } from '../utils/resumeDataTransform'

// --- hook ---

export function useTailorJob({
	tailorIntent,
	hasSetBaseline,
	resumeData,
	sectionLabels,
	template,
	setResumeData,
	setSectionOrder,
}) {

	// state for the ai tailor result.
	const [aiTailorResult, setAiTailorResult] = useState(null)

	// state for the ai tailor phase.
	const [aiTailorPhase, setAiTailorPhase] = useState('idle')

	// editor snapshot taken right before the tailored patch is applied (for original vs tailored preview).
	const [preTailorSnapshot, setPreTailorSnapshot] = useState(null)

	// reference to the tailor run generation — only that run may merge results (avoids Strict Mode / effect cleanup applying a stale response).
	const tailorGenerationRef = useRef(0)

	// references for the latest editor snapshot; keeps the tailor request off the resumeData dependency list so finishing the request does not cancel and strand the phase.
	const resumeDataRef = useRef(resumeData)
	const sectionLabelsRef = useRef(sectionLabels)
	const templateRef = useRef(template)
	resumeDataRef.current = resumeData
	sectionLabelsRef.current = sectionLabels
	templateRef.current = template

	// we need to know if we've set the baseline.
	useEffect(() => {
		// if we don't have tailor intent or haven't set the baseline, return.
		if (!tailorIntent || !hasSetBaseline) return

		// bump generation so any in-flight completion from a previous mount or effect run is ignored.
		const gen = ++tailorGenerationRef.current

		// set the is cancelled flag.
		let isCancelled = false

		// create the request resume data.
		const requestResumeData = { ...resumeDataRef.current, sectionLabels: sectionLabelsRef.current }

		// create the request template.
		const requestTemplate = templateRef.current || 'classic'

		// create the request tailor function.
		const requestTailor = async () => {
			try {
				setAiTailorPhase('requesting')
				setPreTailorSnapshot(null)

				// try to tailor the resume.
				const result = await tailorResume({
					job_description: tailorIntent.jobDescription,
					resume_data: requestResumeData,
					template_name: requestTemplate,
					target_role: tailorIntent.jobTitle,
					company: tailorIntent.company,
					style_preferences: {
						focus: tailorIntent.focus,
						tone: tailorIntent.tone,
					},
					strict_truth: Boolean(tailorIntent.strictTruth),
				})

				// drop late completions (unmounted, newer effect run, or cleanup).
				if (isCancelled || gen !== tailorGenerationRef.current) return

				// set the ai tailor result.
				const response = result?.data || result || {}

				setAiTailorResult(response)

				// set the resume data.
				const patch = response.updatedResumeData

				// capture pre-merge editor state for original vs tailored preview (structuredClone keeps nested arrays).
				const snap = {
					resumeData:
						typeof structuredClone === 'function'
							? structuredClone(resumeDataRef.current)
							: JSON.parse(JSON.stringify(resumeDataRef.current)),
					sectionLabels:
						typeof structuredClone === 'function'
							? structuredClone(sectionLabelsRef.current)
							: JSON.parse(JSON.stringify(sectionLabelsRef.current)),
				}
				setPreTailorSnapshot(snap)

				// if the patch is not null and is an object, merge tailored sections and optional section order.
				if (patch && typeof patch === 'object') {
					setResumeData((prev) => mergeTailoredResumePayload(prev, patch))
					if (patch.sectionOrder != null) {
						setSectionOrder(normalizeSectionOrder(patch.sectionOrder))
					}
				}

				// set the ai tailor phase to reviewing.
				setAiTailorPhase('reviewing')

				// show a success toast.
				toast.success('Tailored draft loaded into the editor.')
			} catch (error) {
				if (isCancelled || gen !== tailorGenerationRef.current) return
				console.error('Tailor preview request failed:', error)
				toast.error('Could not generate tailored resume yet.')
				setAiTailorPhase('error')
			}
		}

		// try to tailor the resume.
		requestTailor()

		// return a cleanup function.
		return () => {
			// set the is cancelled flag.
			isCancelled = true
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- one tailor run when intent + baseline are ready; snapshot comes from refs above, not from listing resumeData here (that re-entry cancelled the merge).
	}, [tailorIntent, hasSetBaseline])

	// return the ai tailor result and phase.
	return { aiTailorResult, aiTailorPhase, preTailorSnapshot }
}
