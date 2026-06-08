// pages / 3setup/AccountSetup.jsx

// account setup page - multi-step onboarding form.

// first page, don't allow user to move on until they parsed if they inputted a resume.
// allow users to edit the fields that were parsed.

// imports.
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// services imports.
import { setupEducation, setupExperiences, setupProjects, setupSkills, createSummary, upsertContact, detachResume } from '@/api/services/profile'

// utils imports.
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

// steps imports.
import { ChevronLeft, ChevronRight, ErrorIcon } from '@/components/icons'
import WelcomeStep from './steps/WelcomeStep'
import ContactStep from './steps/ContactStep'
import EducationStep from './steps/EducationStep'
import ExperienceStep from './steps/ExperienceStep'
import SkillsStep from './steps/SkillsStep'
import ProjectsStep from './steps/ProjectsStep'
import CompleteScreen from './steps/CompleteScreen'
import SummaryStep from './steps/SummaryStep'

// ----------- main component -----------

function AccountSetup() {

	const navigate = useNavigate()
	const educationStepRef = useRef(null)
	const experienceStepRef = useRef(null)
	const projectsStepRef = useRef(null)
	const scrollContainerRef = useRef(null)
	const errorFadeTimerRef = useRef(null)

	// ---- states ----
	const [currentStep, setCurrentStep] = useState(0)
	const [user, setUser] = useState(null)
	const [stepError, setStepError] = useState('')
	// displayedError stays populated during the fade-out so the element stays mounted
	const [displayedError, setDisplayedError] = useState('')
	const [errorVisible, setErrorVisible] = useState(false)
	const [showSkipConfirmation, setShowSkipConfirmation] = useState(false)

	// sync stepError → displayedError with instant-in / fade-out behaviour
	useEffect(() => {
		clearTimeout(errorFadeTimerRef.current)
		if (stepError) {
			setDisplayedError(stepError)
			setErrorVisible(true)
			// scroll the container to the top so the banner is always seen
			scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
		} else {
			setErrorVisible(false)
			errorFadeTimerRef.current = setTimeout(() => setDisplayedError(''), 400)
		}
		return () => clearTimeout(errorFadeTimerRef.current)
	}, [stepError])

	// form data state.
	const [formData, setFormData] = useState({
		contact: {
			email: '',
			phone: '',
			github: '',
			linkedin: '',
			portfolio: '',
			location: '',
			tagline: '',
		},
		education: [],
		skills: [],
		experiences: [],
		projects: [],
		summary: '',
		extracurriculars: [],
		coursework: [],
		uploadedResumeFilename: null, // persists when navigating back to WelcomeStep
	})

	// ---- variables ----
	
	// step titles.
	const steps = [
		{ title: 'Welcome', icon: '👋' },
		{ title: 'Contact', icon: '📧' },
		{ title: 'Education', icon: '🎓' },
		{ title: 'Experience', icon: '💼' },
		{ title: 'Skills', icon: '⚡' },
		{ title: 'Projects', icon: '🚀' },
		{ title: 'Summary', icon: '📝' },
		{ title: 'Complete', icon: '✅' },
	]

	// calculate progress percentage.
	const progress = ((currentStep + 1) / steps.length) * 100

	// ---- functions ----

	// load user data on mount (authentication is handled by ProtectedRoute).
	useEffect(() => {
		// parse user data from localStorage (ProtectedRoute ensures it exists).
		const userData = localStorage.getItem('user')
		if (userData) {
			try {
				const parsedUser = JSON.parse(userData)
				setUser(parsedUser)
				setFormData((prev) => {
					if (!parsedUser?.email || String(prev.contact?.email || '').trim()) return prev
					return {
						...prev,
						contact: {
							...prev.contact,
							email: parsedUser.email,
						},
					}
				})
			} catch (error) {
				console.error('Error parsing user data:', error)
			}
		}
	}, [])

	// handles incrementing to the next step.
	const hasValue = (value) => String(value || '').trim().length > 0
	const hasEducationContent = (edu) => [
		edu?.school,
		edu?.degree,
		edu?.discipline,
		edu?.field,
		edu?.minor,
		edu?.location,
		edu?.gpa,
		edu?.startDate,
		edu?.endDate,
		edu?.current ? 'current' : '',
	].some(hasValue)
	const hasExperienceContent = (exp) => {
		const description = exp?.description
		const hasDescription = Array.isArray(description)
			? description.some(hasValue)
			: hasValue(description)
		return [
			exp?.title,
			exp?.company,
			exp?.location,
			exp?.skills,
			exp?.startDate,
			exp?.endDate,
			hasDescription ? 'description' : '',
		].some(hasValue)
	}

	const pruneEmptyEntriesForStep = (data, step = currentStep) => {
		if (step === 2) {
			return {
				...data,
				education: data.education.filter(hasEducationContent),
			}
		}

		return data
	}

	const validateCurrentStep = (data = formData) => {
		// Step 2 — Education: if any entry exists with content, it must have school + degree + discipline.
		if (currentStep === 2) {
			const badEntry = data.education.find((edu) => {
				if (!hasEducationContent(edu)) return false
				return !hasValue(edu?.school) || !hasValue(edu?.degree) || !hasValue(edu?.discipline || edu?.field)
			})
			if (badEntry) {
				const missing = []
				if (!hasValue(badEntry?.school)) missing.push('university')
				if (!hasValue(badEntry?.degree)) missing.push('degree')
				if (!hasValue(badEntry?.discipline || badEntry?.field)) missing.push('field of study')
				setStepError(`Each education entry needs a ${missing.join(', ')}.`)
				educationStepRef.current?.revealMissingRequired?.()
				return false
			}
		}

		// Step 3 — Experience: each entry with any content must have a title and description.
		if (currentStep === 3) {
			const badEntry = data.experiences.find((exp) => {
				if (!hasExperienceContent(exp)) return false
				const desc = exp?.description
				const hasDesc = Array.isArray(desc) ? desc.some(hasValue) : hasValue(desc)
				return !hasValue(exp?.title) || !hasDesc
			})
			if (badEntry) {
				const desc = badEntry?.description
				const hasDesc = Array.isArray(desc) ? desc.some(hasValue) : hasValue(desc)
				const missing = []
				if (!hasValue(badEntry?.title)) missing.push('a job title')
				if (!hasDesc) missing.push('a description')
				setStepError(`Each experience entry needs ${missing.join(' and ')}.`)
				experienceStepRef.current?.revealMissingRequired?.()
				return false
			}
		}

		// Step 5 — Projects: if any project has content, it needs a title and description.
		if (currentStep === 5) {
			const badEntry = data.projects.find((proj) => {
				const hasContent = hasValue(proj?.title) || hasValue(proj?.description)
				if (!hasContent) return false
				return !hasValue(proj?.title) || !hasValue(proj?.description)
			})
			if (badEntry) {
				const missing = []
				if (!hasValue(badEntry?.title)) missing.push('a name')
				if (!hasValue(badEntry?.description)) missing.push('a description')
				setStepError(`Each project needs ${missing.join(' and ')}.`)
				projectsStepRef.current?.revealMissingRequired?.()
				return false
			}
		}

		setStepError('')
		return true
	}

	const handleNext = () => {
		const prunedFormData = pruneEmptyEntriesForStep(formData)
		if (!validateCurrentStep(prunedFormData)) return
		if (prunedFormData !== formData) {
			setFormData(prunedFormData)
		}
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1)
		}
	}

	// handles decrementing to the previous step.
	const handlePrevious = () => {
		setStepError('')
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1)
		}
	}

	const handleSkipSetup = () => {
		const userId = user?.id
		if (!userId) return
		localStorage.setItem(`setupCompleted_${userId}`, 'true')
		localStorage.setItem(`setupSkipped_${userId}`, 'true')
		setShowSkipConfirmation(false)
		navigate('/home')
	}

	// handles form completion.
	const handleComplete = async () => {
		try {
			// save education, experiences, projects, and skills to backend.
			const promises = []
			
			// set up education data (filter empty entries to avoid 422)
			const educationFiltered = filterEmptyEducation(formData.education)
			const educationData = educationFiltered.map(normalizeEducationForBackend)
			promises.push(setupEducation(educationData))

			// set up experiences data (filter empty entries to avoid 422)
			const experiencesFiltered = filterEmptyExperiences(formData.experiences)
			const experiencesData = experiencesFiltered.map(normalizeExperienceForBackend)
			const experiencePromise = setupExperiences(experiencesData)
				.then(response => response)
				.catch(error => { throw error })
			promises.push(experiencePromise)

			// set up projects data (filter empty entries to avoid 422)
			const projectsFiltered = filterEmptyProjects(formData.projects)
			const projectsData = projectsFiltered.map(normalizeProjectForBackend)
			promises.push(setupProjects(projectsData))

			// set up skills data (filter empty entries to avoid 422)
			const skillsFiltered = filterEmptySkills(formData.skills)
			const skillsData = skillsFiltered.map(normalizeSkillForBackend)
			promises.push(setupSkills(skillsData))

			// set up contact data (phone, location, etc. - was never saved before).
			const contactData = {
				email: formData.contact?.email || null,
				phone: formData.contact?.phone || null,
				github: formData.contact?.github || null,
				linkedin: formData.contact?.linkedin || null,
				portfolio: formData.contact?.portfolio || null,
				location: formData.contact?.location || null,
				tagline: (formData.contact?.tagline && formData.contact.tagline.trim())
					? formData.contact.tagline.trim()
					: null,
			}
			promises.push(upsertContact(contactData))

			// set up summary data.
			if (formData.summary) {
				const summaryData = {
					summary: formData.summary,
				}
				promises.push(createSummary(summaryData))
			}

			// wait for all promises to complete.
			await Promise.all(promises)
			
			// mark setup as completed in localStorage (user-specific flag).
			const userId = user?.id
			if (userId) {
				localStorage.setItem(`setupCompleted_${userId}`, 'true')
				localStorage.removeItem(`setupSkipped_${userId}`)
			}
			
			// redirect to home.
			navigate('/home')
		} catch (error) {
			console.error('Error saving profile data:', error)
			// still redirect even if there's an error.
			navigate('/home')
		}
	}

	// handles adding an item to an array field.
	const addItem = (field, item) => {
		setStepError('')
		setFormData(prev => ({
			...prev,
			[field]: [...prev[field], item]
		}))
	}

	// handles removing an item from an array field.
	const removeItem = (field, index) => {
		setStepError('')
		setFormData(prev => ({
			...prev,
			[field]: prev[field].filter((_, i) => i !== index)
		}))
	}

	// handles updating an item in an array field.
	const updateItem = (field, index, updatedItem) => {
		setStepError('')
		setFormData(prev => ({
			...prev,
			[field]: prev[field].map((item, i) => i === index ? updatedItem : item)
		}))
	}

	// render step content.
	const renderStepContent = () => {
		switch (currentStep) {
			case 0: // Welcome Step.
					return (
						<WelcomeStep
							user={user}
							handleNext={handleNext}
							formData={formData}
							onFormDataUpdate={(mergedData) => setFormData(mergedData)}
							onSkipSetup={() => setShowSkipConfirmation(true)}
							onRemoveResume={async () => {
								try { await detachResume() } catch (e) { console.warn('detachResume:', e) }
								setFormData(prev => ({ ...prev, uploadedResumeFilename: null }))
							}}
						/>
				)
			case 1: // Contact
				return (
					<ContactStep
						contact={formData.contact}
						onUpdate={(field, value) => setFormData(prev => ({
							...prev,
							contact: { ...prev.contact, [field]: value }
						}))}
					/>
				)

			case 2: // Education
				return (
					<EducationStep
						ref={educationStepRef}
						education={formData.education}
						onAdd={(item) => addItem('education', item)}
						onRemove={(index) => removeItem('education', index)}
						onUpdate={(index, item) => updateItem('education', index, item)}
					/>
				)

			case 3: // Experience
				return (
					<ExperienceStep
						ref={experienceStepRef}
						experiences={formData.experiences}
						onAdd={(item) => addItem('experiences', item)}
						onRemove={(index) => removeItem('experiences', index)}
						onUpdate={(index, item) => updateItem('experiences', index, item)}
					/>
				)

			case 4: // Skills
				return (
					<SkillsStep
						skills={formData.skills}
						onAdd={(item) => addItem('skills', item)}
						onRemove={(index) => removeItem('skills', index)}
						onUpdate={(index, item) => updateItem('skills', index, item)}
					/>
				)

			case 5: // Projects
				return (
					<ProjectsStep
						ref={projectsStepRef}
						projects={formData.projects}
						onAdd={(item) => addItem('projects', item)}
						onRemove={(index) => removeItem('projects', index)}
						onUpdate={(index, item) => updateItem('projects', index, item)}
					/>
				)

			case 6: // Summary
				return (
					<SummaryStep
						summary={formData.summary}
						onUpdate={(value) => setFormData(prev => ({ ...prev, summary: value }))}
					/>
				)

			case 7: // Complete
				return (
					<CompleteScreen
						formData={formData}
						handleComplete={handleComplete}
					/>
				)

			default:
				return null
		}
	}

	if (!user) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-cream">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink mx-auto mb-4"></div>
					<p className="text-gray-600">Loading...</p>
				</div>
			</div>
		)
	}

	const showStepNav = currentStep > 0 && currentStep < steps.length - 1
	const previousStepTitle = steps[currentStep - 1]?.title
	const nextStepTitle = steps[currentStep + 1]?.title

	return (
		<div ref={scrollContainerRef} className="relative h-screen overflow-y-auto bg-[#fff8ef] info-scrollbar">
			<div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
				<div className="auth-background-photo fixed inset-0" />
				<div className="auth-corner-blotch auth-corner-blotch--top-right" />
				<div className="auth-corner-blotch auth-corner-blotch--bottom-left" />
				<div className="absolute left-[15%] top-[18%] size-[18rem] rounded-full bg-brand-pink/[0.12] blur-3xl" />
				<div className="absolute right-[13%] bottom-[12%] size-[20rem] rounded-full bg-rose-300/[0.14] blur-3xl" />
			</div>

			{showStepNav ? (
				<>
					<button
						type="button"
						onClick={handlePrevious}
						className="group fixed left-[max(4.25rem,calc((100vw-42rem)/4))] top-1/2 z-30 flex max-w-[6.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 text-center outline-none transition"
						aria-label={`Previous step: ${previousStepTitle}`}
					>
						<span className="flex size-12 items-center justify-center rounded-full bg-brand-pink text-white shadow-[0_18px_38px_-18px_rgba(214,86,86,0.9)] ring-4 ring-white/80 transition duration-300 group-hover:-translate-x-1.5 group-hover:scale-110 group-hover:bg-brand-pink-dark group-hover:shadow-[0_20px_48px_-15px_rgba(214,86,86,1)] group-focus-visible:ring-brand-pink/35 sm:size-14">
							<ChevronLeft className="size-5 transition duration-300 group-hover:-translate-x-0.5" />
						</span>
						<span className="rounded-full border border-brand-pink/12 bg-white/88 px-3 py-1.5 shadow-sm backdrop-blur-md transition duration-300 group-hover:border-brand-pink/28 group-hover:bg-white">
							<span className="block text-[0.62rem] font-black uppercase tracking-[0.14em] text-brand-pink-dark">Previous</span>
							<span className="mt-0.5 block truncate text-xs font-black text-gray-950">{previousStepTitle}</span>
						</span>
					</button>

					<button
						type="button"
						onClick={handleNext}
						className="group fixed right-[max(4.25rem,calc((100vw-42rem)/4))] top-1/2 z-30 flex max-w-[6.5rem] translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 text-center outline-none transition"
						aria-label={`Next step: ${nextStepTitle}`}
					>
						<span className="flex size-12 items-center justify-center rounded-full bg-brand-pink text-white shadow-[0_18px_38px_-18px_rgba(214,86,86,0.9)] ring-4 ring-white/80 transition duration-300 group-hover:translate-x-1.5 group-hover:scale-110 group-hover:bg-brand-pink-dark group-hover:shadow-[0_20px_48px_-15px_rgba(214,86,86,1)] group-focus-visible:ring-brand-pink/35 sm:size-14">
							<ChevronRight className="size-5 transition duration-300 group-hover:translate-x-0.5" />
						</span>
						<span className="rounded-full border border-brand-pink/12 bg-white/88 px-3 py-1.5 shadow-sm backdrop-blur-md transition duration-300 group-hover:border-brand-pink/28 group-hover:bg-white">
							<span className="block text-[0.62rem] font-black uppercase tracking-[0.14em] text-brand-pink-dark">Next</span>
							<span className="mt-0.5 block truncate text-xs font-black text-gray-950">{nextStepTitle}</span>
						</span>
					</button>
				</>
			) : null}

			<div className="relative z-[1] min-h-full px-4 py-12">
				<div
					className={
						currentStep === 0
							? 'mx-auto flex min-h-full w-full max-w-5xl items-center justify-center'
							: 'grid min-h-full w-full grid-cols-[minmax(5.5rem,1fr)_minmax(0,42rem)_minmax(5.5rem,1fr)] items-center gap-4'
					}
				>
					<div className={`w-full ${currentStep === 0 ? 'max-w-5xl' : 'col-start-2 max-w-2xl'}`}>
					<div className="mb-6">
						<div className="w-full overflow-hidden rounded-full bg-white/70 h-1.5 shadow-inner ring-1 ring-brand-pink/10">
							<div
								className="h-full rounded-full bg-gradient-to-r from-brand-pink to-rose-400 transition-all duration-500 ease-out"
								style={{ width: `${progress}%` }}
							></div>
						</div>
						<div className="flex justify-between items-center mt-2">
							<span className="text-xs font-black uppercase tracking-[0.16em] text-brand-pink-dark">
								{steps[currentStep].title}
							</span>
							<span className="text-xs font-semibold text-gray-500">
								{currentStep + 1} / {steps.length}
							</span>
						</div>
					</div>

					{displayedError ? (
						<div
							className="errorMessage mb-4 w-full"
							style={{
								opacity: errorVisible ? 1 : 0,
								transition: errorVisible ? 'none' : 'opacity 0.35s ease-out',
							}}
							role="alert"
							aria-live="assertive"
						>
							<ErrorIcon className="errorMessage-icon shrink-0" />
							<span>{displayedError}</span>
						</div>
					) : null}

					<div
						key={currentStep}
						className={
							currentStep === 0
								? 'animate-fadeIn'
								: 'animate-fadeIn rounded-[1.55rem] border border-brand-pink/14 bg-white/88 p-6 shadow-[0_28px_80px_-34px_rgba(120,40,40,0.34)] ring-1 ring-white/90 backdrop-blur-xl md:p-8'
						}
					>
						{renderStepContent()}
					</div>
				</div>

				</div>
			</div>

			{showSkipConfirmation ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<button
						type="button"
						className="absolute inset-0 cursor-default bg-gray-950/35 backdrop-blur-[2px]"
						onClick={() => setShowSkipConfirmation(false)}
						aria-label="Close skip setup confirmation"
					/>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="skip-setup-title"
						className="relative w-full max-w-md rounded-[1.4rem] border border-brand-pink/18 bg-white p-6 shadow-[0_28px_80px_-28px_rgba(80,25,30,0.62)] sm:p-7"
					>
						<div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-pink/[0.1] text-xl font-black text-brand-pink">
							?
						</div>
						<div className="mt-4 text-center">
							<h2 id="skip-setup-title" className="font-serif text-2xl font-black tracking-tight text-gray-950">
								Skip setup for now?
							</h2>
							<p className="mt-3 text-sm leading-relaxed text-gray-600">
								You can explore Taylor now, but creating your first tailored r&eacute;sum&eacute; will be faster and smoother when your experience, education, projects, and skills are ready.
							</p>
						</div>
						<div className="mt-6 space-y-3">
							<button
								type="button"
								onClick={() => setShowSkipConfirmation(false)}
								className="w-full rounded-xl bg-brand-pink px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(214,86,86,0.82)] transition hover:-translate-y-0.5 hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								Continue setup
							</button>
							<button
								type="button"
								onClick={handleSkipSetup}
								className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600 transition hover:border-brand-pink/25 hover:bg-brand-pink/[0.035] hover:text-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								Skip for now
							</button>
						</div>
						<p className="mt-4 text-center text-xs text-gray-400">
							You can return to setup from the dashboard anytime.
						</p>
					</div>
				</div>
			) : null}
		</div>
	)
}

// export.
export default AccountSetup
