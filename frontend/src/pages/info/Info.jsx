import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
	getMyProfile,
	upsertContact,
	setupEducation,
	setupExperiences,
	setupProjects,
	setupSkills,
	createSummary,
	attachResume,
	detachResume,
} from '@/api/services/profile'
import { parseResumeMerge } from '@/api/services/resume'
import { mergeParsedData } from './utils/mergeParsedData'
import TopNav from '@/components/TopNav'
import ContactSection from './components/ContactSection'
import EducationSection from './components/EducationSection'
import ExperienceSection from './components/ExperienceSection'
import ProjectsSection from './components/ProjectsSection'
import SkillsSection from './components/SkillsSection'
import SummarySection from './components/SummarySection'
import {
	transformEducationForStep,
	transformEducationForBackend,
	transformExperienceForStep,
	transformExperienceForBackend,
	transformProjectForStep,
	transformProjectForBackend,
	transformSkillForStep,
} from './utils/dataTransform'
import { normalizeEducationForBackend, normalizeExperienceForBackend, normalizeProjectForBackend, normalizeSkillForBackend } from '@/pages/utils/DataFormatting'

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

function Info() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [savingSection, setSavingSection] = useState(null)
	const [isParsingResume, setIsParsingResume] = useState(false)
	const [parseResumeError, setParseResumeError] = useState('')

	// State - all in step component format
	const [contact, setContact] = useState({
		email: '',
		phone: '',
		github: '',
		linkedin: '',
		portfolio: '',
		location: '',
	})
	const [education, setEducation] = useState([])
	const [experiences, setExperiences] = useState([])
	const [projects, setProjects] = useState([])
	const [skills, setSkills] = useState([])
	const [summary, setSummary] = useState('')

	// Fetch profile data
	useEffect(() => {
		const fetchProfile = async () => {
			const token = localStorage.getItem('token')
			const userData = localStorage.getItem('user')
			if (!token || !userData) {
				navigate('/auth')
				return
			}

			try {
				const response = await getMyProfile()
				const data = response.data || {}
				setUser(data.user || JSON.parse(userData))

				// Contact
				const contactData = data.contact || {}
				setContact({
					email: contactData.email || '',
					phone: contactData.phone || '',
					github: contactData.github || '',
					linkedin: contactData.linkedin || '',
					portfolio: contactData.portfolio || '',
					location: contactData.location || '',
				})

				// Education - transform to step format
				if (data.education && data.education.length) {
					const edu = data.education.map(transformEducationForStep)
					// Add default subsection for entries without one
					edu.forEach(e => {
						if (!e.subsections || Object.keys(e.subsections).length === 0) {
							e.subsections = {}
						}
					})
					setEducation(edu)
				}

				// Experiences - transform to step format
				if (data.experiences && data.experiences.length) {
					setExperiences(data.experiences.map(transformExperienceForStep))
				}

				// Projects - transform to step format
				if (data.projects && data.projects.length) {
					setProjects(data.projects.map(transformProjectForStep))
				}

				// Skills
				if (data.skills && data.skills.length) {
					setSkills(data.skills.map(transformSkillForStep))
				}

				// Summary
				if (data.summary) {
					setSummary(data.summary.summary || '')
				}
			} catch (error) {
				console.error('Error fetching profile:', error)
				try {
					setUser(JSON.parse(localStorage.getItem('user') || '{}'))
				} catch {
					navigate('/auth')
				}
			} finally {
				setIsLoading(false)
			}
		}

		fetchProfile()
	}, [navigate])

	const handleLogout = () => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}

	// Contact handlers
	const handleContactUpdate = (field, value) => {
		setContact(prev => ({ ...prev, [field]: value }))
	}

	const handleContactSave = async () => {
		setSavingSection('contact')
		try {
			await upsertContact(contact)
			toast.success('Contact information saved!')
		} catch (error) {
			console.error('Error saving contact:', error)
			toast.error('Failed to save contact info.')
		} finally {
			setSavingSection(null)
		}
	}

	// Education handlers
	const handleEducationAdd = (newEdu) => {
		const edu = {
			...newEdu,
			id: newEdu.id || newId(),
			subsections: newEdu.subsections || { 'Relevant Coursework': '' },
		}
		setEducation(prev => [...prev, edu])
	}

	const handleEducationRemove = (index) => {
		setEducation(prev => prev.filter((_, i) => i !== index))
	}

	const handleEducationUpdate = (index, updatedEdu) => {
		setEducation(prev => {
			const newEdu = [...prev]
			newEdu[index] = { ...newEdu[index], ...updatedEdu }
			return newEdu
		})
	}

	const handleSubsectionUpdate = (action, eduIndex, oldTitle, newValue) => {
		setEducation(prev => {
			const newEdu = [...prev]
			const edu = newEdu[eduIndex]
			const subsections = { ...(edu.subsections || {}) }

			if (action === 'add') {
				const newTitle = `New Section ${Object.keys(subsections).length + 1}`
				subsections[newTitle] = ''
			} else if (action === 'remove') {
				delete subsections[oldTitle]
			} else if (action === 'rename') {
				if (newValue.trim() && newValue !== oldTitle) {
					const content = subsections[oldTitle] || ''
					delete subsections[oldTitle]
					subsections[newValue.trim()] = content
				}
			} else if (action === 'content') {
				subsections[oldTitle] = newValue
			}

			newEdu[eduIndex] = { ...edu, subsections }
			return newEdu
		})
	}

	const handleEducationSave = async () => {
		setSavingSection('education')
		try {
			const payload = education
				.filter((edu) => edu.school || edu.degree)
				.map(edu => {
					const transformed = transformEducationForBackend(edu)
					return normalizeEducationForBackend(transformed)
				})
			await setupEducation(payload)
			toast.success('Education saved successfully!')
		} catch (error) {
			console.error('Error saving education:', error)
			toast.error('Failed to save education.')
		} finally {
			setSavingSection(null)
		}
	}

	// Experience handlers
	const handleExperienceAdd = (newExp) => {
		setExperiences(prev => [...prev, { ...newExp, id: newExp.id || newId() }])
	}

	const handleExperienceRemove = (index) => {
		setExperiences(prev => prev.filter((_, i) => i !== index))
	}

	const handleExperienceUpdate = (index, updatedExp) => {
		setExperiences(prev => {
			const newExp = [...prev]
			newExp[index] = { ...newExp[index], ...updatedExp }
			return newExp
		})
	}

	const handleExperienceSave = async () => {
		setSavingSection('experiences')
		try {
			const payload = experiences
				.filter((exp) => exp.title || exp.company)
				.map(exp => {
					const transformed = transformExperienceForBackend(exp)
					return normalizeExperienceForBackend(transformed)
				})
			await setupExperiences(payload)
			toast.success('Experiences saved successfully!')
		} catch (error) {
			console.error('Error saving experiences:', error)
			toast.error('Failed to save experiences.')
		} finally {
			setSavingSection(null)
		}
	}

	// Project handlers
	const handleProjectAdd = (newProj) => {
		setProjects(prev => [...prev, { ...newProj, id: newProj.id || newId() }])
	}

	const handleProjectRemove = (index) => {
		setProjects(prev => prev.filter((_, i) => i !== index))
	}

	const handleProjectUpdate = (index, updatedProj) => {
		setProjects(prev => {
			const newProj = [...prev]
			newProj[index] = { ...newProj[index], ...updatedProj }
			return newProj
		})
	}

	const handleProjectSave = async () => {
		setSavingSection('projects')
		try {
			const payload = projects
				.filter((proj) => proj.title)
				.map(proj => {
					const transformed = transformProjectForBackend(proj)
					return normalizeProjectForBackend(transformed)
				})
			await setupProjects(payload)
			toast.success('Projects saved successfully!')
		} catch (error) {
			console.error('Error saving projects:', error)
			toast.error('Failed to save projects.')
		} finally {
			setSavingSection(null)
		}
	}

	// Skills handlers
	const handleSkillAdd = (skill) => {
		setSkills(prev => [...prev, { ...skill, id: skill.id || newId() }])
	}

	const handleSkillRemove = (index) => {
		setSkills(prev => prev.filter((_, i) => i !== index))
	}

	const handleSkillUpdate = (index, updatedSkill) => {
		setSkills(prev => {
			const newSkills = [...prev]
			newSkills[index] = { ...newSkills[index], ...updatedSkill }
			return newSkills
		})
	}

	const handleSkillSave = async () => {
		setSavingSection('skills')
		try {
			const payload = skills
				.filter((s) => s.name.trim())
				.map(normalizeSkillForBackend)
			await setupSkills(payload)
			toast.success('Skills saved successfully!')
		} catch (error) {
			console.error('Error saving skills:', error)
			toast.error('Failed to save skills.')
		} finally {
			setSavingSection(null)
		}
	}

	// Summary handler
	const handleSummaryUpdate = (value) => {
		setSummary(value)
	}

	const handleSummarySave = async () => {
		setSavingSection('summary')
		try {
			await createSummary({ summary })
			toast.success('Summary saved successfully!')
		} catch (error) {
			console.error('Error saving summary:', error)
			toast.error('Failed to save summary.')
		} finally {
			setSavingSection(null)
		}
	}

	// Resume upload / attach handlers
	const handleResumeUpload = async (file) => {
		const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
		const validExtensions = ['.pdf', '.docx', '.doc']
		const ext = '.' + (file.name || '').split('.').pop().toLowerCase()
		if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
			setParseResumeError('Invalid file type. Please upload a PDF or DOCX file.')
			return
		}
		if (file.size > 10 * 1024 * 1024) {
			setParseResumeError('File too large. Please upload a file smaller than 10MB.')
			return
		}
		setParseResumeError('')
		setIsParsingResume(true)
		try {
			const res = await parseResumeMerge(file)
			const parsed = res.data || res
			const existing = { contact, education, experiences, projects, skills, summary }
			const { merged, counts } = mergeParsedData(parsed, existing)
			setContact(merged.contact)
			setEducation(merged.education)
			setExperiences(merged.experiences)
			setProjects(merged.projects)
			setSkills(merged.skills)
			setSummary(merged.summary)
			await attachResume(file.name)
			setUser(prev => prev ? { ...prev, attached_resume_filename: file.name, attached_resume_uploaded_at: new Date().toISOString() } : null)
			const total = counts.education + counts.experiences + counts.projects + counts.skills
			toast.success(total > 0 ? `Resume parsed. ${total} new item(s) added.` : 'Resume parsed. No new items (duplicates skipped).')
		} catch (err) {
			console.error('Resume parse failed:', err)
			setParseResumeError(err?.response?.data?.detail || 'Failed to parse resume. Please try again.')
			toast.error('Failed to parse resume.')
		} finally {
			setIsParsingResume(false)
		}
	}

	const handleDetachResume = async () => {
		try {
			await detachResume()
			setUser(prev => prev ? { ...prev, attached_resume_filename: null, attached_resume_uploaded_at: null } : null)
			toast.success('Resume detached. You can upload another.')
		} catch (err) {
			console.error('Detach failed:', err)
			toast.error('Failed to detach resume.')
		}
	}

	const handleResumeFileInput = (e) => {
		const file = e.target.files?.[0]
		if (file) handleResumeUpload(file)
		e.target.value = ''
	}

	// Scroll to section handler (scrolls the .info-scrollbar div, not the window)
	const scrollToSection = (sectionId) => {
		const scrollContainer = document.querySelector('.info-scrollbar')
		const element = document.getElementById(sectionId)
		if (scrollContainer && element) {
			const offset = 100 // offset for sticky header/nav
			const elementPosition = element.getBoundingClientRect().top
			const offsetPosition = elementPosition + scrollContainer.scrollTop - offset
			scrollContainer.scrollTo({ top: Math.max(0, offsetPosition), behavior: 'smooth' })
		}
	}

	if (isLoading) {
		return (
			<div className="min-h-screen flex flex-col bg-cream">
				<TopNav user={user} onLogout={handleLogout} />
				<main className="flex-1 py-12 bg-cream flex items-center justify-center">
					<p className="text-gray-600">Loading...</p>
				</main>
			</div>
		)
	}

	return (
		<div className="min-h-screen flex flex-col bg-cream info-scrollbar overflow-y-auto" style={{ height: '100vh' }}>
			<TopNav user={user} onLogout={handleLogout} />

			<main className="flex-1 py-8 bg-cream">
				<div className="max-w-7xl mx-auto px-6 flex gap-8">
					{/* Sidebar Navigation */}
					<aside className="w-48 flex-shrink-0 sticky top-24 self-start">
						<nav className="bg-white-bright rounded-xl p-4 border-2 border-gray-200 shadow-sm">
							<h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Quick Navigation</h3>
							<ul className="space-y-2">
								<li>
									<button
										onClick={() => scrollToSection('contact-section')}
										className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-pink hover:text-white rounded-lg transition-colors"
									>
										Contact
									</button>
								</li>
								<li>
									<button
										onClick={() => scrollToSection('education-section')}
										className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-pink hover:text-white rounded-lg transition-colors"
									>
										Education
									</button>
								</li>
								<li>
									<button
										onClick={() => scrollToSection('experience-section')}
										className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-pink hover:text-white rounded-lg transition-colors"
									>
										Experience
									</button>
								</li>
								<li>
									<button
										onClick={() => scrollToSection('projects-section')}
										className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-pink hover:text-white rounded-lg transition-colors"
									>
										Projects
									</button>
								</li>
								<li>
									<button
										onClick={() => scrollToSection('skills-section')}
										className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-pink hover:text-white rounded-lg transition-colors"
									>
										Skills
									</button>
								</li>
								<li>
									<button
										onClick={() => scrollToSection('summary-section')}
										className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-pink hover:text-white rounded-lg transition-colors"
									>
										Summary
									</button>
								</li>
							</ul>
						</nav>
					</aside>

					{/* Main Content */}
					<div className="flex-1 max-w-4xl space-y-8">
						{/* Header */}
						<div>
							<h1 className="text-3xl font-bold text-gray-900 mb-2">Your Information</h1>
							<p className="text-gray-600">Review and update your profile details. Each section can be saved independently.</p>
						</div>

						{/* Attached Resume Banner or Upload Zone */}
						{user?.attached_resume_filename ? (
							<div className="flex items-center justify-between p-4 bg-brand-pink/10 border-2 border-brand-pink/30 rounded-xl">
								<div className="flex items-center gap-3">
									<svg className="w-6 h-6 text-brand-pink flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									<div>
										<p className="font-semibold text-gray-900">Attached Resume</p>
										<p className="text-sm text-gray-600">{user.attached_resume_filename}</p>
									</div>
								</div>
								<button
									type="button"
									onClick={handleDetachResume}
									className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
								>
									Remove
								</button>
							</div>
						) : (
							<div
								className={`p-6 rounded-xl border-2 border-dashed transition-all ${
									isParsingResume ? 'border-brand-pink bg-brand-pink/5' : 'border-gray-300 hover:border-brand-pink/50 bg-gray-50/50'
								}`}
								onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
								onDrop={(e) => {
									e.preventDefault()
									const file = e.dataTransfer?.files?.[0]
									if (file && !isParsingResume) handleResumeUpload(file)
								}}
							>
								<p className="text-sm text-gray-600 mb-4">
									Upload a resume to quickly add education, experience, projects, and skills. Duplicates are skipped.
								</p>
								<input
									type="file"
									accept=".pdf,.docx,.doc"
									onChange={handleResumeFileInput}
									className="hidden"
									id="info-resume-upload"
									disabled={isParsingResume}
								/>
								<label
									htmlFor="info-resume-upload"
									className={`inline-flex items-center gap-2 px-6 py-3 border-2 font-semibold rounded-lg cursor-pointer transition-all ${
										isParsingResume
											? 'border-brand-pink bg-brand-pink/10 text-brand-pink'
											: 'border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white'
									}`}
								>
									{isParsingResume ? (
										<>
											<span className="flex gap-1">
												<span className="w-2 h-2 bg-brand-pink rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
												<span className="w-2 h-2 bg-brand-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
												<span className="w-2 h-2 bg-brand-pink rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
											</span>
											Parsing...
										</>
									) : (
										<>
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
											</svg>
											Upload Resume (PDF or DOCX)
										</>
									)}
								</label>
								{parseResumeError && (
									<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
										{parseResumeError}
									</div>
								)}
							</div>
						)}

						{/* Contact Section */}
						<div id="contact-section">
							<ContactSection
								contact={contact}
								onUpdate={handleContactUpdate}
								onSave={handleContactSave}
								isSaving={savingSection === 'contact'}
							/>
						</div>

						{/* Education Section */}
						<div id="education-section">
							<EducationSection
								education={education}
								onAdd={handleEducationAdd}
								onRemove={handleEducationRemove}
								onUpdate={handleEducationUpdate}
								onSave={handleEducationSave}
								isSaving={savingSection === 'education'}
								onSubsectionUpdate={handleSubsectionUpdate}
							/>
						</div>

						{/* Experience Section */}
						<div id="experience-section">
							<ExperienceSection
								experiences={experiences}
								onAdd={handleExperienceAdd}
								onRemove={handleExperienceRemove}
								onUpdate={handleExperienceUpdate}
								onSave={handleExperienceSave}
								isSaving={savingSection === 'experiences'}
							/>
						</div>

						{/* Projects Section */}
						<div id="projects-section">
							<ProjectsSection
								projects={projects}
								onAdd={handleProjectAdd}
								onRemove={handleProjectRemove}
								onUpdate={handleProjectUpdate}
								onSave={handleProjectSave}
								isSaving={savingSection === 'projects'}
							/>
						</div>

						{/* Skills Section */}
						<div id="skills-section">
							<SkillsSection
								skills={skills}
								onAdd={handleSkillAdd}
								onRemove={handleSkillRemove}
								onUpdate={handleSkillUpdate}
								onSave={handleSkillSave}
								isSaving={savingSection === 'skills'}
							/>
						</div>

						{/* Summary Section */}
						<div id="summary-section">
							<SummarySection
								summary={summary}
								onUpdate={handleSummaryUpdate}
								onSave={handleSummarySave}
								isSaving={savingSection === 'summary'}
							/>
						</div>
					</div>
				</div>
			</main>
		</div>
	)
}

export default Info
