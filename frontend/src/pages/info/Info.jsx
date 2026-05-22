import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { showThemedActionToast } from '@/components/notifications/ThemedToaster'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faBriefcase,
	faCheck,
	faChevronRight,
	faClockRotateLeft,
	faEye,
	faFileAlt,
	faGraduationCap,
	faLayerGroup,
	faPlus,
	faStar,
	faUser,
	faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
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
import DashboardShell from '@/components/DashboardShell'
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
const UNDO_TOAST_MS = 9000

// deep equality via JSON (simple; handles our data shapes)
const snap = (x) => JSON.stringify(x)
const isEqual = (a, b) => snap(a) === snap(b)

function insertRestoredItem(list, item, index) {
	const id = item?.id
	if (id != null && list.some((existing) => String(existing?.id) === String(id))) {
		return list
	}
	const next = [...list]
	next.splice(Math.min(Math.max(index, 0), next.length), 0, item)
	return next
}

function educationLabel(edu) {
	return edu?.school || edu?.degree || 'Education entry'
}

function experienceLabel(exp) {
	return [exp?.title, exp?.company].filter(Boolean).join(' at ') || 'Experience entry'
}

function projectLabel(project) {
	return project?.title || 'Project entry'
}

function skillLabel(skill) {
	return skill?.name || 'Skill'
}

function InfoCard({ className = '', children }) {
	return (
		<section className={`rounded-[1.35rem] border border-brand-pink/13 bg-white/78 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)] ring-1 ring-white/80 backdrop-blur-md ${className}`}>
			{children}
		</section>
	)
}

function CompletionRing({ value }) {
	const radius = 35
	const circumference = 2 * Math.PI * radius
	const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference

	return (
		<div className="relative size-24 shrink-0">
			<svg className="size-24 -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
				<circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(214,86,86,0.14)" strokeWidth="8" />
				<circle
					cx="44"
					cy="44"
					r={radius}
					fill="none"
					stroke="rgb(214,86,86)"
					strokeLinecap="round"
					strokeWidth="8"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
				/>
			</svg>
			<span className="absolute inset-0 flex items-center justify-center text-xl font-black text-gray-950">{value}%</span>
		</div>
	)
}

