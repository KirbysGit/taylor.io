// pages/5resume/ResumePreview.jsx

// building back incrementally.
// loading state for downloading and processing.
// templates up top.
// welcome message only appears on first load.
// save banner shouldn't appear if visibility change.
// add like recommendations for features, like you should at least have a linkedin or something else.
// more contrast in fields just for sake of "easy on the eyes".
// preview scrolls to where the user is in input fields.
// always have padding on left side for scroll bar (like the left panel).

// imports.
import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'

// api imports.
import { listTemplates } from '@/api/services/templates'
import { generateResumePreview, generateResumePDF, generateResumeWord } from '@/api/services/resume'
import { getMyProfile, upsertContact, setupEducation, setupExperiences, setupProjects, setupSkills, createSummary, updateSectionLabels, listSavedResumes, createSavedResume, getSavedResume, deleteSavedResume } from '@/api/services/profile'

// component imports.
import SaveBanner from './components/left/SaveBanner'


// component imports.
import LeftPanel from './components/left/LeftPanel'
import RightPanel from './components/right/RightPanel'

// util imports.
import { 
	normalizeEducationForBackend,
	normalizeExperienceForBackend,
	normalizeProjectForBackend,
	normalizeSkillForBackend
} from '@/pages/utils/DataFormatting'
import { applyVisibilityFilters, hasResumeDataChanged, getResumeChangeDescriptions, downloadBlob } from './utils/resumeDataTransform'
import { initializeResumeDataFromBackend, initializeResumeDataWithOptions } from './utils/resumeDataInitializer'

