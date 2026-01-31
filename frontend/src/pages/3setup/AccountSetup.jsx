// pages / 3setup/AccountSetup.jsx

// account setup page - multi-step onboarding form.

// first page, don't allow user to move on until they parsed if they inputted a resume.
// allow users to edit the fields that were parsed.

// imports.
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// services imports.
import { setupEducation, setupExperiences, setupProjects, setupSkills, createSummary } from '@/api/services/profile'

// utils imports.
import { 
	normalizeEducationForBackend,
	normalizeExperienceForBackend,
	normalizeProjectForBackend,
	normalizeSkillForBackend
} from '@/pages/utils/DataFormatting'

// steps imports.
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

	// ---- states ----
	const [currentStep, setCurrentStep] = useState(0) 	// current step of onboarding process.
	const [user, setUser] = useState(null)				// current user data.

	// form data state.
	const [formData, setFormData] = useState({
		contact: {
			email: '',
			phone: '',
			github: '',
			linkedin: '',
			portfolio: '',
		},
		education: [],
		skills: [],
		experiences: [],
		projects: [],
		summary: '',
		extracurriculars: [],
		coursework: [],
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
	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1)
		}
	}

	// handles decrementing to the previous step.
	const handlePrevious = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1)
		}
	}

	// handles form completion.
	const handleComplete = async () => {
		try {
			// save education, experiences, projects, and skills to backend.
			const promises = []
			
			// set up education data.
			if (formData.education.length > 0) {
				const educationData = formData.education.map(normalizeEducationForBackend)
				promises.push(setupEducation(educationData))
			}
			
			// set up experiences data.
			if (formData.experiences.length > 0) {
				const experiencesData = formData.experiences.map(normalizeExperienceForBackend)
				const experiencePromise = setupExperiences(experiencesData)
					.then(response => response)
					.catch(error => { throw error })
				promises.push(experiencePromise)
			}
			
			// set up projects data.
			if (formData.projects.length > 0) {
				const projectsData = formData.projects.map(normalizeProjectForBackend)
				promises.push(setupProjects(projectsData))
			}
			
			// set up skills data.
			if (formData.skills.length > 0) {
				const skillsData = formData.skills.map(normalizeSkillForBackend)
				promises.push(setupSkills(skillsData))
			}

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
		setFormData(prev => ({
			...prev,
			[field]: [...prev[field], item]
		}))
	}

	// handles removing an item from an array field.
	const removeItem = (field, index) => {
		setFormData(prev => ({
			...prev,
			[field]: prev[field].filter((_, i) => i !== index)
		}))
	}

	// handles updating an item in an array field.
	const updateItem = (field, index, updatedItem) => {
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
						education={formData.education}
						onAdd={(item) => addItem('education', item)}
						onRemove={(index) => removeItem('education', index)}
						onUpdate={(index, item) => updateItem('education', index, item)}
					/>
				)

			case 3: // Experience
				return (
					<ExperienceStep
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

	return (
		<div className="min-h-screen bg-cream py-8">
			<div className="max-w-4xl mx-auto px-4">
				{/* Progress Bar */}
				<div className="mb-8">
					<div className="flex justify-between items-center mb-2">
						<span className="text-sm font-medium text-gray-700">
							Step {currentStep + 1} of {steps.length}
						</span>
						<span className="text-sm font-medium text-gray-700">
							{Math.round(progress)}%
						</span>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-2">
						<div
							className="bg-brand-pink h-2 rounded-full transition-all duration-300"
							style={{ width: `${progress}%` }}
						></div>
					</div>
				</div>

				{/* Step Indicators */}
				<div className="flex justify-between mb-8 overflow-x-auto pb-4">
					{steps.map((step, index) => (
						<div
							key={index}
							className={`flex flex-col items-center mt-4 min-w-[80px] ${
								index <= currentStep ? 'opacity-100' : 'opacity-40'
							}`}
						>
							<div
								className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mb-2 transition-all ${
									index < currentStep
										? 'bg-brand-pink text-white'
										: index === currentStep
										? 'bg-brand-pink text-white ring-4 ring-brand-pink/30'
										: 'bg-gray-300 text-gray-600'
								}`}
							>
								{index < currentStep ? '✓' : step.icon}
							</div>
							<span className="text-xs text-center font-medium text-gray-700">
								{step.title}
							</span>
						</div>
					))}
				</div>

				{/* Step Content */}
				<div className="bg-white-bright rounded-xl shadow-sm p-8 mb-6">
					{renderStepContent()}
				</div>

				{/* Navigation Buttons */}
				{currentStep !== 0 && currentStep !== steps.length - 1 && (
					<div className="flex justify-between">
						<button
							onClick={handlePrevious}
							className="px-6 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
						>
							← Previous
						</button>
						<button
							onClick={handleNext}
							className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
						>
							Next →
						</button>
					</div>
				)}
			</div>
		</div>
	)
}

// export.
export default AccountSetup