function OverviewRow({ item, onClick }) {
	const complete = item.count > 0
	const statusText = complete ? item.status : 'Add more'

	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex w-full items-center gap-4 rounded-[1.15rem] border border-brand-pink/10 bg-white/82 p-4 text-left shadow-[0_14px_34px_-30px_rgba(45,30,38,0.34)] transition hover:-translate-y-0.5 hover:border-brand-pink/24 hover:shadow-[0_18px_42px_-30px_rgba(214,86,86,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
		>
			<span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${item.bg} ${item.tone}`}>
				<FontAwesomeIcon icon={item.icon} className="size-5" />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block text-lg font-black tracking-tight text-gray-950">{item.title}</span>
				<span className="mt-0.5 block text-sm leading-relaxed text-gray-600">{item.description}</span>
			</span>
			<span className={`hidden rounded-full px-3 py-1.5 text-xs font-bold sm:inline-flex ${complete ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-pink/[0.08] text-brand-pink-dark'}`}>
				{statusText}
			</span>
			<FontAwesomeIcon icon={faChevronRight} className="size-4 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-brand-pink-dark" />
		</button>
	)
}

function Info() {
	const navigate = useNavigate()
	const location = useLocation()
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
		tagline: '',
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
					tagline: contactData.tagline || '',
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

	const showRemoveUndoToast = ({ title, detail, onUndo }) => {
		showThemedActionToast({
			variant: 'custom',
			title,
			detail,
			actionLabel: 'Undo',
			onAction: onUndo,
			duration: UNDO_TOAST_MS,
		})
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
		const removed = education[index]
		if (!removed) return
		setEducation(prev => prev.filter((_, i) => i !== index))
		scheduleDebouncedSave('education')
		showRemoveUndoToast({
			title: 'Education removed',
			detail: `${educationLabel(removed)} was removed from your profile.`,
			onUndo: () => {
				setEducation(prev => insertRestoredItem(prev, removed, index))
				scheduleDebouncedSave('education')
			},
		})
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
		const removed = experiences[index]
		if (!removed) return
		setExperiences(prev => prev.filter((_, i) => i !== index))
		scheduleDebouncedSave('experiences')
		showRemoveUndoToast({
			title: 'Experience removed',
			detail: `${experienceLabel(removed)} was removed from your profile.`,
			onUndo: () => {
				setExperiences(prev => insertRestoredItem(prev, removed, index))
				scheduleDebouncedSave('experiences')
			},
		})
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
		const removed = projects[index]
		if (!removed) return
		setProjects(prev => prev.filter((_, i) => i !== index))
		scheduleDebouncedSave('projects')
		showRemoveUndoToast({
			title: 'Project removed',
			detail: `${projectLabel(removed)} was removed from your profile.`,
			onUndo: () => {
				setProjects(prev => insertRestoredItem(prev, removed, index))
				scheduleDebouncedSave('projects')
			},
		})
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
		const removed = skills[index]
		if (!removed) return
		setSkills(prev => prev.filter((_, i) => i !== index))
		scheduleDebouncedSave('skills')
		showRemoveUndoToast({
			title: 'Skill removed',
			detail: `${skillLabel(removed)} was removed from your profile.`,
			onUndo: () => {
				setSkills(prev => insertRestoredItem(prev, removed, index))
				scheduleDebouncedSave('skills')
			},
		})
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

	// Deep link from Resume Preview: /info#experience-section etc.
	useEffect(() => {
		if (isLoading) return
		const hash = (location.hash || '').replace('#', '').trim()
		if (!hash) return
		const t = setTimeout(() => {
			const scrollContainer = document.querySelector('.info-scrollbar')
			const element = document.getElementById(hash)
			if (scrollContainer && element) {
				const offset = 100
				const elementPosition = element.getBoundingClientRect().top
				const offsetPosition = elementPosition + scrollContainer.scrollTop - offset
				scrollContainer.scrollTo({ top: Math.max(0, offsetPosition), behavior: 'smooth' })
			}
		}, 200)
		return () => clearTimeout(t)
	}, [isLoading, location.hash])

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

	const profileItems = [
		{
			id: 'experience-section',
			title: 'Work experience',
			description: 'Add your past roles, achievements, and key impact.',
			count: experiences.length,
			status: experiences.length > 0 ? `${experiences.length} saved` : 'Add roles',
			icon: faBriefcase,
			bg: 'bg-sky-100',
			tone: 'text-sky-700',
		},
		{
			id: 'education-section',
			title: 'Education',
			description: 'Add your schools, degrees, and relevant coursework.',
			count: education.length,
			status: education.length > 0 ? `${education.length} saved` : 'Add school',
			icon: faGraduationCap,
			bg: 'bg-emerald-100',
			tone: 'text-emerald-700',
		},
		{
			id: 'projects-section',
			title: 'Projects',
			description: 'Showcase projects that highlight your skills.',
			count: projects.length,
			status: projects.length > 0 ? `${projects.length} added` : 'Add projects',
			icon: faLayerGroup,
			bg: 'bg-violet-100',
			tone: 'text-violet-700',
		},
		{
			id: 'skills-section',
			title: 'Skills',
			description: 'Add your technical, soft, and tool expertise.',
			count: skills.length,
			status: skills.length > 0 ? `${skills.length} added` : 'Add skills',
			icon: faWandMagicSparkles,
			bg: 'bg-cyan-100',
			tone: 'text-cyan-700',
		},
		{
			id: 'summary-section',
			title: 'Summary',
			description: 'Write the profile summary Taylor can tailor from.',
			count: summary.trim() ? 1 : 0,
			status: summary.trim() ? 'Complete' : 'Add summary',
			icon: faStar,
			bg: 'bg-amber-100',
			tone: 'text-amber-700',
		},
		{
			id: 'contact-section',
			title: 'Personal info',
			description: 'Name, headline, location, links, and contact info.',
			count: Object.values(contact).some((value) => String(value || '').trim()) ? 1 : 0,
			status: Object.values(contact).some((value) => String(value || '').trim()) ? 'Complete' : 'Add contact',
			icon: faUser,
			bg: 'bg-rose-100',
			tone: 'text-rose-700',
		},
	]
	const completeCount = profileItems.filter((item) => item.count > 0).length
	const completeness = Math.round((completeCount / profileItems.length) * 100)
	const missingItem = profileItems.find((item) => item.count === 0)
	const summaryStats = [
		{ label: 'Experiences', value: experiences.length, icon: faBriefcase },
		{ label: 'Projects', value: projects.length, icon: faLayerGroup },
		{ label: 'Skills', value: skills.length, icon: faWandMagicSparkles },
		{ label: 'Education', value: education.length, icon: faGraduationCap },
		{ label: 'Resume', value: user?.attached_resume_filename ? 1 : 0, icon: faFileAlt },
	]
	const autoSaveLabel = savingSection ? 'Saving...' : isDirty() ? 'Autosave pending' : 'Up to date'

	if (isLoading) {
		return (
			<DashboardShell onLogout={handleLogout}>
				<div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
					<div className="rounded-[1.35rem] border border-brand-pink/13 bg-white/78 px-6 py-5 text-gray-600 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)]">
						<span className="mr-3 inline-block size-3 animate-pulse rounded-full bg-brand-pink/50" aria-hidden />
						Loading your profile...
					</div>
				</div>
			</DashboardShell>
		)
	}

	return (
		<>
			<DashboardShell
				onLogout={handleLogout}
				onBeforeNavigate={async () => {
					if (isDirty()) {
						await saveAllDirty()
						toast.success('Your changes have been saved.')
					}
				}}
			>
				<div className="mx-auto max-w-7xl">
					<header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<p className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink-dark">Information</p>
							<h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">Your information</h1>
							<p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600">
								Manage your profile. We&apos;ll use this to build tailored r&eacute;sum&eacute;s for any role.
							</p>
						</div>
						<button
							type="button"
							onClick={() => scrollToSection('summary-section')}
							className="inline-flex min-h-[3.15rem] items-center justify-center gap-2 rounded-xl border border-brand-pink/16 bg-white/82 px-5 py-3 text-sm font-black text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-pink/28 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
						>
							<FontAwesomeIcon icon={faEye} className="size-4" />
							Preview profile
						</button>
					</header>

					<InfoCard className="mb-6 overflow-hidden bg-brand-pink/[0.07] p-5 sm:p-6">
						<div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
							<div className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-brand-pink/[0.08] blur-2xl" aria-hidden />
							<CompletionRing value={completeness} />
							<div className="relative z-[1] min-w-0 flex-1">
								<h2 className="text-xl font-black tracking-tight text-gray-950">Profile completeness</h2>
								<p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
									{completeness >= 85
										? 'Great job. A complete profile helps us create better, more tailored resumes.'
										: 'Add a little more profile data and Taylor can create stronger role-specific versions.'}
								</p>
							</div>
							<button
								type="button"
								onClick={() => scrollToSection(missingItem?.id || 'contact-section')}
								className="relative z-[1] inline-flex items-center justify-center gap-2 rounded-xl border border-brand-pink/22 bg-white/82 px-5 py-3 text-sm font-black text-brand-pink-dark shadow-sm transition hover:-translate-y-0.5 hover:border-brand-pink/36 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								{missingItem ? 'See what is missing' : 'Review profile'}
								<FontAwesomeIcon icon={faChevronRight} className="size-3.5" />
							</button>
						</div>
					</InfoCard>

					<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.75fr)]">
						<div className="space-y-4">
							{profileItems.map((item) => (
								<OverviewRow key={item.id} item={item} onClick={() => scrollToSection(item.id)} />
							))}

							<InfoCard className="p-5">
								{user?.attached_resume_filename ? (
									<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
										<div className="flex items-center gap-3">
											<span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-pink/[0.1] text-brand-pink-dark">
												<FontAwesomeIcon icon={faFileAlt} className="size-5" />
											</span>
											<div>
												<p className="font-black text-gray-950">Attached r&eacute;sum&eacute;</p>
												<p className="text-sm text-gray-600">{user.attached_resume_filename}</p>
											</div>
										</div>
										<button
											type="button"
											onClick={handleDetachResumeClick}
											className="rounded-xl px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
										>
											Remove
										</button>
									</div>
								) : (
									<div
										className={`rounded-2xl border border-dashed p-5 transition-all ${
											isParsingResume ? 'border-brand-pink bg-brand-pink/5' : 'border-brand-pink/24 bg-brand-pink/[0.03] hover:border-brand-pink/40'
										}`}
										onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
										onDrop={(e) => {
											e.preventDefault()
											const file = e.dataTransfer?.files?.[0]
											if (file && !isParsingResume) handleResumeUpload(file)
										}}
									>
										<p className="font-black text-gray-950">Upload an existing r&eacute;sum&eacute;</p>
										<p className="mt-1 text-sm leading-relaxed text-gray-600">
											Quickly add education, experience, projects, and skills. Duplicates are skipped.
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
											className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-brand-pink-dark"
										>
											{isParsingResume ? 'Parsing...' : 'Upload PDF or DOCX'}
										</label>
										{parseResumeError && (
											<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
												{parseResumeError}
											</div>
										)}
									</div>
								)}
							</InfoCard>

							<div className="pt-2">
								<h2 className="text-xl font-black tracking-tight text-gray-950">Edit profile details</h2>
								<p className="mt-1 text-sm text-gray-600">Open any section above, or keep editing directly below.</p>
							</div>

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
						<aside className="space-y-6 xl:sticky xl:top-6">
							<InfoCard className="p-6">
								<h2 className="text-xl font-black tracking-tight text-gray-950">Profile summary</h2>
								<div className="mt-5 divide-y divide-gray-200/70">
									{summaryStats.map((stat) => (
										<div key={stat.label} className="flex items-center gap-3 py-3">
											<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-pink/[0.08] text-brand-pink-dark">
												<FontAwesomeIcon icon={stat.icon} className="size-4" />
											</span>
											<span className="min-w-0 flex-1 text-sm font-semibold text-gray-700">{stat.label}</span>
											<span className="text-sm font-black text-gray-950">{stat.value}</span>
										</div>
									))}
								</div>
							</InfoCard>

							<InfoCard className="p-6">
								<div className="flex items-start gap-3">
									<span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${savingSection ? 'bg-brand-pink/[0.1] text-brand-pink-dark' : isDirty() ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
										<FontAwesomeIcon icon={savingSection ? faClockRotateLeft : isDirty() ? faPlus : faCheck} className="size-4" />
									</span>
									<div>
										<p className="font-black text-gray-950">{autoSaveLabel}</p>
										<p className="mt-1 text-sm leading-relaxed text-gray-600">
											Changes save automatically after a short pause, and before dashboard navigation when possible.
										</p>
									</div>
								</div>
							</InfoCard>

							<InfoCard className="bg-brand-pink/[0.08] p-6">
								<p className="flex items-center gap-2 text-sm font-black text-brand-pink-dark">
									<FontAwesomeIcon icon={faWandMagicSparkles} className="size-4" />
									Tip
								</p>
								<p className="mt-3 text-sm leading-relaxed text-gray-700">
									The more complete your profile, the better your tailored r&eacute;sum&eacute;s.
								</p>
							</InfoCard>
						</aside>
					</div>
				</div>
			</DashboardShell>

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
		</>
	)
}

export default Info
