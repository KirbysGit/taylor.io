// this is used for tailoring the resume via our backend ai service if the user has a tailor intent.

// --- imports ---
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { tailorResume } from '@/api/services/ai'

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

	// reference to the last tailor request key.
	const lastTailorRequestKeyRef = useRef(null)

	// we need to know if we've set the baseline.
	useEffect(() => {
		// if we haven't set the baseline, return.
		if (!tailorIntent || !hasSetBaseline) return

		// create a request key.
		const requestKey = JSON.stringify({
			jobTitle: tailorIntent.jobTitle || '',
			company: tailorIntent.company || '',
			jobDescription: tailorIntent.jobDescription || '',
			focus: tailorIntent.focus || 'balanced',
			tone: tailorIntent.tone || 'balanced',
			strictTruth: Boolean(tailorIntent.strictTruth),
		})

		// if the last tailor request key is the same as the current request key, return.
		if (lastTailorRequestKeyRef.current === requestKey) return

		// set the last tailor request key.
		lastTailorRequestKeyRef.current = requestKey

		// set the is cancelled flag.
		let isCancelled = false

		// create the request resume data.
		const requestResumeData = { ...resumeData, sectionLabels }

		// create the request template.
		const requestTemplate = template || 'classic'

		// create the request tailor function.
		const requestTailor = async () => {
			try {
				setAiTailorPhase('requesting')

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

				if (isCancelled) return

				// set the ai tailor result.
				const response = result?.data || result || {}

				setAiTailorResult(response)

				// set the resume data.
				const patch = response.updatedResumeData

				// if the patch is not null and is an object, normalize the section order.
				if (patch && typeof patch === 'object') {
					const orderNorm = patch.sectionOrder ?? null
					setResumeData((prev) => ({ ...prev, ...patch, sectionOrder: orderNorm }))
					setSectionOrder(orderNorm)
				}
				
				// set the ai tailor phase to reviewing.
				setAiTailorPhase('reviewing')

				// show a success toast.
				toast.success('Tailored draft loaded into the editor.')
			} catch (error) {
				if (isCancelled) return
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
	}, [tailorIntent, hasSetBaseline, resumeData, sectionLabels, template, setResumeData, setSectionOrder])

	// return the ai tailor result and phase.
	return { aiTailorResult, aiTailorPhase }
}