// ----------- main component -----------
function ResumePreview() {

    // allows us to navigate to other pages.
	const navigate = useNavigate()
	const location = useLocation()

    // ----- states -----

	const [user, setUser] = useState(null)										// user's data.

	// welcome message states.
	// Check localStorage on initial render - only show if user hasn't seen it before
	const [welcomeMessage, setWelcomeMessage] = useState(() => {
		const hasSeenWelcome = localStorage.getItem('hasSeenResumeWelcome')
		return !hasSeenWelcome // Show if they haven't seen it
	})

	// template states.
	const [template, setTemplate] = useState('default')                            // template being used for resume.
	const [availableTemplates, setAvailableTemplates] = useState(['default'])      // available templates to choose from.
	const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)          // loading state for templates.
	
	// panel states.
	const DEFAULT_LEFT_PANEL_WIDTH = 700; // default width for left panel
	const [leftPanelWidth, setLeftPanelWidth] = useState(DEFAULT_LEFT_PANEL_WIDTH);                  // width of left panel.
	const [isResizing, setIsResizing] = useState(false);						// if user is currently resizing panel.

	// Calculate min and max panel widths based on viewport size
	// Using breakpoint-based approach for more precise control
	const getMinLeftPanelWidth = () => {
		const viewportWidth = window.innerWidth
		
		// Breakpoint-based minimum widths
		// Adjust these pixel values as needed during debugging
		if (viewportWidth < 768) {
			// Mobile/Tablet (< 768px)
			return 320 // Minimum for small screens
		} else if (viewportWidth < 1024) {
			// Tablet (768px - 1023px)
			return 400
		} else if (viewportWidth < 1440) {
			// Desktop (1024px - 1439px)
			return 500
		} else if (viewportWidth < 1920) {
			// Desktop (1440px - 1919px)
			return 600
		} else {
			// Large Desktop (>= 1920px)
			return 700 // Fixed max for large screens
		}
	}

	const getMaxLeftPanelWidth = () => {
		const viewportWidth = window.innerWidth
		console.log('viewportWidth', viewportWidth)
		// Breakpoint-based maximum widths
		// Ensures right panel always has adequate space
		// Adjust these pixel values as needed during debugging
		if (viewportWidth < 768) {
			// Mobile/Tablet (< 768px)
			return Math.floor(viewportWidth * 0.60) // Max 60% on small screens
		} else if (viewportWidth < 1024) {
			// Tablet (768px - 1023px)
			return Math.floor(viewportWidth * 0.55) // Max 55% on tablets
		} else if (viewportWidth < 1440) {
			// Desktop (1024px - 1439px)
			return 800 // Fixed max for standard desktop
		} else if (viewportWidth < 1920) {
			// Large Desktop (>= 1440px)
			return 1000 // Fixed max for large screens
		} else {
			// Large Desktop (>= 1920px)
			return 1200 // Fixed max for large screens
		}
	}

	// preview states.
	const [previewHtml, setPreviewHtml] = useState(null)
	const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
	const lastPreviewInputRef = useRef(null) // skip fetch when visible data unchanged
	const [previewZoom, setPreviewZoom] = useState(100) // default 75% to see more content
	const [validationErrors, setValidationErrors] = useState([]) // validation errors for required fields

	// zoom handlers
	const handleZoomIn = () => {
		setPreviewZoom(prev => Math.min(prev + 25, 200)) // Max 200%
	}

	const handleZoomOut = () => {
		setPreviewZoom(prev => Math.max(prev - 25, 25)) // Min 25%
	}

	// download states.
	const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
	const [isDownloadingWord, setIsDownloadingWord] = useState(false)

	// header data state.
	const [headerData, setHeaderData] = useState(null)
	const [educationData, setEducationData] = useState([])
	const [experienceData, setExperienceData] = useState([])
	const [projectsData, setProjectsData] = useState([])
	const [skillsData, setSkillsData] = useState([])
	const [summaryData, setSummaryData] = useState(null)
	
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

	// flag to track if we've set baseline after Education component normalization.
	const [hasSetBaseline, setHasSetBaseline] = useState(false)

	// section ordering state
	const [sectionOrder, setSectionOrder] = useState(() => {
		// Load from localStorage or use default
		const savedOrder = localStorage.getItem('resumeSectionOrder')
		return savedOrder ? JSON.parse(savedOrder) : ['header', 'summary', 'education', 'experience', 'projects', 'skills']
	})

	// section labels state - default labels
	const DEFAULT_SECTION_LABELS = {
		summary: 'Professional Summary',
		education: 'Education',
		experience: 'Experience',
		projects: 'Projects',
		skills: 'Skills'
	}
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
		},
		education: [],
		experience: [],
		projects: [],
		skills: [],
		hiddenSkills: [],
		summary: { summary: '' },
		// section visibility - controls which sections show in preview/PDF
		sectionVisibility: {
			summary: false, // hidden by default
			education: true,
			experience: true,
			projects: true,
			skills: true,
		},
		sectionOrder: sectionOrder, // Include section order for backend
	})


	// ----- handlers -----

	const handleMouseDown = (e) => {
		setIsResizing(true);
		e.preventDefault();
	}

	const handleMouseMove = (e) => {
		if (!isResizing) return;
		const newWidth = e.clientX
		const minWidth = getMinLeftPanelWidth()
		const maxWidth = getMaxLeftPanelWidth()
		setLeftPanelWidth(Math.min(Math.max(minWidth, newWidth), maxWidth))
	}

	const handleMouseUp = () => {
		setIsResizing(false);
	}

	const handleDoubleClick = () => {
		// Ensure default width is within bounds
		const minWidth = getMinLeftPanelWidth()
		const maxWidth = getMaxLeftPanelWidth()
		const constrainedDefault = Math.min(Math.max(minWidth, DEFAULT_LEFT_PANEL_WIDTH), maxWidth)
		setLeftPanelWidth(constrainedDefault)
	}

	// Validate required fields (only for sections that are visible in the preview)
	const validateResumeData = (data) => {
		const errors = []
		const sectionVisibility = data.sectionVisibility || {
			summary: false,
			education: true,
			experience: true,
			projects: true,
			skills: true,
		}

		// Check name (always required - header is always shown)
		const fullName = `${data.header?.first_name || ''} ${data.header?.last_name || ''}`.trim()
		if (!fullName) {
			errors.push("Your name is required")
		}

		// Check education entries only if education section is visible
		if (sectionVisibility.education && data.education && data.education.length > 0) {
			data.education.forEach((edu, index) => {
				const entryNum = index + 1
				if (!edu.school || !edu.school.trim()) {
					errors.push(`Education ${entryNum}: School name is required`)
				}
				if (!edu.degree || !edu.degree.trim()) {
					errors.push(`Education ${entryNum}: Degree is required`)
				}
				if (!edu.discipline || !edu.discipline.trim()) {
					errors.push(`Education ${entryNum}: Discipline is required`)
				}
			})
		}

		// Check experience entries only if experience section is visible
		if (sectionVisibility.experience && data.experience && data.experience.length > 0) {
			data.experience.forEach((exp, index) => {
				const entryNum = index + 1
				if (!exp.title || !exp.title.trim()) {
					errors.push(`Experience ${entryNum}: Title is required`)
				}
				if (!exp.company || !exp.company.trim()) {
					errors.push(`Experience ${entryNum}: Company is required`)
				}
				if (!exp.description || !exp.description.trim()) {
					errors.push(`Experience ${entryNum}: Description is required`)
				}
			})
		}

		// Check project entries only if projects section is visible
		if (sectionVisibility.projects && data.projects && data.projects.length > 0) {
			data.projects.forEach((proj, index) => {
				const entryNum = index + 1
				if (!proj.title || !proj.title.trim()) {
					errors.push(`Project ${entryNum}: Title is required`)
				}
				if (!proj.description || !proj.description.trim()) {
					errors.push(`Project ${entryNum}: Description is required`)
				}
			})
		}

		return errors
	}

	const handleRefreshPreview = async () => {
		// Validate before generating preview
		const errors = validateResumeData(resumeData)
		if (errors.length > 0) {
			setValidationErrors(errors)
			setPreviewHtml(null)
			return
		}

		setValidationErrors([])
		setIsGeneratingPreview(true)
		try {
			const previewData = {
				...applyVisibilityFilters(resumeData),
				sectionLabels: sectionLabels
			}
			const htmlContent = await generateResumePreview(template, previewData)
			setPreviewHtml(htmlContent)
		} finally {
			setIsGeneratingPreview(false)
		}
	}

	const handleDownloadPDF = async () => {
		setIsDownloadingPDF(true)
		try {
			const pdfData = {
				...applyVisibilityFilters(resumeData),
				sectionLabels: sectionLabels
			}
			const pdfBlob = await generateResumePDF(template, pdfData)
			downloadBlob(pdfBlob, 'resume.pdf')
		} catch (error) {
			console.error('Failed to generate PDF:', error)
		} finally {
			setIsDownloadingPDF(false)
		}
	}

	const handleDownloadWord = async () => {
		setIsDownloadingWord(true)
		try {
			const docData = {
				...applyVisibilityFilters(resumeData),
				sectionLabels: sectionLabels
			}
			const docBlob = await generateResumeWord(template, docData)
			downloadBlob(docBlob, 'resume.docx')
		} catch (error) {
			console.error('Failed to generate Word:', error)
		} finally {
			setIsDownloadingWord(false)
		}
	}

	const handleDiscardChanges = () => {
		// reset to baseline data.
		if (baselineData.header) {
			const resetData = {
				header: JSON.parse(JSON.stringify(baselineData.header)),
				education: JSON.parse(JSON.stringify(baselineData.education)),
				experience: JSON.parse(JSON.stringify(baselineData.experience || [])),
				projects: JSON.parse(JSON.stringify(baselineData.projects || [])),
				skills: JSON.parse(JSON.stringify(baselineData.skills || [])),
				hiddenSkills: JSON.parse(JSON.stringify(baselineData.hiddenSkills || [])),
				summary: JSON.parse(JSON.stringify(baselineData.summary || { summary: '' })),
				// preserve sectionVisibility when discarding (visibility is separate from data)
				sectionVisibility: resumeData.sectionVisibility || {
					summary: false,
					education: true,
					experience: true,
					projects: true,
					skills: true,
				},
				sectionOrder: resumeData.sectionOrder,
			}
			setResumeData(resetData)
			setHeaderData(resetData.header)
			setEducationData(resetData.education)
			setExperienceData(resetData.experience)
			setProjectsData(resetData.projects)
			setSkillsData(resetData.skills)
			setSummaryData(resetData.summary)
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

	const handleShowSkill = useCallback((skillId) => {
		setResumeData((prev) => {
			const hidden = prev.hiddenSkills || []
			const skill = hidden.find((s) => String(s.id ?? s) === String(skillId))
			if (!skill) return prev
			const newHidden = hidden.filter((s) => String(s.id ?? s) !== String(skillId))
			const newSkills = [...(prev.skills || []), { ...skill, id: skill.id ?? skillId }]
			return { ...prev, skills: newSkills, hiddenSkills: newHidden }
		})
	}, [])

	const handleSkillsCategoryOrderChange = useCallback((categoryOrder) => {
		setResumeData(prev => ({ ...prev, skillsCategoryOrder: categoryOrder }))
	}, [])

	const handleSummaryChange = useCallback((exportedSummary) => {
		// Keep summaryData in sync so Summary component shows correct data when it remounts after reorder
		setSummaryData(exportedSummary)
		setResumeData(prev => ({ 
			...prev, 
			summary: exportedSummary,
			// preserve sectionVisibility if it exists, otherwise set defaults
			sectionVisibility: prev.sectionVisibility || {
				summary: false,
				education: true,
				experience: true,
				projects: true,
				skills: true,
			}
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

	const handleLoadSaved = useCallback(async (id) => {
		try {
			const res = await getSavedResume(id)
			const data = res.data || res
			const rd = data.resume_data || {}
			const merged = {
				header: rd.header,
				education: rd.education ?? [],
				experience: rd.experience ?? [],
				projects: rd.projects ?? [],
				skills: rd.skills ?? [],
				hiddenSkills: rd.hiddenSkills ?? [],
				summary: rd.summary ?? { summary: '' },
				sectionVisibility: rd.sectionVisibility,
				sectionOrder: rd.sectionOrder,
				skillsCategoryOrder: rd.skillsCategoryOrder,
			}
			setResumeData(prev => ({ ...prev, ...merged }))
			setHeaderData(merged.header)
			setEducationData(merged.education)
			setExperienceData(merged.experience)
			setProjectsData(merged.projects)
			setSkillsData(merged.skills)
			setSummaryData(merged.summary)
			setBaselineData({
				header: merged.header,
				education: merged.education,
				experience: merged.experience,
				projects: merged.projects,
				skills: merged.skills,
				hiddenSkills: merged.hiddenSkills,
				summary: merged.summary,
			})
			if (merged.sectionOrder) setSectionOrder(merged.sectionOrder)
			if (data.template) setTemplate(data.template)
			setSavedResumesOpen(false)
			toast.success('Resume loaded')
		} catch {
			toast.error('Failed to load')
		}
	}, [])

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
		setSectionOrder(newOrder)
		// Save to localStorage
		localStorage.setItem('resumeSectionOrder', JSON.stringify(newOrder))
		// Update resumeData with new order
		setResumeData(prev => ({ ...prev, sectionOrder: newOrder }))
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

	// Handle section label change
	const handleSectionLabelChange = useCallback(async (sectionKey, newLabel) => {
		// Save current value for potential revert
		const previousLabel = sectionLabels[sectionKey]

		// Update local state immediately (optimistic update)
		const updatedLabels = { ...sectionLabels, [sectionKey]: newLabel }
		setSectionLabels(updatedLabels)

		// Save to backend
		try {
			await updateSectionLabels(updatedLabels)
			
			// If preview exists, refresh it with new section labels
			if (previewHtml) {
				// Validate before generating preview
				const errors = validateResumeData(resumeData)
				if (errors.length === 0) {
					setIsGeneratingPreview(true)
					try {
						const previewData = {
							...applyVisibilityFilters(resumeData),
							sectionLabels: updatedLabels
						}
						const htmlContent = await generateResumePreview(template, previewData)
						setPreviewHtml(htmlContent)
					} catch (error) {
						console.error('Failed to refresh preview:', error)
					} finally {
						setIsGeneratingPreview(false)
					}
				}
			}
		} catch (error) {
			console.error('Failed to update section label:', error)
			// Revert on error
			setSectionLabels(prev => ({
				...prev,
				[sectionKey]: previousLabel
			}))
		}
	}, [sectionLabels, previewHtml, resumeData, template])

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

			// update baseline to current data.
			setBaselineData({
				header: JSON.parse(JSON.stringify(resumeData.header)),
				education: JSON.parse(JSON.stringify(resumeData.education)),
				experience: JSON.parse(JSON.stringify(resumeData.experience)),
				projects: JSON.parse(JSON.stringify(resumeData.projects)),
				skills: JSON.parse(JSON.stringify(resumeData.skills || [])),
				hiddenSkills: JSON.parse(JSON.stringify(resumeData.hiddenSkills || [])),
				summary: JSON.parse(JSON.stringify(resumeData.summary || { summary: '' })),
			})
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

	// Save on Back/navigation - save first if dirty, then navigate
	const handleBackClick = async () => {
		if (showSaveBanner) {
			const saved = await handleSaveChanges()
			if (!saved) return
			toast.success('Your changes have been saved.')
		}
		navigate('/home')
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

		// if user not logged in, redirect to auth page.
		const token = localStorage.getItem('token')
		if (!token) {
			navigate('/auth')
			return
		}

		// fetch user data from backend.
		try {
			
			// step 1 : fetch user data from local storage.
			// we can immediately display name & email.
			const userData = localStorage.getItem('user')
			if (userData) {
				setUser(JSON.parse(userData))
			}

			// step 2 : fetch user data from backend.
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
				setHeaderData(initialized.headerData)
				setEducationData(initialized.educationData)
				setExperienceData(initialized.experienceData)
				setProjectsData(initialized.projectsData)
				setSkillsData(initialized.skillsData)
				setSummaryData(initialized.summaryData)
				setResumeData(initialized.resumeData)

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
		setIsLoadingTemplates(true)

		const fetchTemplates = async () => {
			const response = await listTemplates()
			const responseData = response.data
			setAvailableTemplates(responseData.templates)
			setIsLoadingTemplates(false)
		}

		fetchTemplates()
	}, [])

	// fetch saved resumes when user is loaded
	useEffect(() => {
		if (user) fetchSavedResumes()
	}, [user, fetchSavedResumes])

	// load saved resume when navigated from Home with loadSavedId
	useEffect(() => {
		const loadSavedId = location.state?.loadSavedId
		if (!user || !loadSavedId) return

		const loadFromHome = async () => {
			try {
				const res = await getSavedResume(loadSavedId)
				const data = res.data || res
				const rd = data.resume_data || {}
				const merged = {
					header: rd.header,
					education: rd.education ?? [],
					experience: rd.experience ?? [],
					projects: rd.projects ?? [],
					skills: rd.skills ?? [],
					hiddenSkills: rd.hiddenSkills ?? [],
					summary: rd.summary ?? { summary: '' },
					sectionVisibility: rd.sectionVisibility,
					sectionOrder: rd.sectionOrder,
					skillsCategoryOrder: rd.skillsCategoryOrder,
				}
				setResumeData(prev => ({ ...prev, ...merged }))
				setHeaderData(merged.header)
				setEducationData(merged.education)
				setExperienceData(merged.experience)
				setProjectsData(merged.projects)
				setSkillsData(merged.skills)
				setSummaryData(merged.summary)
				setBaselineData({
					header: merged.header,
					education: merged.education,
					experience: merged.experience,
					projects: merged.projects,
					skills: merged.skills,
					hiddenSkills: merged.hiddenSkills,
					summary: merged.summary,
				})
				if (merged.sectionOrder) setSectionOrder(merged.sectionOrder)
				if (data.template) setTemplate(data.template)
				toast.success('Resume loaded')
				// clear navigation state so we don't reload on re-render
				navigate('/resume/preview', { replace: true })
			} catch {
				toast.error('Failed to load saved resume')
				navigate('/resume/preview', { replace: true })
			}
		}

		loadFromHome()
	}, [user, location.state?.loadSavedId, navigate])

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

	// Constrain panel width when window is resized
	useEffect(() => {
		const handleResize = () => {
			const minWidth = getMinLeftPanelWidth()
			const maxWidth = getMaxLeftPanelWidth()
			setLeftPanelWidth(prev => Math.min(Math.max(minWidth, prev), maxWidth))
		}

		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	// generate preview on data change (only when visible data changes).
	useEffect(() => {
		// Validate before generating preview
		const errors = validateResumeData(resumeData)
		if (errors.length > 0) {
			setValidationErrors(errors)
			setPreviewHtml(null)
			setIsGeneratingPreview(false)
			return
		}

		setValidationErrors([])

		// compute the data that would actually be sent to the preview (visibility-filtered)
		const previewData = {
			...applyVisibilityFilters(resumeData),
			sectionLabels: sectionLabels
		}
		const previewInput = JSON.stringify({ template, previewData })

		// skip fetch if nothing visible changed (e.g. editing a hidden section)
		if (lastPreviewInputRef.current === previewInput) {
			// ensure loading is cleared (previous run may have been cancelled before its callback ran)
			setIsGeneratingPreview(false)
			return
		}

		setIsGeneratingPreview(true)

		const timer = setTimeout(async () => {
			try {
				const htmlContent = await generateResumePreview(template, previewData)
				setPreviewHtml(htmlContent)
				lastPreviewInputRef.current = previewInput
			} catch (error) {
				console.error('Failed to generate preview: ', error)
			} finally {
				setIsGeneratingPreview(false)
			}
		}, 1000)

		return () => clearTimeout(timer)
	}, [template, resumeData, sectionLabels])

	// set baseline data after components mount and data is loaded.
	useEffect(() => {
		if (hasSetBaseline) return
		// wait for data to be loaded from backend (headerData starts as null)
		if (!headerData) return
		// ensure resumeData has been populated (not just initial empty state)
		if (!resumeData.header || !resumeData.header.first_name) return

		// --- set baseline with the normalized data from components.
		setBaselineData({
			header: JSON.parse(JSON.stringify(resumeData.header)),
			education: JSON.parse(JSON.stringify(resumeData.education || [])),
			experience: JSON.parse(JSON.stringify(resumeData.experience || [])),
			projects: JSON.parse(JSON.stringify(resumeData.projects || [])),
			skills: JSON.parse(JSON.stringify(resumeData.skills || [])),
			hiddenSkills: JSON.parse(JSON.stringify(resumeData.hiddenSkills || [])),
			summary: JSON.parse(JSON.stringify(resumeData.summary || { summary: '' })),
		})
		setHasSetBaseline(true)
	}, [resumeData, headerData, hasSetBaseline])

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
			{/* Header/Navbar */}
			<header className="flex-shrink-0 bg-brand-pink text-white py-2 shadow-md">
				<div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
					<h1 className="text-xl font-bold">Resume</h1>
					<div className="flex items-center gap-2">
						{/* Save for later */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setSavedResumesOpen(!savedResumesOpen)}
								className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-all"
							>
								Saved ({savedResumes.items.length}/{savedResumes.max})
							</button>
							{savedResumesOpen && (
								<>
									<div className="fixed inset-0 z-10" onClick={() => setSavedResumesOpen(false)} aria-hidden="true" />
									<div className="absolute right-0 top-full mt-1 w-72 bg-white text-gray-900 rounded-lg shadow-lg border border-gray-200 py-2 z-20">
										<div className="px-3 py-2 border-b border-gray-100">
											<input
												type="text"
												value={saveResumeName}
												onChange={(e) => setSaveResumeName(e.target.value)}
												placeholder="Name for this resume"
												className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded"
											/>
											<button
												type="button"
												onClick={handleSaveForLater}
												disabled={isSavingResume || savedResumes.items.length >= savedResumes.max}
												className="mt-2 w-full px-3 py-1.5 bg-brand-pink text-white text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{isSavingResume ? 'Saving...' : 'Save for later'}
											</button>
											{savedResumes.items.length >= savedResumes.max && (
												<p className="mt-1 text-xs text-gray-500">Limit reached. Delete one to save more.</p>
											)}
										</div>
										{savedResumes.items.length > 0 ? (
											<div className="max-h-48 overflow-y-auto">
												{savedResumes.items.map((s) => (
													<div
														key={s.id}
														className="px-3 py-2 hover:bg-gray-50 flex justify-between items-center group"
													>
														<button
															type="button"
															onClick={() => handleLoadSaved(s.id)}
															className="text-left flex-1 min-w-0 truncate text-sm"
														>
															{s.name}
														</button>
														<button
															type="button"
															onClick={(e) => handleDeleteSaved(s.id, e)}
															className="text-red-500 hover:text-red-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-2"
														>
															Delete
														</button>
													</div>
												))}
											</div>
										) : (
											<p className="px-3 py-4 text-sm text-gray-500">No saved resumes yet</p>
										)}
									</div>
								</>
							)}
						</div>
						<button
							type="button"
							onClick={handleBackClick}
							className="px-3 py-1.5 bg-white-bright text-brand-pink font-semibold rounded-lg hover:opacity-90 transition-all text-sm"
						>
							← Back
						</button>
					</div>
				</div>
			</header>

			{/* Save Banner - Fixed Top Right */}
			<SaveBanner
				showSaveBanner={showSaveBanner}
				changeDescriptions={changeDescriptions}
				isSaving={isSaving}
				onDiscard={handleDiscardChanges}
				onSave={handleSaveChanges}
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
					onTemplateChange={setTemplate}
					availableTemplates={availableTemplates}
					isLoadingTemplates={isLoadingTemplates}
					onScrollToSection={(sectionKey) => {
						const element = document.getElementById(`section-${sectionKey}`)
						if (element) {
							element.scrollIntoView({ behavior: 'smooth', block: 'start' })
						}
					}}
					headerData={headerData}
					educationData={resumeData.education ?? educationData}
					experienceData={resumeData.experience ?? experienceData}
					projectsData={resumeData.projects ?? projectsData}
					skillsData={resumeData.skills ?? skillsData}
					summaryData={resumeData.summary ?? summaryData}
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
					onZoomIn={handleZoomIn}
					onZoomOut={handleZoomOut}
					isDownloadingPDF={isDownloadingPDF}
					onDownloadPDF={handleDownloadPDF}
					isDownloadingWord={isDownloadingWord}
					onDownloadWord={handleDownloadWord}
					onRefreshPreview={handleRefreshPreview}
					validationErrors={validationErrors}
				/>
			</main>
		</div>
	)
}

export default ResumePreview

