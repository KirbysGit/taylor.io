// pages / 3setup/AccountSetup.jsx

// account setup page - multi-step onboarding form.

// first page, don't allow user to move on until they parsed if they inputted a resume.
// allow users to edit the fields that were parsed.

// imports.
import { useState, useEffect, useRef } from 'react'
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
import { ChevronLeft, ChevronRight } from '@/components/icons'
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

	// ---- states ----
	const [currentStep, setCurrentStep] = useState(0) 	// current step of onboarding process.
	const [user, setUser] = useState(null)				// current user data.
	const [stepError, setStepError] = useState('')

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
				setUser(JSON.parse(userData))
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

	const validateCurrentStep = () => {
		// Step 1 — Contact: email is always present from account, no extra validation needed.

		// Step 2 — Education: if any entry has content, it must have school + degree + discipline.
		if (currentStep === 2) {
			for (const edu of formData.education) {
				if (!hasEducationContent(edu)) continue
				if (!hasValue(edu?.school)) {
					setStepError('Each education entry needs a school name.')
					educationStepRef.current?.revealMissingRequired?.()
					return false
				}
				if (!hasValue(edu?.degree)) {
					setStepError('Each education entry needs a degree (e.g. Bachelor of Science).')
					return false
				}
				if (!hasValue(edu?.discipline || edu?.field)) {
					setStepError('Each education entry needs a field of study.')
					educationStepRef.current?.revealMissingRequired?.()
					return false
				}
			}
		}

		// Step 3 — Experience: each entry with content needs a title and description.
		if (currentStep === 3) {
			for (const exp of formData.experiences) {
				if (!hasExperienceContent(exp)) continue
				if (!hasValue(exp?.title)) {
					setStepError('Each experience entry needs a job title.')
					experienceStepRef.current?.revealMissingRequired?.()
					return false
				}
				const desc = exp?.description
				const hasDesc = Array.isArray(desc) ? desc.some(hasValue) : hasValue(desc)
				if (!hasDesc) {
					setStepError('Each experience entry needs a description of your work.')
					return false
				}
			}
		}

		// Step 5 — Projects: if any project has content, it needs a name and description.
		if (currentStep === 5) {
			for (const proj of formData.projects) {
				const hasContent = hasValue(proj?.title) || hasValue(proj?.description)
				if (!hasContent) continue
				if (!hasValue(proj?.title)) {
					setStepError('Each project needs a name.')
					return false
				}
				if (!hasValue(proj?.description)) {
					setStepError('Each project needs a description.')
					return false
				}
			}
		}

		setStepError('')
		return true
	}

	const handleNext = () => {
		if (!validateCurrentStep()) return
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

	const showBottomNav = currentStep > 0 && currentStep < steps.length - 1

	return (
		<div className="relative h-screen overflow-y-auto bg-[#fff8ef] info-scrollbar">
			<div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
				<div className="absolute -left-24 top-[-8rem] size-[24rem] rounded-full bg-brand-pink/[0.16] blur-3xl" />
				<div className="absolute right-[-8rem] top-24 size-[28rem] rounded-full bg-cyan-300/[0.14] blur-3xl" />
				<div className="absolute bottom-[-10rem] left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-violet-400/[0.12] blur-3xl" />
			</div>
			<div className="relative z-[1] min-h-full flex items-center justify-center py-12 px-4">
				<div className={`w-full ${currentStep === 0 ? 'max-w-5xl' : 'max-w-2xl'}`}>
					<div className="mb-6">
						<div className="w-full overflow-hidden rounded-full bg-white/70 h-1.5 shadow-inner ring-1 ring-brand-pink/10">
							<div
								className="h-full rounded-full bg-gradient-to-r from-brand-pink via-rose-400 to-violet-400 transition-all duration-500 ease-out"
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

					<div
						key={currentStep}
						className={`animate-fadeIn rounded-[1.55rem] border border-brand-pink/14 bg-white/88 shadow-[0_28px_80px_-34px_rgba(120,40,40,0.34)] ring-1 ring-white/90 backdrop-blur-xl ${currentStep === 0 ? 'p-6 md:p-10' : 'p-6 md:p-8'}`}
					>
						{renderStepContent()}
					</div>

					{showBottomNav && (
						<div className="mt-6">
							{stepError ? (
								<div className="mx-auto mb-4 max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
									{stepError}
								</div>
							) : null}
							<div className="flex items-center justify-center gap-4">
								<button
									onClick={handlePrevious}
									className="px-5 py-2.5 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-all flex items-center gap-2 group"
								>
									<ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
									Previous
								</button>

								<div className="flex items-center gap-1.5">
									{steps.slice(1, -1).map((_, index) => {
										const stepIndex = index + 1
										return (
											<div
												key={stepIndex}
												className={`h-1.5 rounded-full transition-all duration-300 ${
													stepIndex < currentStep
														? 'w-6 bg-brand-pink'
														: stepIndex === currentStep
														? 'w-8 bg-brand-pink'
														: 'w-1.5 bg-white/80 ring-1 ring-gray-200'
												}`}
											/>
										)
									})}
								</div>

								<button
									onClick={handleNext}
									className="px-6 py-2.5 bg-brand-pink text-white font-semibold rounded-xl hover:bg-brand-pink-dark transition-all shadow-lg hover:shadow-xl flex items-center gap-2 group"
								>
									Next
									<ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

// export.
export default AccountSetup
