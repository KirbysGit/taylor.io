import React, { useEffect, useState, useRef } from 'react'
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
import {
	normalizeEducationForBackend,
	normalizeExperienceForBackend,
	normalizeProjectForBackend,
	normalizeSkillForBackend,
	filterEmptyEducation,
	filterEmptyExperiences,
	filterEmptyProjects,
	filterEmptySkills,
} from '@/pages/utils/DataFormatting'

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`
const DEBOUNCE_MS = 2000

// deep equality via JSON (simple; handles our data shapes)
const snap = (x) => JSON.stringify(x)
const isEqual = (a, b) => snap(a) === snap(b)

function Info() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [savingSection, setSavingSection] = useState(null)
	const [isParsingResume, setIsParsingResume] = useState(false)
	const [parseResumeError, setParseResumeError] = useState('')

	// last-saved snapshots for dirty check
	const lastSavedRef = useRef(null)
	const debounceRefs = useRef({})

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

	// ref with latest state so debounced save handlers avoid stale closures
	const stateRef = useRef({ contact, education, experiences, projects, skills, summary })
	stateRef.current = { contact, education, experiences, projects, skills, summary }

	// snapshot of data before resume merge (for "undo" when detaching)
	const preResumeSnapshotRef = useRef(null)
	const [showDetachModal, setShowDetachModal] = useState(false)

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

				// Contact - build once so state and lastSavedRef match
				const contactData = data.contact || {}
				const contactState = {
					email: contactData.email || '',
					phone: contactData.phone || '',
					github: contactData.github || '',
					linkedin: contactData.linkedin || '',
					portfolio: contactData.portfolio || '',
					location: contactData.location || '',
				}
				setContact(contactState)

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

				// store last-saved snapshots for dirty check
				const edu = (data.education || []).map(transformEducationForStep)
				edu.forEach(e => {
					if (!e.subsections || Object.keys(e.subsections || {}).length === 0) e.subsections = {}
				})
				// lastSavedRef must match state shape exactly (no extra API fields like id, user_id)
				lastSavedRef.current = {
					contact: contactState,
					education: JSON.parse(JSON.stringify(edu)),
					experiences: JSON.parse(JSON.stringify((data.experiences || []).map(transformExperienceForStep))),
					projects: JSON.parse(JSON.stringify((data.projects || []).map(transformProjectForStep))),
					skills: JSON.parse(JSON.stringify((data.skills || []).map(transformSkillForStep))),
					summary: (data.summary?.summary || ''),
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

	// debounced auto-save: schedule save for section after DEBOUNCE_MS
	const scheduleDebouncedSave = (section) => {
		const refs = debounceRefs.current
		if (refs[section]) clearTimeout(refs[section])
		refs[section] = setTimeout(() => {
			refs[section] = null
			if (section === 'contact') handleContactSave()
			else if (section === 'education') handleEducationSave()
			else if (section === 'experiences') handleExperienceSave()
			else if (section === 'projects') handleProjectSave()
			else if (section === 'skills') handleSkillSave()
			else if (section === 'summary') handleSummarySave()
		}, DEBOUNCE_MS)
	}

	// dirty check: any section differs from last saved
	const isDirty = () => {
		if (!lastSavedRef.current) return false
		const s = lastSavedRef.current
		return (
			!isEqual(contact, s.contact) ||
			!isEqual(education, s.education) ||
			!isEqual(experiences, s.experiences) ||
			!isEqual(projects, s.projects) ||
			!isEqual(skills, s.skills) ||
			!isEqual(summary, s.summary)
		)
	}

	// save all dirty sections (for navigation/leave)
	const saveAllDirty = async () => {
		if (!lastSavedRef.current) return
		const s = lastSavedRef.current
		const promises = []
		if (!isEqual(contact, s.contact)) promises.push(upsertContact(contact).then(() => { s.contact = JSON.parse(JSON.stringify(contact)) }))
		if (!isEqual(education, s.education)) {
			const payload = filterEmptyEducation(education).map(e => normalizeEducationForBackend(transformEducationForBackend(e)))
			promises.push(setupEducation(payload).then(() => { s.education = JSON.parse(JSON.stringify(education)) }))
		}
		if (!isEqual(experiences, s.experiences)) {
			const payload = filterEmptyExperiences(experiences).map(e => normalizeExperienceForBackend(transformExperienceForBackend(e)))
			promises.push(setupExperiences(payload).then(() => { s.experiences = JSON.parse(JSON.stringify(experiences)) }))
		}
		if (!isEqual(projects, s.projects)) {
			const payload = filterEmptyProjects(projects).map(p => normalizeProjectForBackend(transformProjectForBackend(p)))
			promises.push(setupProjects(payload).then(() => { s.projects = JSON.parse(JSON.stringify(projects)) }))
		}
		if (!isEqual(skills, s.skills)) {
			const payload = filterEmptySkills(skills).map(normalizeSkillForBackend)
			promises.push(setupSkills(payload).then(() => { s.skills = JSON.parse(JSON.stringify(skills)) }))
		}
		if (!isEqual(summary, s.summary)) {
			promises.push(createSummary({ summary }).then(() => { s.summary = summary }))
		}
		await Promise.all(promises)
	}

	// Contact handlers
	const handleContactUpdate = (field, value) => {
		setContact(prev => ({ ...prev, [field]: value }))
		scheduleDebouncedSave('contact')
	}

	const handleContactSave = async () => {
		setSavingSection('contact')
		const c = stateRef.current.contact
		try {
			await upsertContact(c)
			if (lastSavedRef.current) lastSavedRef.current.contact = JSON.parse(JSON.stringify(c))
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
			subsections: newEdu.subsections || {},
		}
		setEducation(prev => [...prev, edu])
		scheduleDebouncedSave('education')
	}

	const handleEducationRemove = (index) => {
		setEducation(prev => prev.filter((_, i) => i !== index))
		scheduleDebouncedSave('education')
	}

	const handleEducationUpdate = (index, updatedEdu) => {
		setEducation(prev => {
			const newEdu = [...prev]
			newEdu[index] = { ...newEdu[index], ...updatedEdu }
			return newEdu
		})
		scheduleDebouncedSave('education')
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
		scheduleDebouncedSave('education')
	}

	const handleEducationSave = async () => {
		setSavingSection('education')
		const edu = stateRef.current.education
		try {
			const payload = filterEmptyEducation(edu).map(e => {
				const transformed = transformEducationForBackend(e)
				return normalizeEducationForBackend(transformed)
			})
			await setupEducation(payload)
			if (lastSavedRef.current) lastSavedRef.current.education = JSON.parse(JSON.stringify(edu))
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
		scheduleDebouncedSave('experiences')
	}

	const handleExperienceRemove = (index) => {
		setExperiences(prev => prev.filter((_, i) => i !== index))
		scheduleDebouncedSave('experiences')
	}

	const handleExperienceUpdate = (index, updatedExp) => {
		setExperiences(prev => {
			const newExp = [...prev]
			newExp[index] = { ...newExp[index], ...updatedExp }
			return newExp
		})
		scheduleDebouncedSave('experiences')
	}

	const handleExperienceSave = async () => {
		setSavingSection('experiences')
		const exp = stateRef.current.experiences
		try {
			const payload = filterEmptyExperiences(exp).map(e => {
				const transformed = transformExperienceForBackend(e)
				return normalizeExperienceForBackend(transformed)
			})
			await setupExperiences(payload)
			if (lastSavedRef.current) lastSavedRef.current.experiences = JSON.parse(JSON.stringify(exp))
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
		scheduleDebouncedSave('projects')
	}

	const handleProjectRemove = (index) => {
		setProjects(prev => prev.filter((_, i) => i !== index))
		scheduleDebouncedSave('projects')
	}

	const handleProjectUpdate = (index, updatedProj) => {
		setProjects(prev => {
			const newProj = [...prev]
			newProj[index] = { ...newProj[index], ...updatedProj }
			return newProj
		})
		scheduleDebouncedSave('projects')
	}

	const handleProjectSave = async () => {
		setSavingSection('projects')
		const proj = stateRef.current.projects
		try {
			const payload = filterEmptyProjects(proj).map(p => {
				const transformed = transformProjectForBackend(p)
				return normalizeProjectForBackend(transformed)
			})
			await setupProjects(payload)
			if (lastSavedRef.current) lastSavedRef.current.projects = JSON.parse(JSON.stringify(proj))
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
		scheduleDebouncedSave('skills')
	}

	const handleSkillRemove = (index) => {
		setSkills(prev => prev.filter((_, i) => i !== index))
		scheduleDebouncedSave('skills')
	}

	const handleSkillUpdate = (index, updatedSkill) => {
		setSkills(prev => {
			const newSkills = [...prev]
			newSkills[index] = { ...newSkills[index], ...updatedSkill }
			return newSkills
		})
		scheduleDebouncedSave('skills')
	}

	const handleSkillReorder = (fromIndex, toIndex) => {
		if (fromIndex === toIndex) return
		setSkills(prev => {
			const arr = [...prev]
			const [removed] = arr.splice(fromIndex, 1)
			const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex
			arr.splice(insertAt, 0, removed)
			return arr
		})
		scheduleDebouncedSave('skills')
	}

	const handleSkillSave = async () => {
		setSavingSection('skills')
		const sk = stateRef.current.skills
		try {
			const payload = filterEmptySkills(sk).map(normalizeSkillForBackend)
			await setupSkills(payload)
			if (lastSavedRef.current) lastSavedRef.current.skills = JSON.parse(JSON.stringify(sk))
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
		scheduleDebouncedSave('summary')
	}

	const handleSummarySave = async () => {
		setSavingSection('summary')
		const sum = stateRef.current.summary
		try {
			await createSummary({ summary: sum })
			if (lastSavedRef.current) lastSavedRef.current.summary = sum
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
			// save snapshot before merge so user can undo if they detach
			const s = stateRef.current
			preResumeSnapshotRef.current = {
				contact: JSON.parse(JSON.stringify(s.contact)),
				education: JSON.parse(JSON.stringify(s.education)),
				experiences: JSON.parse(JSON.stringify(s.experiences)),
				projects: JSON.parse(JSON.stringify(s.projects)),
				skills: JSON.parse(JSON.stringify(s.skills)),
				summary: JSON.parse(JSON.stringify(s.summary)),
			}
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
			// schedule auto-save for all merged sections (we're now dirty)
			;['contact', 'education', 'experiences', 'projects', 'skills', 'summary'].forEach(scheduleDebouncedSave)
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

	const handleDetachResumeClick = () => {
		setShowDetachModal(true)
	}

	const handleDetachWithUndo = async () => {
		setShowDetachModal(false)
		const snapshot = preResumeSnapshotRef.current
		try {
			await detachResume()
			if (snapshot) {
				setContact(snapshot.contact)
				setEducation(snapshot.education)
				setExperiences(snapshot.experiences)
				setProjects(snapshot.projects)
				setSkills(snapshot.skills)
				setSummary(snapshot.summary)
			}
			preResumeSnapshotRef.current = null
			setUser(prev => prev ? { ...prev, attached_resume_filename: null, attached_resume_uploaded_at: null } : null)
			toast.success('Resume removed. Your data has been restored to before the upload.')
		} catch (err) {
			console.error('Detach failed:', err)
			toast.error('Failed to detach resume.')
		}
	}

	const handleDetachKeepData = async () => {
		setShowDetachModal(false)
		try {
			await detachResume()
			preResumeSnapshotRef.current = null
			setUser(prev => prev ? { ...prev, attached_resume_filename: null, attached_resume_uploaded_at: null } : null)
			toast.success('Resume removed. Your data is unchanged. You can upload a new resume anytime.')
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

	// beforeunload: prompt when dirty (tab close / refresh)
	useEffect(() => {
		const onBeforeUnload = (e) => {
			if (isDirty()) {
				e.preventDefault()
			}
		}
		window.addEventListener('beforeunload', onBeforeUnload)
		return () => window.removeEventListener('beforeunload', onBeforeUnload)
	}, [contact, education, experiences, projects, skills, summary])

	// clear debounce timers on unmount
	useEffect(() => {
		return () => {
			Object.values(debounceRefs.current).forEach((id) => id && clearTimeout(id))
		}
	}, [])

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
			<TopNav
				user={user}
				onLogout={handleLogout}
				onBeforeNavigate={async () => {
					if (isDirty()) {
						await saveAllDirty()
						toast.success('Your changes have been saved.')
					}
				}}
			/>

			<main className="flex-1 py-8 bg-cream">
				<div className="max-w-7xl mx-auto px-6 flex gap-8">
					{/* Sidebar Navigation */}
					<aside className="w-48 flex-shrink-0 sticky top-24 self-start space-y-3">
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
						{/* Save status indicator */}
						<div className="bg-white-bright rounded-xl p-3 border-2 border-gray-200 shadow-sm">
							{savingSection ? (
								<div className="flex items-center gap-2 text-sm text-brand-pink">
									<svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
									</svg>
									<span>Saving...</span>
								</div>
							) : isDirty() ? (
								<div className="flex items-center gap-2 text-sm text-amber-600">
									<svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span>Unsaved changes</span>
								</div>
							) : (
								<div className="flex items-center gap-2 text-sm text-green-600">
									<svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span>Up to date</span>
								</div>
							)}
						</div>
					</aside>

					{/* Main Content */}
					<div className="flex-1 max-w-4xl space-y-8">
						{/* Header */}
						<div>
							<h1 className="text-3xl font-bold text-gray-900 mb-2">Your Information</h1>
							<p className="text-gray-600">Review and update your profile details. Changes auto-save after a short delay, or when you leave the page.</p>
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
									onClick={handleDetachResumeClick}
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
							<ContactSection contact={contact} onUpdate={handleContactUpdate} />
						</div>

						{/* Education Section */}
						<div id="education-section">
							<EducationSection
								education={education}
								onAdd={handleEducationAdd}
								onRemove={handleEducationRemove}
								onUpdate={handleEducationUpdate}
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
							/>
						</div>

						{/* Projects Section */}
						<div id="projects-section">
							<ProjectsSection
								projects={projects}
								onAdd={handleProjectAdd}
								onRemove={handleProjectRemove}
								onUpdate={handleProjectUpdate}
							/>
						</div>

						{/* Skills Section */}
						<div id="skills-section">
							<SkillsSection
								skills={skills}
								onAdd={handleSkillAdd}
								onRemove={handleSkillRemove}
								onUpdate={handleSkillUpdate}
								onReorder={handleSkillReorder}
							/>
						</div>

						{/* Summary Section */}
						<div id="summary-section">
							<SummarySection summary={summary} onUpdate={handleSummaryUpdate} />
						</div>
					</div>
				</div>
			</main>

			{/* Detach Resume Modal */}
			{showDetachModal && (
				<div className="fixed inset-0 flex items-center justify-center z-50">
					<div className="fixed inset-0 bg-black/50" onClick={() => setShowDetachModal(false)} aria-hidden />
					<div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-2">Remove attached resume?</h3>
						<p className="text-gray-600 text-sm mb-6">
							{preResumeSnapshotRef.current
								? 'Did you upload the wrong resume? You can undo the changes it made, or keep your current data and upload a new resume.'
								: 'Your data will stay as-is. You can upload a new resume anytime.'}
						</p>
						<div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
							<button
								type="button"
								onClick={() => setShowDetachModal(false)}
								className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
							>
								Cancel
							</button>
							{preResumeSnapshotRef.current && (
								<button
									type="button"
									onClick={handleDetachWithUndo}
									className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
								>
									Undo changes from this resume
								</button>
							)}
							<button
								type="button"
								onClick={handleDetachKeepData}
								className="px-4 py-2 text-sm font-medium bg-brand-pink text-white hover:opacity-90 rounded-lg transition-colors"
							>
								{preResumeSnapshotRef.current ? 'Keep current data & remove' : 'Remove attachment'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default Info
