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
} from '@/api/services/profile'
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
				setUser(JSON.parse(userData))
				const response = await getMyProfile()
				const data = response.data || {}
				
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

	// Scroll to section handler
	const scrollToSection = (sectionId) => {
		const element = document.getElementById(sectionId)
		if (element) {
			const offset = 100 // offset for fixed header/nav
			const elementPosition = element.getBoundingClientRect().top
			const offsetPosition = elementPosition + window.pageYOffset - offset

			window.scrollTo({
				top: offsetPosition,
				behavior: 'smooth'
			})
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
