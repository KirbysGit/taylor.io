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
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// api imports.
import { listTemplates } from '@/api/services/templates'
import { generateResumePreview, generateResumePDF } from '@/api/services/resume'
import { getMyProfile, upsertContact, setupEducation, setupExperiences, setupProjects, setupSkills, createSummary, updateSectionLabels } from '@/api/services/profile'

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
import { initializeResumeDataFromBackend } from './utils/resumeDataInitializer'

// ----------- main component -----------
function ResumePreview() {

    // allows us to navigate to other pages.
	const navigate = useNavigate()

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

	// Validate required fields
	const validateResumeData = (data) => {
		const errors = []

		// Check name (always required)
		const fullName = `${data.header?.first_name || ''} ${data.header?.last_name || ''}`.trim()
		if (!fullName) {
			errors.push("Your name is required")
		}

		// Check education entries (if any exist)
		if (data.education && data.education.length > 0) {
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

		// Check experience entries (if any exist)
		if (data.experience && data.experience.length > 0) {
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

		// Check project entries (if any exist)
		if (data.projects && data.projects.length > 0) {
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
		// apply visibility filters for preview.
		const previewData = {
			...applyVisibilityFilters(resumeData),
			sectionLabels: sectionLabels
		}
		
		const htmlContent = await generateResumePreview(template, previewData)
		setPreviewHtml(htmlContent)
		setIsGeneratingPreview(false)
	}

	const handleDownloadPDF = async () => {
		setIsDownloadingPDF(true)
		try {
			// apply visibility filters for PDF.
			const pdfData = {
				...applyVisibilityFilters(resumeData),
				sectionLabels: sectionLabels
			}
			
			const pdfBlob = await generateResumePDF(template, pdfData)
			setIsDownloadingPDF(false)
			downloadBlob(pdfBlob, 'resume.pdf')
		} catch (error) {
			console.error('Failed to generate PDF:', error)
			setIsDownloadingPDF(false)
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

	const handleSummaryChange = useCallback((exportedSummary) => {
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

			// save skills (bulk replace).
			const skillsToSave = resumeData.skills.map(normalizeSkillForBackend)
			await setupSkills(skillsToSave)

			// save summary (UPSERT).
			if (resumeData.summary && resumeData.summary.summary) {
				await createSummary({ summary: resumeData.summary.summary })
			}

			// update baseline to current data.
			setBaselineData({
				header: JSON.parse(JSON.stringify(resumeData.header)),
				education: JSON.parse(JSON.stringify(resumeData.education)),
				experience: JSON.parse(JSON.stringify(resumeData.experience)),
				projects: JSON.parse(JSON.stringify(resumeData.projects)),
				skills: JSON.parse(JSON.stringify(resumeData.skills || [])),
				summary: JSON.parse(JSON.stringify(resumeData.summary || { summary: '' })),
			})
			setShowSaveBanner(false)
		} catch (error) {
			console.error('Failed to save changes:', error)
			alert('Failed to save changes. Please try again.')
		} finally {
			setIsSaving(false)
		}
	}

	// ----- use effects -----

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
				
				// --- initialize all data using utility function.
				const initialized = initializeResumeDataFromBackend(responseData, sectionOrder)
				
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

	// generate preview on data change.
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
		setIsGeneratingPreview(true)

		const timer = setTimeout(async () => {
			try {
				// --- apply visibility filters for preview, then generate preview, and set preview.
				const previewData = {
					...applyVisibilityFilters(resumeData),
					sectionLabels: sectionLabels
				}
				const htmlContent = await generateResumePreview(template, previewData)
				setPreviewHtml(htmlContent)
			} catch (error) {
				console.error('Failed to generate preview: ', error)
			} finally {
				setIsGeneratingPreview(false)
			}
		}, 1000)

		return () => clearTimeout(timer)
	}, [template, resumeData])

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
					<button
						type="button"
						onClick={() => navigate('/home')}
						className="px-3 py-1.5 bg-white-bright text-brand-pink font-semibold rounded-lg hover:opacity-90 transition-all text-sm"
					>
						← Back
					</button>
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
					educationData={educationData}
					experienceData={experienceData}
					projectsData={projectsData}
					skillsData={skillsData}
					summaryData={summaryData}
					resumeData={resumeData}
					onHeaderChange={handleHeaderChange}
					onEducationChange={handleEducationChange}
					onExperienceChange={handleExperienceChange}
					onProjectsChange={handleProjectsChange}
					onSkillsChange={handleSkillsChange}
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
					onRefreshPreview={handleRefreshPreview}
					validationErrors={validationErrors}
				/>
			</main>
		</div>
	)
}

export default ResumePreview

