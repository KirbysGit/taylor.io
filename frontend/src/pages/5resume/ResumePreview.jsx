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
import { getMyProfile, upsertContact, setupEducation, setupExperiences, setupProjects, setupSkills, createSummary } from '@/api/services/profile'

// icons imports.
import { XIcon } from '@/components/icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRefresh, faDownload } from '@fortawesome/free-solid-svg-icons'

// component imports.
import ResumeHeader from './components/ResumeHeader'
import Education from './components/Education'
import Experience from './components/Experience'
import Projects from './components/Projects'
import Skills from './components/Skills'
import Summary from './components/Summary'

// util imports.
import { formatDateForInput } from '@/pages/utils/DataFormatting'
import { applyVisibilityFilters, hasResumeDataChanged, getResumeChangeDescriptions, downloadBlob } from './utils/resumeDataTransform'

// ----------- main component -----------
function ResumePreview() {

    // allows us to navigate to other pages.
	const navigate = useNavigate()

    // ----- states -----

	const [user, setUser] = useState(null)										// user's data.

	// welcome message states.
	const [welcomeMessage, setWelcomeMessage] = useState(true);					// if welcome message should be shown.

	// template states.
	const [template, setTemplate] = useState('default')                            // template being used for resume.
	const [availableTemplates, setAvailableTemplates] = useState(['default'])      // available templates to choose from.
	const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)          // loading state for templates.
	
	// panel states.
	const [leftPanelWidth, setLeftPanelWidth] = useState(560);                  // width of left panel.
	const [isResizing, setIsResizing] = useState(false);						// if user is currently resizing panel.

	// preview states.
	const [previewHtml, setPreviewHtml] = useState(null)
	const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

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
	})


	// ----- handlers -----

	const handleMouseDown = (e) => {
		setIsResizing(true);
		e.preventDefault();
	}

	const handleMouseMove = (e) => {
		if (!isResizing) return;
		const newWidth = e.clientX
		setLeftPanelWidth(Math.min(Math.max(300, newWidth), 800))
	}

	const handleMouseUp = () => {
		setIsResizing(false);
	}

	const handleRefreshPreview = async () => {
		setIsGeneratingPreview(true)
		// apply visibility filters for preview.
		const previewData = applyVisibilityFilters(resumeData)
		
		const htmlContent = await generateResumePreview(template, previewData)
		setPreviewHtml(htmlContent)
		setIsGeneratingPreview(false)
	}

	const handleDownloadPDF = async () => {
		setIsDownloadingPDF(true)
		try {
			// apply visibility filters for PDF.
			const pdfData = applyVisibilityFilters(resumeData)
			
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
			setResumeData(prev => ({
				...prev,
				header: JSON.parse(JSON.stringify(baselineData.header)),
				education: JSON.parse(JSON.stringify(baselineData.education)),
				projects: JSON.parse(JSON.stringify(baselineData.projects || [])),
				skills: JSON.parse(JSON.stringify(baselineData.skills || [])),
				summary: JSON.parse(JSON.stringify(baselineData.summary || { summary: '' })),
			}))
			setHeaderData(JSON.parse(JSON.stringify(baselineData.header)))
			setEducationData(JSON.parse(JSON.stringify(baselineData.education)))
			setProjectsData(JSON.parse(JSON.stringify(baselineData.projects || [])))
			setSkillsData(JSON.parse(JSON.stringify(baselineData.skills || [])))
			setSummaryData(JSON.parse(JSON.stringify(baselineData.summary || { summary: '' })))
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
		setResumeData(prev => ({ ...prev, summary: exportedSummary }))
	}, [])

	const handleSaveChanges = async () => {
		setIsSaving(true)
		try {
			// save contact/header info - use actual values, ignore visibility.
			const header = resumeData.header
			await upsertContact({
				phone: header.phone || null,
				location: header.location || null,
				github: header.github || null,
				linkedin: header.linkedin || null,
				portfolio: header.portfolio || null,
			})

			// save education (bulk replace).
			const educationToSave = resumeData.education.map(edu => ({
				school: edu.school || null,
				degree: edu.degree || null,
				discipline: edu.discipline || null,
				minor: edu.minor || null,
				location: edu.location || null,
				start_date: edu.start_date || null,
				end_date: edu.end_date || null,
				current: edu.current || false,
				gpa: edu.gpa || null,
				subsections: edu.subsections || {},
			}))
			await setupEducation(educationToSave)

			const experienceToSave = resumeData.experience.map(exp => ({
				title: exp.title || null,
				company: exp.company || null,
				description: exp.description || null,
				start_date: exp.start_date || null,
				end_date: exp.end_date || null,
				current: exp.current || false,
				location: exp.location || null,
				skills: exp.skills || null,
			}))
			await setupExperiences(experienceToSave)

			// save projects (bulk replace).
			const projectsToSave = resumeData.projects.map(proj => ({
				title: proj.title || null,
				description: proj.description || null,
				tech_stack: Array.isArray(proj.tech_stack) && proj.tech_stack.length > 0 ? proj.tech_stack : null,
				url: proj.url || null,
			}))
			await setupProjects(projectsToSave)

			const skillsToSave = resumeData.skills.map(skill => ({
				name: skill.name || null,
				category: skill.category || null,
			}))
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
				const userData = responseData.user
				setUser(userData)
				// --- set initial header data.
				const initialHeader = {
					first_name: userData.first_name,
					last_name: userData.last_name,
					email: userData.email,
					phone: responseData.contact?.phone || '',
					location: responseData.contact?.location || '',
					linkedin: responseData.contact?.linkedin || '',
					github: responseData.contact?.github || '',
					portfolio: responseData.contact?.portfolio || '',
					visibility: {
						showPhone: true,
						showLocation: true,
						showLinkedin: true,
						showGithub: true,
						showPortfolio: true,
					},
				}

				const initialEducation = responseData.education.map(edu => ({
					school: edu.school || '',
					degree: edu.degree || '',
					discipline: edu.discipline || '',
					location: edu.location || '',
					start_date: formatDateForInput(edu.start_date),
					end_date: formatDateForInput(edu.end_date),
					current: edu.current || false,
					gpa: edu.gpa || '',
					minor: edu.minor || '',
					subsections: edu.subsections || {},
				}))

				const initialExperience = responseData.experiences.map(exp => ({
					title: exp.title || '',
					company: exp.company || '',
					description: exp.description || '',
					start_date: formatDateForInput(exp.start_date),
					end_date: formatDateForInput(exp.end_date),
					current: exp.current || false,
					location: exp.location || '',
					skills: exp.skills || '',
				}))

				const initialProjects = responseData.projects.map(proj => ({
					title: proj.title || '',
					description: proj.description || '',
					tech_stack: Array.isArray(proj.tech_stack) ? proj.tech_stack : (proj.tech_stack ? [proj.tech_stack] : []),
					url: proj.url || '',
				}))

				const initialSkills = (responseData.skills || []).map(skill => ({
					name: skill.name || '',
					category: skill.category || '',
				}))

				const initialSummary = responseData.summary 
					? { summary: responseData.summary.summary || '' }
					: { summary: '' }
				
				// ---set all data at once.
				setHeaderData(initialHeader)
				setEducationData(initialEducation)
				setExperienceData(initialExperience)
				setProjectsData(initialProjects)
				setSkillsData(initialSkills)
				setSummaryData(initialSummary)
				setResumeData({
					header: initialHeader,
					education: initialEducation,
					experience: initialExperience,
					projects: initialProjects,
					skills: initialSkills,
					summary: initialSummary,
				})
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

	// generate preview on data change.
	useEffect(() => {
		setIsGeneratingPreview(true)

		const timer = setTimeout(async () => {
			try {
				// --- apply visibility filters for preview, then generate preview, and set preview.
				const previewData = applyVisibilityFilters(resumeData)
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
		<div className="h-screen flex flex-col bg-cream overflow-hidden">
			<header className="bg-brand-pink text-white py-4 shadow-md">
				<div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
					<h1 className="text-2xl font-bold">Resume</h1>
					<button
						type="button"
						onClick={() => navigate('/home')}
						className="px-4 py-2 bg-white-bright text-brand-pink font-semibold rounded-lg hover:opacity-90 transition-all"
					>
						← Back
					</button>
				</div>
			</header>

			<main className="flex-1 flex overflow-hidden min-h-0">
				
				{/* left panel : inputs / controls */}
				<aside style = {{ width: `${leftPanelWidth}px` }} className="flex-shrink-0 bg-white-bright border-r border-gray-200 p-6 overflow-y-auto">
					{/* save changes banner */}
					{showSaveBanner && (
						<div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-4">
							<div className="flex items-center justify-between mb-2">
								<span className="text-yellow-800 font-medium text-sm">You have unsaved changes</span>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={handleDiscardChanges}
										disabled={isSaving}
										className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
									>
										Discard
									</button>
									<button
										type="button"
										onClick={handleSaveChanges}
										disabled={isSaving}
										className="px-3 py-1.5 text-sm bg-brand-pink text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
									>
										{isSaving ? 'Saving...' : 'Save Changes'}
									</button>
								</div>
							</div>
							{changeDescriptions.length > 0 && (
								<div className="text-xs text-yellow-700 space-y-1">
									{changeDescriptions.map((desc, idx) => (
										<div key={idx}>• {desc}</div>
									))}
								</div>
							)}
						</div>
					)}

					{ welcomeMessage && (
						<div className="flex flex-col gap-0.5 p-3 border-[2px] rounded-md border-brand-pink-light mb-4 relative">
							<h2 className="text-[1.25rem] font-semibold text-gray-900 mb-1">
								{user?.first_name ? `Hey, ${user.first_name}! 👋` : 'Hey there! 👋'}
							</h2>
							<span className="text-[0.875rem] text-gray-500">Welcome to the <b>Builder</b>! This is where you will customize your resume.</span>
							<span className="text-[0.875rem] text-gray-500">We’ve filled in what we know. Feel free to tweak or add anything. 😄</span>
							<button
								type="button"
								onClick={() => setWelcomeMessage(false)}
								className="absolute top-2 right-2 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
							>
								<XIcon />
							</button>
						</div>
					)}

					<div className="flex flex-col gap-2 mb-4">
						<label className="block text-sm font-medium text-gray-700 mb-1">Template</label>	
                        <select
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                            disabled={isLoadingTemplates}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent bg-white"
                        >
                            {availableTemplates.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
					</div>
					
					{/* resume header section */}
					{headerData && (
						<ResumeHeader 
							headerData={headerData}
							onHeaderChange={handleHeaderChange}
						/>
					)}
					
					{/* education section */}
					{educationData && (
						<Education 
							educationData={educationData}
							onEducationChange={handleEducationChange}
						/>
					)}

					
					{experienceData && (
						<Experience 
							experienceData={experienceData}
							onExperienceChange={handleExperienceChange}
						/>
					)}

					{projectsData && (
						<Projects 
							projectsData={projectsData}
							onProjectsChange={handleProjectsChange}
						/>
					)}

					{skillsData && (
						<Skills 
							skillsData={skillsData}
							onSkillsChange={handleSkillsChange}
						/>
					)}

					{summaryData && (
						<Summary 
							summaryData={summaryData}
							onSummaryChange={handleSummaryChange}
						/>
					)}
					<div className="mt-6 flex gap-2">
						<button
							type="button"
							disabled
							className="flex-1 px-4 py-2 bg-brand-pink text-white font-semibold rounded-lg opacity-50 cursor-not-allowed"
							title="Coming next"
						>
							Preview
						</button>
						<button
							type="button"
							disabled
							className="flex-1 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg opacity-50 cursor-not-allowed"
							title="Coming next"
						>
							Download
						</button>
					</div>
				</aside>

				{/* resizable divider */}
				<div
					onMouseDown={handleMouseDown}
					className={`w-1 bg-gray-300 hover:bg-brand-pink cursor-col-resize transition-colors ${isResizing ? 'bg-brand-pink' : ''}`}
				/>
				
				{/* right panel : preview placeholder */}
				<section className="flex-1 bg-gray-50 overflow-hidden p-4 flex flex-col">
					{/* control buttons */}
					<div className="flex items-center justify-end flex-shrink-0">
						<button
							type="button"
							className="px-2 py-1 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
							onClick={handleDownloadPDF}
							disabled={isDownloadingPDF}
						>
							<FontAwesomeIcon icon={faDownload} />
						</button>
						<button
							type="button"
							className="px-2 py-1 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
							onClick={handleRefreshPreview}
						>
							<FontAwesomeIcon icon={faRefresh} />
						</button>
					</div>
					<div className="mt-4 flex-1 rounded-lg border-2 border-dashed border-gray-300 p-8 overflow-hidden bg-gray-100 min-h-0">
						{isGeneratingPreview ? (
							<div className="flex items-center justify-center h-full">
								<p className="text-gray-500">Generating preview...</p>
							</div>
						) : previewHtml ? (
							<div className="w-full h-full flex items-center justify-center box-shadow">
								<div className="w-full h-[100%] overflow-auto">
									<iframe 
										srcDoc={previewHtml}
										className="w-full h-[100%] rounded-lg"
										title="Resume Preview"
									/>
								</div>
							</div>
						) : (
							<div className="flex items-center justify-center h-full text-gray-500">
								Resume preview will render here.
							</div>
						)}
					</div>
				</section>
			</main>
		</div>
	)
}

export default ResumePreview

