

// --- imports ---

import { useEffect, useRef } from 'react'
import { listTemplates } from '@/api/services/templates'
import { normalizeTemplateSlug } from '../utils/resumePreviewConstants'

// --- hook ---
export function useTemplatesFlow({
	location,
	navigate,
	isLoadingTemplates,
	availableTemplates,
	setAvailableTemplates,
	setTemplateStyling,
	setIsLoadingTemplates,
	setTemplate,
}) {

	// we need to know if we've fetched the templates yet.
	const hasFetchedTemplatesRef = useRef(false)

	// we need to fetch the templates and set the initial state.
	useEffect(() => {
		// if we've already fetched the templates, return.
		if (hasFetchedTemplatesRef.current) return

		// set the flag.
		hasFetchedTemplatesRef.current = true
		setIsLoadingTemplates(true)

		// try to fetch the templates.
		const fetchTemplates = async () => {
			const response = await listTemplates()
			const responseData = response.data

			// from api response, set the available templates & template styling.
			setAvailableTemplates(responseData.templates)
			setTemplateStyling(responseData.templateStyling || {})
			setIsLoadingTemplates(false)
		}

		fetchTemplates()
	}, [setAvailableTemplates, setIsLoadingTemplates, setTemplateStyling])

	// we need to know if we've selected a template.
	useEffect(() => {
		// if we haven't selected a template, return.
		const pick = location.state?.selectTemplate

		// if we haven't selected a template, or the templates are still loading, or there are no templates, return.
		if (pick == null || pick === '' || isLoadingTemplates || availableTemplates.length === 0) return

		// normalize the template slug.
		const slug = normalizeTemplateSlug(pick)

		// if the template is available, set the template.
		if (availableTemplates.includes(slug)) {
			setTemplate(slug)
		}

		// navigate to the preview page.
		const next = { ...(location.state || {}) }

		// delete the select template state.
		delete next.selectTemplate

		// check if there is any state left to pass to the preview page.
		const hasState = Object.keys(next).length > 0

		// navigate to the preview page with the state if there is any state left, otherwise navigate to the preview page without the state.
		navigate('/resume/preview', { replace: true, state: hasState ? next : undefined })
	}, [location.state?.selectTemplate, isLoadingTemplates, availableTemplates, navigate, normalizeTemplateSlug, setTemplate])
}
