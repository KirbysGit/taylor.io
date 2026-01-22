// pages / 3setup/AccountSetup.jsx

// account setup page - multi-step onboarding form.

// imports.
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// services imports.
import { setupEducation, setupExperiences, setupProjects, setupSkills } from '@/api/services/profile'

// steps imports.
import WelcomeStep from './steps/WelcomeStep'
import ContactStep from './steps/ContactStep'
import EducationStep from './steps/EducationStep'
import ExperienceStep from './steps/ExperienceStep'
import SkillsStep from './steps/SkillsStep'
import ProjectsStep from './steps/ProjectsStep'
import CompleteScreen from './steps/CompleteScreen'

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
		{ title: 'Complete', icon: '✅' },
	]

	// calculate progress percentage.
	const progress = ((currentStep + 1) / steps.length) * 100

	// ---- functions ----

	// check authentication on mount.
	useEffect(() => {
		// grab token and user data from localStorage.
		const token = localStorage.getItem('token')
		const userData = localStorage.getItem('user')
		
		// if no token or user data, redirect to auth page.
		if (!token || !userData) {
			navigate('/auth')
			return
		}

		// try to parse user data from localStorage.
		try {
			setUser(JSON.parse(userData))
		} catch (error) {
			// if error, redirect to auth page.
			console.error('Error parsing user data:', error)
			navigate('/auth')
		}
	}, [navigate])

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
			
			// helper function to convert month string to ISO date. (YYYY-MM -> YYYY-MM-DDT00:00:00).
			const monthToDate = (monthStr) => {
				if (!monthStr) return null
				return `${monthStr}-01T00:00:00`
			}
			
			// set up education data.
			if (formData.education.length > 0) {
				let start_date = null
				let end_date = null
				
				// update start date to ISO format.
				if (edu.startDate) {
					start_date = monthToDate(edu.startDate)
				}

				// update end date to ISO format.
				if (edu.current) {
					end_date = null
				} else if (edu.endDate) {
					end_date = monthToDate(edu.endDate)
				}

				const educationData = formData.education.map(edu => ({
					school: edu.school,
					degree: edu.degree,
					discipline: edu.discipline,
					minor: edu.minor || null,
					start_date: edu.start_date,
					end_date: edu.end_date,
					current: edu.current || false,
					gpa: edu.gpa || null,
					honors_awards: edu.honorsAwards || null,
					clubs_extracurriculars: edu.clubsExtracurriculars || null,
					location: edu.location || null,
					relevant_coursework: edu.relevantCoursework || null,
				}))

				// push the education data to the promises array.
				promises.push(setupEducation(educationData))
			}
			
			// set up experiences data.
			if (formData.experiences.length > 0) {
				const experiencesData = formData.experiences.map(exp => {
					// handle dates - could be in "YYYY-MM" format from parsing or "YYYY-MM-DD" format
					let start_date = null
					let end_date = null
					
					// if there's a start date, convert it to ISO format.
					if (exp.startDate) {
						if (exp.startDate.includes('T')) {
							start_date = exp.startDate
						} else {
							start_date = monthToDate(exp.startDate)
						}
					}
					
					// if the experience is current, set end date to null, else if there's an end date, convert it to ISO format.
					if (exp.current) {
						end_date = null
					} else if (exp.endDate) {
						if (exp.endDate.includes('T')) {
							end_date = exp.endDate
						} else {
							end_date = monthToDate(exp.endDate)
						}
					}
					
					// return the experience data.
					return {
						title: exp.title,
						company: exp.company || null,
						description: Array.isArray(exp.description) 
							? exp.description.map(item => `• ${item}`).join('\n')
							: exp.description || null,
						start_date: start_date,
						end_date: end_date,
					}
				})
				// push the experiences data to the promises array.
				promises.push(setupExperiences(experiencesData))
			}
			
			// set up projects data.
			if (formData.projects.length > 0) {
				const projectsData = formData.projects.map(proj => ({
					title: proj.title,
					description: Array.isArray(proj.description)
						? proj.description.map(item => `• ${item}`).join('\n')
						: proj.description || null,
					tech_stack: proj.techStack || null,
				}))
				promises.push(setupProjects(projectsData))
			}
			
			// set up skills data.
			if (formData.skills.length > 0) {
				const skillsData = formData.skills.map(skill => ({
					name: skill.name,
				}))
				promises.push(setupSkills(skillsData))
			}
			
			// wait for all promises to complete.
			await Promise.all(promises)
			
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

			case 6: // Complete
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
							className={`flex flex-col items-center min-w-[80px] ${
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

