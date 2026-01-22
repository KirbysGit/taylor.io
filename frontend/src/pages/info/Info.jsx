import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	getMyProfile,
	upsertContact,
	setupEducation,
	setupExperiences,
	setupProjects,
	setupSkills,
	updateSectionLabels,
} from '@/api/services/profile'
import TopNav from '@/components/TopNav'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const emptyEducation = () => ({
	id: newId(),
	school: '',
	degree: '',
	field: '',
	minor: '',
	location: '',
	start_date: '',
	end_date: '',
	gpa: '',
	honors_awards: '',
	clubs_extracurriculars: '',
	relevant_coursework: '',
	label_overrides: {},
})

// Normalize date strings for <input type="date">
const toDateInput = (value) => {
	if (!value) return ''
	return String(value).slice(0, 10)
}

const emptyExperience = () => ({
	id: newId(),
	title: '',
	company: '',
	description: '',
	start_date: '',
	end_date: '',
})

const emptyProject = () => ({
	id: newId(),
	title: '',
	description: '',
	tech_stack: '',
})

const emptySkill = () => ({
	id: newId(),
	name: '',
})

function Info() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [sectionLabels, setSectionLabels] = useState({})
	const [isEditingSectionLabels, setIsEditingSectionLabels] = useState(false)

	const [contactForm, setContactForm] = useState({
		email: '',
		phone: '',
		github: '',
		linkedin: '',
		portfolio: '',
		location: '',
	})

	const [educationList, setEducationList] = useState([emptyEducation()])
	const [experienceList, setExperienceList] = useState([emptyExperience()])
	const [projectList, setProjectList] = useState([emptyProject()])
	const [skillsList, setSkillsList] = useState([emptySkill()])

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
				const contact = data.contact || {}
				const sectionLabelsData = (data.user && data.user.section_labels) || {}
				
				setSectionLabels(sectionLabelsData)
				setContactForm({
					email: contact.email || '',
					phone: contact.phone || '',
					github: contact.github || '',
					linkedin: contact.linkedin || '',
					portfolio: contact.portfolio || '',
					location: contact.location || '',
				})
				setEducationList(
					data.education && data.education.length
						? data.education.map((e) => ({
								...emptyEducation(),
								...e,
								id: e.id || newId(),
								// Ensure all string fields are never null
								school: e.school ?? '',
								degree: e.degree ?? '',
								discipline: e.discipline ?? '',
								minor: e.minor ?? '',
								location: e.location ?? '',
								start_date: e.start_date ?? '',
								end_date: e.end_date ?? '',
								gpa: e.gpa ?? '',
								honors_awards: e.honors_awards ?? '',
								clubs_extracurriculars: e.clubs_extracurriculars ?? '',
								relevant_coursework: e.relevant_coursework ?? '',
								label_overrides: e.label_overrides || {},
						  }))
						: [emptyEducation()]
				)
				setExperienceList(
					data.experiences && data.experiences.length
						? data.experiences.map((e) => ({
							...emptyExperience(),
							...e,
							id: e.id || newId(),
							// Ensure all string fields are never null
							title: e.title ?? '',
							company: e.company ?? '',
							description: e.description ?? '',
							start_date: e.start_date ?? '',
							end_date: e.end_date ?? '',
						}))
						: [emptyExperience()]
				)
				setProjectList(
					data.projects && data.projects.length
						? data.projects.map((p) => ({
							...emptyProject(),
							...p,
							id: p.id || newId(),
							// Ensure all string fields are never null
							title: p.title ?? '',
							description: p.description ?? '',
							tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack.join(', ') : (p.tech_stack ?? ''),
						}))
						: [emptyProject()]
				)
				setSkillsList(
					data.skills && data.skills.length
						? data.skills.map((s) => ({ ...emptySkill(), ...s, name: s.name || '', id: s.id || newId() }))
						: [emptySkill()]
				)
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

	// Local state updates only; backend updates occur on Save.
	const onContactChange = (field, value) => setContactForm((prev) => ({ ...prev, [field]: value }))
	const onEducationChange = (id, field, value) =>
		setEducationList((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
	const onEducationLabelChange = (id, key, value) =>
		setEducationList((prev) =>
			prev.map((item) =>
				item.id === id
					? { ...item, label_overrides: { ...(item.label_overrides || {}), [key]: value } }
					: item
			)
		)
	const onExperienceChange = (id, field, value) =>
		setExperienceList((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
	const onProjectChange = (id, field, value) =>
		setProjectList((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
	const onSkillChange = (id, value) =>
		setSkillsList((prev) => prev.map((item) => (item.id === id ? { ...item, name: value } : item)))

	const addEducation = () => setEducationList((prev) => [...prev, emptyEducation()])
	const addExperience = () => setExperienceList((prev) => [...prev, emptyExperience()])
	const addProject = () => setProjectList((prev) => [...prev, emptyProject()])
	const addSkill = () => setSkillsList((prev) => [...prev, emptySkill()])

	// Saves
	const handleContactSave = async () => {
		try {
			await upsertContact(contactForm)
		} catch (error) {
			console.error('Error saving contact:', error)
			alert('Failed to save contact info.')
		}
	}

	const handleSaveEducation = async () => {
		const payload = educationList
			.filter((edu) => Object.values(edu).some((v) => (v || '').toString().trim() !== ''))
			.map(({ id, start_date, end_date, ...rest }) => ({
				...rest,
				// Convert empty date strings to null for proper backend parsing
				start_date: start_date && start_date.trim() ? start_date : null,
				end_date: end_date && end_date.trim() ? end_date : null,
			}))
		try {
			await setupEducation(payload)
			// Refresh the profile data after successful save
			const response = await getMyProfile()
			const data = response.data || {}
			
			// Deduplicate education entries (same logic as initial load)
			const educationMap = new Map()
			if (data.education && data.education.length) {
				data.education.forEach((e) => {
					const key = `${e.school || ''}_${e.degree || ''}_${e.field || ''}_${e.start_date || ''}`
					if (!educationMap.has(key) || (e.id && !educationMap.get(key).id)) {
						educationMap.set(key, e)
					}
				})
			}
			const uniqueEducation = Array.from(educationMap.values())
			
			setEducationList(
				uniqueEducation.length
					? uniqueEducation.map((e) => ({
						...emptyEducation(),
						...e,
						id: e.id || newId(),
						// Ensure all string fields are never null
						school: e.school ?? '',
						degree: e.degree ?? '',
						discipline: e.discipline ?? '',
						minor: e.minor ?? '',
						location: e.location ?? '',
						start_date: e.start_date ?? '',
						end_date: e.end_date ?? '',
						gpa: e.gpa ?? '',
						honors_awards: e.honors_awards ?? '',
						clubs_extracurriculars: e.clubs_extracurriculars ?? '',
						relevant_coursework: e.relevant_coursework ?? '',
						label_overrides: e.label_overrides || {},
					}))
					: [emptyEducation()]
			)
			alert('Education saved successfully!')
		} catch (error) {
			console.error('Error saving education:', error)
			alert('Failed to save education. Please check the console for details.')
		}
	}

	const handleSaveExperiences = async () => {
		const payload = experienceList
			.filter((exp) => Object.values(exp).some((v) => (v || '').toString().trim() !== ''))
			.map(({ id, ...rest }) => rest)
		try {
			await createExperiencesBulk(payload)
		} catch (error) {
			console.error('Error saving experiences:', error)
			alert('Failed to save experiences.')
		}
	}

	const handleSaveProjects = async () => {
		const payload = projectList
			.filter((proj) => Object.values(proj).some((v) => (v || '').toString().trim() !== ''))
			.map(({ id, tech_stack, ...rest }) => ({
				...rest,
				tech_stack: tech_stack
					? tech_stack
							.split(',')
							.map((s) => s.trim())
							.filter(Boolean)
					: [],
			}))
		try {
			await createProjectsBulk(payload)
		} catch (error) {
			console.error('Error saving projects:', error)
			alert('Failed to save projects.')
		}
	}

	const handleSaveSkills = async () => {
		const payload = skillsList
			.filter((s) => (s.name || '').trim() !== '')
			.map(({ name }) => ({ name }))
		try {
			await createSkillsBulk(payload)
		} catch (error) {
			console.error('Error saving skills:', error)
			alert('Failed to save skills.')
		}
	}

	// Section label editing
	const handleSectionLabelChange = (key, value) => {
		setSectionLabels((prev) => ({ ...prev, [key]: value }))
	}

	const handleSaveSectionLabels = async () => {
		try {
			await updateSectionLabels(sectionLabels)
			setIsEditingSectionLabels(false)
		} catch (error) {
			console.error('Error saving section labels:', error)
			alert('Failed to save section labels.')
		}
	}

	return (
		<div className="min-h-screen flex flex-col bg-cream">
			<TopNav user={user} onLogout={handleLogout} />

			<main className="flex-1 py-8 bg-cream">
				<div className="max-w-6xl mx-auto px-6 space-y-6">
					<h2 className="text-2xl font-bold text-gray-900">Your Info</h2>
					{isLoading ? (
						<p className="text-gray-600">Loading...</p>
					) : (
						<div className="space-y-6">
							<section className="bg-white-bright rounded-xl shadow-sm p-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-xl font-bold text-gray-900">Contact</h3>
									<button
										onClick={handleContactSave}
										className="px-4 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition"
									>
										Save
									</button>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{['email', 'phone', 'github', 'linkedin', 'portfolio', 'location'].map((field) => (
										<div key={field} className="flex flex-col">
											<label className="text-sm text-gray-700 mb-1 capitalize">{field}</label>
											<input
												type="text"
												value={contactForm[field]}
												onChange={(e) => onContactChange(field, e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
											/>
										</div>
									))}
								</div>
							</section>

							<section className="bg-white-bright rounded-xl shadow-sm p-6">
								<div className="flex items-center justify-between mb-4">
							<h3 className="text-xl font-bold text-gray-900">
								{sectionLabels.education || 'Education'}
							</h3>
							<div className="flex items-center gap-2">
								{isEditingSectionLabels ? (
									<>
										<input
											type="text"
											value={sectionLabels.education || 'Education'}
											onChange={(e) => handleSectionLabelChange('education', e.target.value)}
											className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
										/>
										<button
											onClick={handleSaveSectionLabels}
											className="p-2 bg-brand-pink text-white rounded-lg hover:opacity-90 transition"
											title="Save label"
										>
											<FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
										</button>
										<button
											onClick={() => setIsEditingSectionLabels(false)}
											className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
											title="Cancel"
										>
											<FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
										</button>
									</>
								) : (
									<button
										onClick={() => setIsEditingSectionLabels(true)}
										className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
										title="Edit section label"
									>
										<FontAwesomeIcon icon={faPenToSquare} className="h-4 w-4" />
									</button>
								)}
								<button
									onClick={addEducation}
									className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition"
								>
									Add another
								</button>
								<button
									onClick={handleSaveEducation}
									className="px-4 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition"
								>
									Save
								</button>
							</div>
								</div>
								<div className="space-y-4">
									{educationList.map((edu) => (
										<div
											key={edu.id}
											className="border border-gray-200 rounded-lg p-4 space-y-4 bg-white"
										>
											<div className="space-y-3">
												<div className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
													Program
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
													<div className="flex flex-col gap-1">
														<label className="text-sm font-medium text-gray-700">School</label>
														<input
															type="text"
															placeholder="University Name"
															value={edu.school}
															onChange={(e) => onEducationChange(edu.id, 'school', e.target.value)}
															className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
														/>
													</div>
													<div className="flex flex-col gap-1">
														<label className="text-sm font-medium text-gray-700">Degree</label>
														<input
															type="text"
															placeholder="Bachelor of Science"
															value={edu.degree}
															onChange={(e) => onEducationChange(edu.id, 'degree', e.target.value)}
															className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
														/>
													</div>
													<div className="flex flex-col gap-1">
														<label className="text-sm font-medium text-gray-700">Discipline</label>
														<input
															type="text"
															placeholder="Computer Engineering"
															value={edu.discipline}
															onChange={(e) => onEducationChange(edu.id, 'discipline', e.target.value)}
															className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
														/>
													</div>
													<div className="flex flex-col gap-1">
														<label className="text-sm font-medium text-gray-700">Minor (optional)</label>
														<input
															type="text"
															placeholder="Minor"
															value={edu.minor}
															onChange={(e) => onEducationChange(edu.id, 'minor', e.target.value)}
															className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
														/>
													</div>
												</div>
											</div>

											<div className="space-y-3">
												<div className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
													Location & Dates
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
													<div className="flex flex-col gap-1">
														<label className="text-sm font-medium text-gray-700">Location</label>
														<input
															type="text"
															placeholder="City, State"
															value={edu.location}
															onChange={(e) => onEducationChange(edu.id, 'location', e.target.value)}
															className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
														/>
													</div>
													<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
														<div className="flex flex-col gap-1">
															<label className="text-sm font-medium text-gray-700">Start date</label>
															<input
																type="date"
																value={toDateInput(edu.start_date)}
																onChange={(e) => onEducationChange(edu.id, 'start_date', e.target.value)}
																className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
															/>
														</div>
														<div className="flex flex-col gap-1">
															<label className="text-sm font-medium text-gray-700">End date</label>
															<input
																type="date"
																value={toDateInput(edu.end_date)}
																onChange={(e) => onEducationChange(edu.id, 'end_date', e.target.value)}
																className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
															/>
														</div>
													</div>
												</div>
											</div>

											<div className="space-y-3">
												<div className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
													Highlights
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
													<div className="flex flex-col gap-1">
														<label className="text-sm font-medium text-gray-700">GPA</label>
														<input
															type="text"
															placeholder="e.g., 3.8 / 4.0"
															value={edu.gpa}
															onChange={(e) => onEducationChange(edu.id, 'gpa', e.target.value)}
															className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
														/>
													</div>
													<div className="flex flex-col gap-1">
														<label className="text-sm font-medium text-gray-700">Honors & Awards</label>
														<input
															type="text"
															placeholder="Dean’s List, Scholarships"
															value={edu.honors_awards}
															onChange={(e) => onEducationChange(edu.id, 'honors_awards', e.target.value)}
															className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
														/>
													</div>
													<div className="flex flex-col gap-1">
														<label className="text-sm font-medium text-gray-700">Clubs & Extracurriculars</label>
														<input
															type="text"
															placeholder="Clubs, leadership, hackathons"
															value={edu.clubs_extracurriculars}
															onChange={(e) =>
																onEducationChange(edu.id, 'clubs_extracurriculars', e.target.value)
															}
															className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
														/>
													</div>
													<div className="flex flex-col gap-1 md:col-span-2">
														<label className="text-sm font-medium text-gray-700">Relevant Coursework</label>
														<input
															type="text"
															placeholder="Separate with commas"
															value={edu.relevant_coursework}
															onChange={(e) => onEducationChange(edu.id, 'relevant_coursework', e.target.value)}
															className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
														/>
													</div>
												</div>
											</div>

											{/* Label overrides inline editor */}
											<div className="md:col-span-2 border border-dashed border-gray-200 rounded-lg p-3 space-y-2">
												<div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
													Customize labels
													<FontAwesomeIcon icon={faPenToSquare} className="h-4 w-4 text-gray-500" />
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
													<input
														type="text"
														placeholder="Honors label (default: Honors & Awards)"
														value={edu.label_overrides?.honors_awards || ''}
														onChange={(e) => onEducationLabelChange(edu.id, 'honors_awards', e.target.value)}
														className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
													/>
													<input
														type="text"
														placeholder="Coursework label (default: Relevant Coursework)"
														value={edu.label_overrides?.relevant_coursework || ''}
														onChange={(e) =>
															onEducationLabelChange(edu.id, 'relevant_coursework', e.target.value)
														}
														className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
													/>
													<input
														type="text"
														placeholder="Clubs label (default: Clubs & Extracurriculars)"
														value={edu.label_overrides?.clubs_extracurriculars || ''}
														onChange={(e) =>
															onEducationLabelChange(edu.id, 'clubs_extracurriculars', e.target.value)
														}
														className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
													/>
												</div>
											</div>
										</div>
									))}
								</div>
							</section>

							{/* Experiences section - commented out */}
							{/* <section className="bg-white-bright rounded-xl shadow-sm p-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-xl font-bold text-gray-900">Experiences</h3>
									<div className="flex items-center gap-2">
										<button
											onClick={addExperience}
											className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition"
										>
											Add another
										</button>
										<button
											onClick={handleSaveExperiences}
											className="px-4 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition"
										>
											Save
										</button>
									</div>
								</div>
								<div className="space-y-4">
									{experienceList.map((exp) => (
										<div
											key={exp.id}
											className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3"
										>
											<input
												type="text"
												placeholder="Title"
												value={exp.title}
												onChange={(e) => onExperienceChange(exp.id, 'title', e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
											/>
											<input
												type="text"
												placeholder="Company"
												value={exp.company}
												onChange={(e) => onExperienceChange(exp.id, 'company', e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
											/>
											<input
												type="text"
												placeholder="Description"
												value={exp.description}
												onChange={(e) => onExperienceChange(exp.id, 'description', e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink md:col-span-2"
											/>
											<div className="grid grid-cols-2 gap-2">
												<input
													type="text"
													placeholder="Start date"
													value={exp.start_date}
													onChange={(e) => onExperienceChange(exp.id, 'start_date', e.target.value)}
													className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
												/>
												<input
													type="text"
													placeholder="End date"
													value={exp.end_date}
													onChange={(e) => onExperienceChange(exp.id, 'end_date', e.target.value)}
													className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
												/>
											</div>
										</div>
									))}
								</div>
							</section> */}

							{/* Projects section - commented out */}
							{/* <section className="bg-white-bright rounded-xl shadow-sm p-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-xl font-bold text-gray-900">Projects</h3>
									<div className="flex items-center gap-2">
										<button
											onClick={addProject}
											className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition"
										>
											Add another
										</button>
										<button
											onClick={handleSaveProjects}
											className="px-4 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition"
										>
											Save
										</button>
									</div>
								</div>
								<div className="space-y-4">
									{projectList.map((proj) => (
										<div
											key={proj.id}
											className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3"
										>
											<input
												type="text"
												placeholder="Title"
												value={proj.title}
												onChange={(e) => onProjectChange(proj.id, 'title', e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
											/>
											<input
												type="text"
												placeholder="Tech stack (comma separated)"
												value={proj.tech_stack}
												onChange={(e) => onProjectChange(proj.id, 'tech_stack', e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
											/>
											<textarea
												placeholder="Description"
												value={proj.description}
												onChange={(e) => onProjectChange(proj.id, 'description', e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink md:col-span-2 min-h-[80px]"
											/>
										</div>
									))}
								</div>
							</section> */}

							{/* Skills section - commented out */}
							{/* <section className="bg-white-bright rounded-xl shadow-sm p-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-xl font-bold text-gray-900">Skills</h3>
									<div className="flex items-center gap-2">
										<button
											onClick={addSkill}
											className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition"
										>
											Add another
										</button>
										<button
											onClick={handleSaveSkills}
											className="px-4 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition"
										>
											Save
										</button>
									</div>
								</div>
								<div className="space-y-3">
									{skillsList.map((skill) => (
										<input
											key={skill.id}
											type="text"
											placeholder="Skill"
											value={skill.name}
											onChange={(e) => onSkillChange(skill.id, e.target.value)}
											className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
										/>
									))}
								</div>
							</section> */}
						</div>
					)}
				</div>
			</main>
		</div>
	)
}

export default Info

