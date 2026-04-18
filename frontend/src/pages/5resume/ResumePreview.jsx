// pages/5resume/ResumePreview.jsx — main resume editor + preview; helpers in resumePreviewHelpers.js

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'

// api imports.
import { listTemplates } from '@/api/services/templates'
import { generateResumePreview, generateResumePDF, generateResumeWord } from '@/api/services/resume'
import { getMyProfile, upsertContact, setupEducation, setupExperiences, setupProjects, setupSkills, createSummary, updateSectionLabels, listSavedResumes, createSavedResume, getSavedResume, deleteSavedResume } from '@/api/services/profile'
import { suggestJobTailor } from '@/api/services/ai'

import TopNav from '@/components/TopNav'
import LeftPanel from './components/left/LeftPanel'
import RightPanel from './components/right/RightPanel'

// util imports.
import { 
	normalizeEducationForBackend,
	normalizeExperienceForBackend,
	normalizeProjectForBackend,
	normalizeSkillForBackend
} from '@/pages/utils/DataFormatting'
import { applyVisibilityFilters, hasResumeDataChanged, getResumeChangeDescriptions, downloadBlob, normalizeSectionOrder } from './utils/resumeDataTransform'
import { initializeResumeDataFromBackend, initializeResumeDataWithOptions } from './utils/resumeDataInitializer'
import { validateResumeData } from './utils/resumeValidation'
import {
	getPanelWidthBounds,
	snapshotResumeBaseline,
	buildResumeStateFromResumeData,
	mergeTailoredResumePayload,
	DEFAULT_SECTION_VISIBILITY,
} from './resumePreviewHelpers'

/** Preview iframe scale: 50%–150%, step 25% (no % label in UI) */
const PREVIEW_ZOOM = { min: 50, max: 150, step: 25, default: 100 }

/** Draft HTML: quick feedback. Exact PDF: debounced; matches export. */
const DRAFT_PREVIEW_DEBOUNCE_MS = 450
const EXACT_PDF_DEBOUNCE_MS = 1000

/** Aligns with backend `shared.template_slug.normalize_template_slug` (legacy `default` → `classic`). */
function normalizeTemplateSlug(name) {
	if (name == null || name === '') return 'classic'
	const s = String(name).trim()
	if (s.toLowerCase() === 'default') return 'classic'
	return s
}

/** Defaults for `style` sent with preview/PDF/Word; presets apply when layoutProfile is classic_single_column. */
const DEFAULT_STYLE_PREFERENCES = {
	marginPreset: 'balanced',
	lineSpacingPreset: 'standard',
	typeScalePreset: 'standard',
	fontPairing: 'serif_classic',
	/** 'full' | 'strip_protocol' — contact / rail link labels only; hrefs stay correct (backend). */
	contactUrlDisplay: 'full',
}

const DEFAULT_SECTION_LABELS = {
	summary: 'Professional Summary',
	education: 'Education',
	experience: 'Experience',
	projects: 'Projects',
	skills: 'Skills',
}

// ----------- main component -----------
function ResumePreview() {

    // allows us to navigate to other pages.
	const navigate = useNavigate()
	const location = useLocation()
	const tailorIntent = location.state?.createMode === 'tailor' ? location.state?.tailorIntent : null
	const [aiTailorResult, setAiTailorResult] = useState(null)
	const [aiTailorPhase, setAiTailorPhase] = useState('idle')
	const hasFetchedProfileRef = useRef(false)
	const hasFetchedTemplatesRef = useRef(false)
	const lastSavedResumesUserIdRef = useRef(null)
	const lastTailorRequestKeyRef = useRef(null)

    // ----- states -----

	const [user, setUser] = useState(null)										// user's data.

	// One-time welcome: checks localStorage on first render.
	const [welcomeMessage, setWelcomeMessage] = useState(() => !localStorage.getItem('hasSeenResumeWelcome'))

	// template states.
	const [template, setTemplate] = useState('classic')
	const [availableTemplates, setAvailableTemplates] = useState(['classic'])
	const [templateStyling, setTemplateStyling] = useState({})
	const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)          // loading state for templates.
	const [stylePreferences, setStylePreferences] = useState(() => ({ ...DEFAULT_STYLE_PREFERENCES }))
	
	const DEFAULT_LEFT_PANEL_WIDTH = 700
	const [leftPanelWidth, setLeftPanelWidth] = useState(DEFAULT_LEFT_PANEL_WIDTH)
	const [isResizing, setIsResizing] = useState(false)

	// preview states.
	const [previewHtml, setPreviewHtml] = useState(null)
	const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
	const lastPreviewInputRef = useRef(null) // skip fetch when visible data unchanged
	const [exactPdfBlobUrl, setExactPdfBlobUrl] = useState(null)
	const [exactPdfRefreshing, setExactPdfRefreshing] = useState(false)
	const lastExactInputRef = useRef(null)
	const exactPdfRequestIdRef = useRef(0)
	const exactPdfBlobUrlRef = useRef(null)
	const [previewZoom, setPreviewZoom] = useState(PREVIEW_ZOOM.default)
	const [validationIssues, setValidationIssues] = useState([])

	const handleZoomIn = () => {
		setPreviewZoom((prev) => Math.min(prev + PREVIEW_ZOOM.step, PREVIEW_ZOOM.max))
	}

	const handleZoomOut = () => {
		setPreviewZoom((prev) => Math.max(prev - PREVIEW_ZOOM.step, PREVIEW_ZOOM.min))
	}

	const handleZoomReset = () => setPreviewZoom(PREVIEW_ZOOM.default)

	/** Right-panel download overlay: loading bar + success animation (PDF / Word) */
	const [downloadStatus, setDownloadStatus] = useState(null)

	// save banner state.
	const [showSaveBanner, setShowSaveBanner] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [changeDescriptions, setChangeDescriptions] = useState([])

	// baseline data for comparison (original data from fetch).
	const [baselineData, setBaselineData] = useState({
		header: null,
		education: null,
		experience: null,
		projects: null,
		skills: null,
		hiddenSkills: null,
		summary: null,
	})

	// Baseline snapshot runs once profile data is hydrated (see effect below).
	const [hasSetBaseline, setHasSetBaseline] = useState(false)

	// section ordering state
	const [sectionOrder, setSectionOrder] = useState(() => {
		const savedOrder = localStorage.getItem('resumeSectionOrder')
		return normalizeSectionOrder(savedOrder ? JSON.parse(savedOrder) : null)
	})

	const [sectionLabels, setSectionLabels] = useState(DEFAULT_SECTION_LABELS)

	// resume data state.
	const [resumeData, setResumeData] = useState({
		header: {
			first_name: '',
			last_name: '',
			email: '',
			phone: '',
			location: '',
			github: '',
			linkedin: '',
			portfolio: '',
			tagline: '',
		},
		education: [],
		experience: [],
		projects: [],
		skills: [],
		hiddenSkills: [],
		summary: { summary: '' },
		sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
		sectionOrder: normalizeSectionOrder(sectionOrder),
	})

	// Payload sent to preview/PDF/Word (visibility-filtered + labels).
	const visibleResumePayload = useMemo(
		() => ({
			...applyVisibilityFilters(resumeData),
			sectionLabels,
		}),
		[resumeData, sectionLabels]
	)

	const previewInputKey = useMemo(
		() => JSON.stringify({ template, previewData: visibleResumePayload, stylePreferences }),
		[template, visibleResumePayload, stylePreferences]
	)

	// ----- handlers -----

	const handleMouseDown = (e) => {
		setIsResizing(true);
		e.preventDefault();
	}

	const handleMouseMove = (e) => {
		if (!isResizing) return
		const { min, max } = getPanelWidthBounds(window.innerWidth)
		setLeftPanelWidth(Math.min(Math.max(min, e.clientX), max))
	}

	const handleMouseUp = () => {
		setIsResizing(false);
	}

	const handleDoubleClick = () => {
		const { min, max } = getPanelWidthBounds(window.innerWidth)
		setLeftPanelWidth(Math.min(Math.max(min, DEFAULT_LEFT_PANEL_WIDTH), max))
	}

	const handleRefreshPreview = async () => {
		const issues = validateResumeData(resumeData)
		if (issues.length > 0) {
			setValidationIssues(issues)
			setPreviewHtml(null)
			return
		}

		setValidationIssues([])
		setIsGeneratingPreview(true)
		try {
			const htmlContent = await generateResumePreview(template, visibleResumePayload, stylePreferences)
			setPreviewHtml(htmlContent)
			lastPreviewInputRef.current = previewInputKey
		} catch (error) {
			console.error('Refresh preview failed:', error)
			toast.error('Could not refresh preview.')
		} finally {
			setIsGeneratingPreview(false)
		}
	}

	const handleDownloadDocument = async (type) => {
		const isWord = type === 'word'
		setDownloadStatus({ type: isWord ? 'word' : 'pdf', phase: 'loading' })
		try {
			const blob = isWord
				? await generateResumeWord(template, visibleResumePayload, stylePreferences)
				: await generateResumePDF(template, visibleResumePayload, stylePreferences)
			downloadBlob(blob, isWord ? 'resume.docx' : 'resume.pdf')
			setDownloadStatus({ type: isWord ? 'word' : 'pdf', phase: 'success' })
			window.setTimeout(() => setDownloadStatus(null), 2200)
		} catch (error) {
			console.error('Download failed:', error)
			toast.error(isWord ? 'Could not generate Word document. Try again.' : 'Could not generate PDF. Try again.')
			setDownloadStatus({ type: isWord ? 'word' : 'pdf', phase: 'error' })
			window.setTimeout(() => setDownloadStatus(null), 2400)
		}
	}

	const handleDiscardChanges = () => {
		if (baselineData.header) {
			const resetData = {
				...snapshotResumeBaseline(baselineData),
				sectionVisibility: resumeData.sectionVisibility || DEFAULT_SECTION_VISIBILITY,
				sectionOrder: normalizeSectionOrder(resumeData.sectionOrder),
			}
			setResumeData(resetData)
			setSectionOrder(resetData.sectionOrder)
			localStorage.setItem('resumeSectionOrder', JSON.stringify(resetData.sectionOrder))
		}
		setShowSaveBanner(false)
	}

	// ----- data changers / savers -----

	const handleHeaderChange = useCallback((exportedHeader) => {
		setResumeData(prev => ({ ...prev, header: exportedHeader }))
	}, [])

	const handleEducationChange = useCallback((exportedEducation) => {
		setResumeData(prev => ({ ...prev, education: exportedEducation }))
	}, [])

	const handleExperienceChange = useCallback((exportedExperience) => {
		setResumeData(prev => ({ ...prev, experience: exportedExperience }))
	}, [])

	const handleProjectsChange = useCallback((exportedProjects) => {
		setResumeData(prev => ({ ...prev, projects: exportedProjects }))
	}, [])

	const handleSkillsChange = useCallback((exportedSkills) => {
		setResumeData(prev => ({ ...prev, skills: exportedSkills }))
	}, [])

	const handleHideSkill = useCallback((skillId) => {
		setResumeData((prev) => {
			const skills = prev.skills || []
			const skill = skills.find((s) => String(s.id ?? s) === String(skillId))
			if (!skill) return prev
			const newSkills = skills.filter((s) => String(s.id ?? s) !== String(skillId))
			const newHidden = [...(prev.hiddenSkills || []), { ...skill, id: skill.id ?? skillId }]
			return { ...prev, skills: newSkills, hiddenSkills: newHidden }
		})
	}, [])

	const handleShowSkill = useCallback((skillId, opts) => {
		setResumeData((prev) => {
			const hidden = prev.hiddenSkills || []
			const skill = hidden.find((s) => String(s.id ?? s) === String(skillId))
			if (!skill) return prev
			const newHidden = hidden.filter((s) => String(s.id ?? s) !== String(skillId))
			const shown = { ...skill, id: skill.id ?? skillId }
			if (opts && 'category' in opts) {
				shown.category = opts.category ?? ''
			}
			const newSkills = [...(prev.skills || []), shown]
			return { ...prev, skills: newSkills, hiddenSkills: newHidden }
		})
	}, [])

	const handleSkillsCategoryOrderChange = useCallback((categoryOrder) => {
		setResumeData(prev => ({ ...prev, skillsCategoryOrder: categoryOrder }))
	}, [])

	const handleSummaryChange = useCallback((exportedSummary) => {
		setResumeData((prev) => ({
			...prev,
			summary: exportedSummary,
			sectionVisibility: prev.sectionVisibility || { ...DEFAULT_SECTION_VISIBILITY },
		}))
	}, [])

	// ----- saved resumes (preview snapshots) -----
	const [savedResumes, setSavedResumes] = useState({ items: [], max: 3 })
	const [savedResumesOpen, setSavedResumesOpen] = useState(false)
	const [isSavingResume, setIsSavingResume] = useState(false)
	const [saveResumeName, setSaveResumeName] = useState('')

	const fetchSavedResumes = useCallback(async () => {
		try {
			const res = await listSavedResumes()
			const data = res.data || res
			setSavedResumes({ items: data.items || [], max: data.max ?? 3 })
		} catch {
			setSavedResumes({ items: [], max: 3 })
		}
	}, [])

	const handleSaveForLater = useCallback(async () => {
		const name = (saveResumeName || 'Untitled Resume').trim()
		if (!name) return
		setIsSavingResume(true)
		try {
			const payload = {
				...resumeData,
				header: resumeData.header,
				education: resumeData.education || [],
				experience: resumeData.experience || [],
				projects: resumeData.projects || [],
				skills: resumeData.skills || [],
				hiddenSkills: resumeData.hiddenSkills || [],
				summary: resumeData.summary || { summary: '' },
				sectionVisibility: resumeData.sectionVisibility,
				sectionOrder: resumeData.sectionOrder || sectionOrder,
				skillsCategoryOrder: resumeData.skillsCategoryOrder,
			}
			await createSavedResume(name, payload, template)
			toast.success('Resume saved for later')
			setSaveResumeName('')
			fetchSavedResumes()
		} catch (err) {
			const msg = err?.response?.data?.detail || err?.message || 'Failed to save'
			toast.error(typeof msg === 'string' ? msg : msg[0]?.msg || 'Failed to save')
		} finally {
			setIsSavingResume(false)
		}
	}, [resumeData, template, sectionOrder, saveResumeName, fetchSavedResumes])

	/** Fetch saved snapshot + merge into editor (from popover or Home navigation). */
	const loadSavedResumeIntoState = useCallback(async (id, { clearNavState = false } = {}) => {
		try {
			const res = await getSavedResume(id)
			const data = res.data || res
			const merged = buildResumeStateFromResumeData(data.resume_data || {})
			setResumeData((prev) => ({ ...prev, ...merged }))
			setBaselineData({
				header: merged.header,
				education: merged.education,
				experience: merged.experience,
				projects: merged.projects,
				skills: merged.skills,
				hiddenSkills: merged.hiddenSkills,
				summary: merged.summary,
			})
			setSectionOrder(merged.sectionOrder)
			localStorage.setItem('resumeSectionOrder', JSON.stringify(merged.sectionOrder))
			if (data.template) setTemplate(normalizeTemplateSlug(data.template))
			toast.success('Resume loaded')
			if (clearNavState) navigate('/resume/preview', { replace: true })
			else setSavedResumesOpen(false)
		} catch {
			toast.error(clearNavState ? 'Failed to load saved resume' : 'Failed to load')
			if (clearNavState) navigate('/resume/preview', { replace: true })
		}
	}, [navigate])

	const handleDeleteSaved = useCallback(async (id, e) => {
		e?.stopPropagation()
		try {
			await deleteSavedResume(id)
			fetchSavedResumes()
			toast.success('Saved resume deleted')
		} catch {
			toast.error('Failed to delete')
		}
	}, [fetchSavedResumes])

	// Handle section order change
	const handleSectionOrderChange = (newOrder) => {
		const normalized = normalizeSectionOrder(newOrder)
		setSectionOrder(normalized)
		localStorage.setItem('resumeSectionOrder', JSON.stringify(normalized))
		setResumeData(prev => ({ ...prev, sectionOrder: normalized }))
	}

	// Handle visibility change for sections
	const handleVisibilityChange = (sectionKey, isVisible) => {
		setResumeData(prev => ({
			...prev,
			sectionVisibility: {
				...prev.sectionVisibility,
				[sectionKey]: isVisible,
			}
		}))
	}

	const handleSectionLabelChange = useCallback(
		async (sectionKey, newLabel) => {
			const previousLabel = sectionLabels[sectionKey]
			const updatedLabels = { ...sectionLabels, [sectionKey]: newLabel }
			setSectionLabels(updatedLabels)
			try {
				await updateSectionLabels(updatedLabels)
				if (previewHtml && validateResumeData(resumeData).length === 0) {
					setIsGeneratingPreview(true)
					try {
						const nextPayload = { ...applyVisibilityFilters(resumeData), sectionLabels: updatedLabels }
						const htmlContent = await generateResumePreview(template, nextPayload, stylePreferences)
						setPreviewHtml(htmlContent)
						lastPreviewInputRef.current = JSON.stringify({
							template,
							previewData: nextPayload,
							stylePreferences,
						})
					} catch (error) {
						console.error('Failed to refresh preview:', error)
					} finally {
						setIsGeneratingPreview(false)
					}
				}
			} catch (error) {
				console.error('Failed to update section label:', error)
				setSectionLabels((prev) => ({ ...prev, [sectionKey]: previousLabel }))
			}
		},
		[sectionLabels, previewHtml, resumeData, template, stylePreferences]
	)

	// Handle welcome message dismissal
	const handleDismissWelcome = () => {
		localStorage.setItem('hasSeenResumeWelcome', 'true')
		setWelcomeMessage(false)
	}

	const handleSaveChanges = async () => {
		setIsSaving(true)
		try {
			// save contact/header info - use actual values, ignore visibility.
			// Note: first_name, last_name, and email are NOT saved here - they are editable
			// for the resume but remain separate from the user's profile data.
			const header = resumeData.header
			await upsertContact({
				phone: header.phone || null,
				location: header.location || null,
				github: header.github || null,
				linkedin: header.linkedin || null,
				portfolio: header.portfolio || null,
				tagline: (header.tagline ?? '').trim(),
			})

			// save education (bulk replace).
			const educationToSave = resumeData.education.map(normalizeEducationForBackend)
			await setupEducation(educationToSave)

			// save experiences (bulk replace).
			const experienceToSave = resumeData.experience.map(normalizeExperienceForBackend)
			await setupExperiences(experienceToSave)

			// save projects (bulk replace).
			const projectsToSave = resumeData.projects.map(normalizeProjectForBackend)
			await setupProjects(projectsToSave)

			// save skills (bulk replace) - include both visible and hidden (full pool to profile)
			const allSkills = [...(resumeData.skills || []), ...(resumeData.hiddenSkills || [])]
			const skillsToSave = allSkills.map(normalizeSkillForBackend)
			await setupSkills(skillsToSave)

			// save summary (UPSERT).
			if (resumeData.summary && resumeData.summary.summary) {
				await createSummary({ summary: resumeData.summary.summary })
			}

			// persist header visibility and contactOrder to localStorage so they survive page reload
			if (resumeData.header?.visibility) {
				localStorage.setItem('resumeHeaderVisibility', JSON.stringify(resumeData.header.visibility))
			}
			if (resumeData.header?.contactOrder) {
				localStorage.setItem('resumeHeaderContactOrder', JSON.stringify(resumeData.header.contactOrder))
			}

			setBaselineData(snapshotResumeBaseline(resumeData))
			setShowSaveBanner(false)
			return true
		} catch (error) {
			console.error('Failed to save changes:', error)
			alert('Failed to save changes. Please try again.')
			return false
		} finally {
			setIsSaving(false)
		}
	}

	// ----- use effects -----

	// beforeunload: prompt when dirty (tab close / refresh)
	useEffect(() => {
		const onBeforeUnload = (e) => {
			if (showSaveBanner) {
				e.preventDefault()
			}
		}
		window.addEventListener('beforeunload', onBeforeUnload)
		return () => window.removeEventListener('beforeunload', onBeforeUnload)
	}, [showSaveBanner])

	// auth guard on mount.
	useEffect(() => {
		if (hasFetchedProfileRef.current) return
		hasFetchedProfileRef.current = true

		// if user not logged in, redirect to auth page.
		const token = localStorage.getItem('token')
		if (!token) {
			navigate('/auth')
			return
		}

		// fetch user data from backend.
		try {
			
			// fetch profile from backend once for this page lifecycle.
			const fetchCurrentUser = async () => {
				// --- grab user data from backend.
				const response = await getMyProfile()
				const responseData = response.data
				const state = location.state || {}

				// --- initialize using utility (with options for choose/startFresh flows)
				let initialized
				if (state.createMode === 'choose' && (state.selectedEducationIds || state.selectedExperienceIds || state.selectedProjectIds)) {
					initialized = initializeResumeDataWithOptions(responseData, sectionOrder, {
						selectedEducationIds: state.selectedEducationIds,
						selectedExperienceIds: state.selectedExperienceIds,
						selectedProjectIds: state.selectedProjectIds,
					})
				} else if (state.createMode === 'startFresh') {
					initialized = initializeResumeDataWithOptions(responseData, sectionOrder, { startFresh: true })
				} else {
					initialized = initializeResumeDataFromBackend(responseData, sectionOrder)
				}

				setUser(initialized.user)
				const ord = normalizeSectionOrder(initialized.resumeData.sectionOrder)
				setResumeData({ ...initialized.resumeData, sectionOrder: ord })
				setSectionOrder(ord)
				localStorage.setItem('resumeSectionOrder', JSON.stringify(ord))

				// Load section labels from user profile, merge with defaults
				if (responseData.section_labels) {
					setSectionLabels({ ...DEFAULT_SECTION_LABELS, ...responseData.section_labels })
				}
			}

			fetchCurrentUser();
		} catch {
			setUser(null)
		}
	}, [navigate])

	// fetch available templates.
	useEffect(() => {
		if (hasFetchedTemplatesRef.current) return
		hasFetchedTemplatesRef.current = true
		setIsLoadingTemplates(true)

		const fetchTemplates = async () => {
			const response = await listTemplates()
			const responseData = response.data
			setAvailableTemplates(responseData.templates)
			setTemplateStyling(responseData.templateStyling || {})
			setIsLoadingTemplates(false)
		}

		fetchTemplates()
	}, [])

	// Apply template chosen from /templates gallery (consume state once).
	useEffect(() => {
		const pick = location.state?.selectTemplate
		if (pick == null || pick === '' || isLoadingTemplates || availableTemplates.length === 0) return
		const slug = normalizeTemplateSlug(pick)
		if (availableTemplates.includes(slug)) {
			setTemplate(slug)
		}
		const next = { ...(location.state || {}) }
		delete next.selectTemplate
		const hasState = Object.keys(next).length > 0
		navigate('/resume/preview', { replace: true, state: hasState ? next : undefined })
	}, [
		location.state?.selectTemplate,
		isLoadingTemplates,
		availableTemplates,
		navigate,
	])

	// fetch saved resumes when user is loaded
	useEffect(() => {
		const userId = user?.id
		if (!userId) return
		if (lastSavedResumesUserIdRef.current === userId) return
		lastSavedResumesUserIdRef.current = userId
		fetchSavedResumes()
	}, [user?.id, fetchSavedResumes])

	// Home → preview: consume loadSavedId once (clears route state inside loader).
	useEffect(() => {
		const loadSavedId = location.state?.loadSavedId
		if (!user || !loadSavedId) return
		loadSavedResumeIntoState(loadSavedId, { clearNavState: true })
	}, [user, location.state?.loadSavedId, loadSavedResumeIntoState])

	// Tailor: one request per intent; response `updatedResumeData` is merged into editor (no per-change patches yet).
	useEffect(() => {
		if (!tailorIntent || !hasSetBaseline) return

		const requestKey = JSON.stringify({
			jobTitle: tailorIntent.jobTitle || '',
			company: tailorIntent.company || '',
			jobDescription: tailorIntent.jobDescription || '',
			focus: tailorIntent.focus || 'balanced',
			tone: tailorIntent.tone || 'balanced',
			strictTruth: Boolean(tailorIntent.strictTruth),
		})

		if (lastTailorRequestKeyRef.current === requestKey) return
		lastTailorRequestKeyRef.current = requestKey

		let isCancelled = false
		const requestResumeData = { ...resumeData, sectionLabels }
		const requestTemplate = template || 'classic'

		const requestTailor = async () => {
			try {
				setAiTailorPhase('requesting')

				const result = await suggestJobTailor({
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
				const response = result?.data || result || {}
				setAiTailorResult(response)

				setResumeData((prev) => {
					const next = mergeTailoredResumePayload(prev, response.updatedResumeData)
					queueMicrotask(() => {
						if (next.sectionOrder) {
							setSectionOrder(next.sectionOrder)
							localStorage.setItem('resumeSectionOrder', JSON.stringify(next.sectionOrder))
						}
					})
					return next
				})

				toast.success('Tailored draft loaded into the editor.')
				setAiTailorPhase('reviewing')
			} catch (error) {
				if (isCancelled) return
				console.error('Tailor preview request failed:', error)
				toast.error('Could not generate tailored resume yet.')
				setAiTailorPhase('error')
			}
		}

		requestTailor()
		return () => {
			isCancelled = true
		}
	}, [tailorIntent, hasSetBaseline])

	useEffect(() => {
		exactPdfBlobUrlRef.current = exactPdfBlobUrl
	}, [exactPdfBlobUrl])

	useEffect(() => {
		return () => {
			const u = exactPdfBlobUrlRef.current
			if (u) URL.revokeObjectURL(u)
		}
	}, [])

	// Debounced exact PDF preview (hybrid: draft HTML + true PDF pages).
	useEffect(() => {
		if (tailorIntent && aiTailorPhase === 'requesting') {
			setExactPdfRefreshing(true)
			return
		}

		const issues = validateResumeData(resumeData)
		if (issues.length > 0) {
			setExactPdfBlobUrl((prev) => {
				if (prev) URL.revokeObjectURL(prev)
				return null
			})
			lastExactInputRef.current = null
			setExactPdfRefreshing(false)
			return
		}

		if (lastExactInputRef.current === previewInputKey) {
			setExactPdfRefreshing(false)
			return
		}

		setExactPdfRefreshing(true)
		const reqId = ++exactPdfRequestIdRef.current

		const timer = setTimeout(async () => {
			try {
				const blob = await generateResumePDF(template, visibleResumePayload, stylePreferences)
				if (reqId !== exactPdfRequestIdRef.current) return
				setExactPdfBlobUrl((prev) => {
					if (prev) URL.revokeObjectURL(prev)
					return URL.createObjectURL(blob)
				})
				lastExactInputRef.current = previewInputKey
			} catch (error) {
				console.error('Exact PDF preview failed:', error)
				if (reqId === exactPdfRequestIdRef.current) {
					toast.error('Could not update exact preview.')
				}
			} finally {
				if (reqId === exactPdfRequestIdRef.current) {
					setExactPdfRefreshing(false)
				}
			}
		}, EXACT_PDF_DEBOUNCE_MS)

		return () => clearTimeout(timer)
	}, [resumeData, previewInputKey, visibleResumePayload, tailorIntent, aiTailorPhase, template, stylePreferences])

	// resizing global listener.
	useEffect(() => {
		if (isResizing) {
			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('mouseup', handleMouseUp)
			document.body.style.cursor = 'col-resize'
			document.body.style.userSelect = 'none'
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
			document.body.style.cursor = ''
			document.body.style.userSelect = ''
		}
	}, [isResizing])

	useEffect(() => {
		const handleResize = () => {
			const { min, max } = getPanelWidthBounds(window.innerWidth)
			setLeftPanelWidth((prev) => Math.min(Math.max(min, prev), max))
		}
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	// generate preview on data change (only when visible data changes).
	useEffect(() => {
		// Validate before generating preview
		const issues = validateResumeData(resumeData)
		if (issues.length > 0) {
			setValidationIssues(issues)
			setPreviewHtml(null)
			setIsGeneratingPreview(false)
			setExactPdfBlobUrl((prev) => {
				if (prev) URL.revokeObjectURL(prev)
				return null
			})
			lastExactInputRef.current = null
			setExactPdfRefreshing(false)
			return
		}

		setValidationIssues([])

		if (lastPreviewInputRef.current === previewInputKey) {
			setIsGeneratingPreview(false)
			return
		}

		setIsGeneratingPreview(true)

		const timer = setTimeout(async () => {
			try {
				const htmlContent = await generateResumePreview(template, visibleResumePayload, stylePreferences)
				setPreviewHtml(htmlContent)
				lastPreviewInputRef.current = previewInputKey
			} catch (error) {
				console.error('Failed to generate preview: ', error)
			} finally {
				setIsGeneratingPreview(false)
			}
		}, DRAFT_PREVIEW_DEBOUNCE_MS)

		return () => clearTimeout(timer)
	}, [resumeData, previewInputKey, visibleResumePayload, template, stylePreferences])

	// First baseline after profile hydration (enables dirty detection + tailor).
	useEffect(() => {
		if (hasSetBaseline) return
		if (!resumeData.header?.first_name) return
		setBaselineData(snapshotResumeBaseline(resumeData))
		setHasSetBaseline(true)
	}, [resumeData, hasSetBaseline])

	// check for changes from og data and show save banner.
	useEffect(() => {
		// --- skip change detection until baseline is set.
		if (!hasSetBaseline) return
		
		const hasChanges = hasResumeDataChanged(resumeData, baselineData)
		const descriptions = hasChanges ? getResumeChangeDescriptions(resumeData, baselineData) : []

		setShowSaveBanner(hasChanges)
		setChangeDescriptions(descriptions)
	}, [resumeData, baselineData, hasSetBaseline])

	return (
		<div className="h-screen flex flex-col bg-white overflow-hidden">
			<TopNav
				user={user}
				onLogout={() => {
					localStorage.removeItem('token')
					localStorage.removeItem('user')
					navigate('/')
				}}
			/>

			<main className="flex-1 flex overflow-hidden min-h-0">
				<LeftPanel
					width={leftPanelWidth}
					welcomeMessage={welcomeMessage}
					user={user}
					onDismissWelcome={handleDismissWelcome}
					sectionOrder={sectionOrder}
					onSectionOrderChange={handleSectionOrderChange}
					template={template}
					onTemplateChange={(t) => setTemplate(normalizeTemplateSlug(t))}
					availableTemplates={availableTemplates}
					templateStyling={templateStyling}
					isLoadingTemplates={isLoadingTemplates}
					stylePreferences={stylePreferences}
					onStylePreferenceChange={(key, value) => {
						setStylePreferences((prev) => ({ ...prev, [key]: value }))
					}}
					onScrollToSection={(sectionKey) => {
						const element = document.getElementById(`section-${sectionKey}`)
						if (element) {
							element.scrollIntoView({ behavior: 'smooth', block: 'start' })
						}
					}}
					resumeData={resumeData}
					onHeaderChange={handleHeaderChange}
					onEducationChange={handleEducationChange}
					onExperienceChange={handleExperienceChange}
					onProjectsChange={handleProjectsChange}
					onSkillsChange={handleSkillsChange}
					onHideSkill={handleHideSkill}
					onShowSkill={handleShowSkill}
					onSkillsCategoryOrderChange={handleSkillsCategoryOrderChange}
					onSummaryChange={handleSummaryChange}
					onVisibilityChange={handleVisibilityChange}
					sectionLabels={sectionLabels}
					onSectionLabelChange={handleSectionLabelChange}
					tailorIntent={tailorIntent}
					aiTailorResult={aiTailorResult}
					aiTailorPhase={aiTailorPhase}
				/>

				{/* resizable divider */}
				<div
					onMouseDown={handleMouseDown}
					onDoubleClick={handleDoubleClick}
					title="Drag to resize • Double-click to reset"
					className={`w-1 bg-gray-300 hover:bg-brand-pink cursor-col-resize transition-colors ${isResizing ? 'bg-brand-pink' : ''}`}
				/>
				
				<RightPanel
					previewHtml={previewHtml}
					isGeneratingPreview={isGeneratingPreview}
					previewZoom={previewZoom}
					zoomMin={PREVIEW_ZOOM.min}
					zoomMax={PREVIEW_ZOOM.max}
					onZoomIn={handleZoomIn}
					onZoomOut={handleZoomOut}
					onZoomReset={handleZoomReset}
					downloadStatus={downloadStatus}
					onDownloadDocument={handleDownloadDocument}
					onRefreshPreview={handleRefreshPreview}
					validationIssues={validationIssues}
					exactPdfUrl={exactPdfBlobUrl}
					exactPdfRefreshing={exactPdfRefreshing}
					showSaveBanner={showSaveBanner}
					saveChangedSections={changeDescriptions}
					isSavingResume={isSaving}
					onDiscardChanges={handleDiscardChanges}
					onSaveChanges={handleSaveChanges}
					savedResumes={savedResumes}
					savedResumesOpen={savedResumesOpen}
					onToggleSavedResumes={() => setSavedResumesOpen((v) => !v)}
					onCloseSavedResumes={() => setSavedResumesOpen(false)}
					saveResumeName={saveResumeName}
					onSaveResumeNameChange={setSaveResumeName}
					isSavingResumeForLater={isSavingResume}
					onSaveForLater={handleSaveForLater}
					onLoadSaved={loadSavedResumeIntoState}
					onDeleteSaved={handleDeleteSaved}
				/>
			</main>
		</div>
	)
}

export default ResumePreview

