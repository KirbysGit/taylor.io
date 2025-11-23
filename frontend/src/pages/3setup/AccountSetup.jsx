// pages/2.5setup/AccountSetup.jsx

// account setup page - multi-step onboarding form.

// imports.
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createExperiencesBulk, createProjectsBulk, createSkillsBulk } from '@/api/services/profile'
import { parseResume } from '@/api/services/resume'

// ----------- main component -----------

function AccountSetup() {
	const navigate = useNavigate()
	const [currentStep, setCurrentStep] = useState(0)
	const [user, setUser] = useState(null)

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

	// parsed resume data state.
	const [parsedData, setParsedData] = useState(null)
	const [isParsing, setIsParsing] = useState(false)
	const [parseError, setParseError] = useState('')
	const [uploadedFile, setUploadedFile] = useState(null)

	// check authentication on mount.
	useEffect(() => {
		const token = localStorage.getItem('token')
		const userData = localStorage.getItem('user')
		
		if (!token || !userData) {
			navigate('/auth')
			return
		}

		try {
			setUser(JSON.parse(userData))
		} catch (error) {
			console.error('Error parsing user data:', error)
			navigate('/auth')
		}
	}, [navigate])

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

	// function to handle next step.
	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1)
		}
	}

	// function to handle previous step.
	const handlePrevious = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1)
		}
	}

	// function to handle file upload.
	const handleFileUpload = (e) => {
		const file = e.target.files?.[0]
		if (file) {
			// validate file type
			const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
			const validExtensions = ['.pdf', '.docx', '.doc']
			const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
			
			if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
				setParseError('Invalid file type. Please upload a PDF or DOCX file.')
				return
			}
			
			// validate file size (max 10MB)
			if (file.size > 10 * 1024 * 1024) {
				setParseError('File size too large. Please upload a file smaller than 10MB.')
				return
			}
			
			setUploadedFile(file)
			setParseError('')
		}
	}

	// function to handle resume parsing.
	const handleParseResume = async () => {
		if (!uploadedFile) return

		setIsParsing(true)
		setParseError('')

		try {
			const response = await parseResume(uploadedFile)
			const data = response.data
			
			setParsedData(data)

			// merge parsed data into form data
			setFormData(prev => ({
				...prev,
				// merge contact info
				contact: {
					email: data.contact_info?.email || prev.contact.email,
					phone: data.contact_info?.phone || prev.contact.phone,
					github: data.contact_info?.github || prev.contact.github,
					linkedin: data.contact_info?.linkedin || prev.contact.linkedin,
					portfolio: data.contact_info?.portfolio || prev.contact.portfolio,
				},
				// merge education (backend returns list of education objects)
				education: [
					...prev.education,
					...(data.education || []).map(edu => ({
						school: edu.school || '',
						degree: edu.degree || '',
						field: edu.field || '',
						startDate: edu.startDate || '',
						endDate: edu.endDate || '',
						current: edu.current || false,
						id: Date.now() + Math.random(),
						fromParsed: true
					}))
				],
				// merge skills (backend returns list of {name: string, category?: string} objects)
				skills: [
					...prev.skills,
					...(data.skills || []).map(skill => ({
						name: skill.name || skill,
						category: skill.category || null,
						id: Date.now() + Math.random(),
						fromParsed: true
					}))
				],
				// merge experiences (backend returns list of experience objects)
				experiences: [
					...prev.experiences,
					...(data.experiences || []).map(exp => ({
						title: exp.title || '',
						company: exp.company || '',
						description: exp.description || (Array.isArray(exp.description) ? [] : ''),
						startDate: exp.startDate || '',
						endDate: exp.endDate || '',
						current: exp.current || false,
						id: Date.now() + Math.random(),
						fromParsed: true
					}))
				],
				// merge projects (backend returns list of project objects)
				projects: [
					...prev.projects,
					...(data.projects || []).map(proj => ({
						title: proj.title || '',
						description: proj.description || (Array.isArray(proj.description) ? [] : ''),
						techStack: proj.techStack || [],
						id: Date.now() + Math.random(),
						fromParsed: true
					}))
				],
				// extracurriculars and coursework are not parsed from resume, so keep existing
			}))
		} catch (error) {
			console.error('Resume parsing failed:', error)
			setParseError(error.response?.data?.detail || 'Failed to parse resume. Please try again or enter manually.')
		} finally {
			setIsParsing(false)
		}
	}

	// function to handle form completion.
	const handleComplete = async () => {
		try {
			// Save experiences, projects, and skills to backend
			const promises = []
			
			// Helper function to convert month string to ISO date string
			const monthToDate = (monthStr) => {
				if (!monthStr) return null
				// monthStr is like "2024-01", convert to "2024-01-01T00:00:00"
				return `${monthStr}-01T00:00:00`
			}
			
			// Convert experiences (handle date strings)
			if (formData.experiences.length > 0) {
				const experiencesData = formData.experiences.map(exp => {
					// handle dates - could be in "YYYY-MM" format from parsing or "YYYY-MM-DD" format
					let start_date = null
					let end_date = null
					
					if (exp.startDate) {
						// if already in ISO format, use it; otherwise convert
						if (exp.startDate.includes('T')) {
							start_date = exp.startDate
						} else {
							start_date = monthToDate(exp.startDate)
						}
					}
					
					if (exp.current) {
						end_date = null
					} else if (exp.endDate) {
						if (exp.endDate.includes('T')) {
							end_date = exp.endDate
						} else {
							end_date = monthToDate(exp.endDate)
						}
					}
					
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
				promises.push(createExperiencesBulk(experiencesData))
			}
			
			// Convert projects
			if (formData.projects.length > 0) {
				const projectsData = formData.projects.map(proj => ({
					title: proj.title,
					description: Array.isArray(proj.description)
						? proj.description.map(item => `• ${item}`).join('\n')
						: proj.description || null,
					tech_stack: proj.techStack || null,
				}))
				promises.push(createProjectsBulk(projectsData))
			}
			
			// Convert skills
			if (formData.skills.length > 0) {
				const skillsData = formData.skills.map(skill => ({
					name: skill.name,
				}))
				promises.push(createSkillsBulk(skillsData))
			}
			
			// Wait for all saves to complete
			await Promise.all(promises)
			
			// Redirect to home
			navigate('/home')
		} catch (error) {
			console.error('Error saving profile data:', error)
			// Still redirect even if there's an error
			navigate('/home')
		}
	}

	// function to add item to array field.
	const addItem = (field, item) => {
		setFormData(prev => ({
			...prev,
			[field]: [...prev[field], item]
		}))
	}

	// function to remove item from array field.
	const removeItem = (field, index) => {
		setFormData(prev => ({
			...prev,
			[field]: prev[field].filter((_, i) => i !== index)
		}))
	}

	// function to update item in array field.
	const updateItem = (field, index, updatedItem) => {
		setFormData(prev => ({
			...prev,
			[field]: prev[field].map((item, i) => i === index ? updatedItem : item)
		}))
	}

	// render step content.
	const renderStepContent = () => {
		switch (currentStep) {
			case 0: // Welcome
				return (
					<div className="py-8">
						<div className="text-6xl mb-6">👋</div>
						<h2 className="text-3xl font-bold text-gray-900 mb-4">
							Welcome, {user?.name || 'there'}!
						</h2>
						<p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
							Let's get started with some of your background before we get to getting you a job.
							This will only take a few minutes, and you can always come back to add more later.
						</p>

						{/* Resume Upload Section */}
						<div className="mb-8 p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
							<h3 className="text-lg font-semibold text-gray-900 mb-3">
								Upload Your Resume (Optional)
							</h3>
							<p className="text-sm text-gray-600 mb-4">
								Upload a PDF or DOCX resume to automatically fill in your information
							</p>
							
							<div className="flex flex-col items-center gap-4">
								<input
									type="file"
									accept=".pdf,.docx,.doc"
									onChange={handleFileUpload}
									className="hidden"
									id="resume-upload"
								/>
								<label
									htmlFor="resume-upload"
									className="px-6 py-2 border-2 border-brand-pink text-brand-pink font-semibold rounded-lg hover:bg-brand-pink/10 transition-all cursor-pointer"
								>
									{uploadedFile ? uploadedFile.name : 'Choose File'}
								</label>

								{uploadedFile && (
									<button
										onClick={handleParseResume}
										disabled={isParsing}
										className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isParsing ? 'Parsing Resume...' : 'Parse Resume'}
									</button>
								)}

								{isParsing && (
									<div className="flex items-center gap-2 text-sm text-gray-600">
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-pink"></div>
										<span>Extracting information from your resume...</span>
									</div>
								)}

								{parsedData && (
									<div className="mt-4 w-full">
										<div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-left mb-4">
											<p className="font-semibold text-green-800 mb-2">✓ Resume parsed successfully!</p>
											<div className="text-green-700 space-y-1">
												{parsedData.contact_info && (parsedData.contact_info.email || parsedData.contact_info.github || parsedData.contact_info.linkedin || parsedData.contact_info.portfolio) && (
													<p>• Found contact information</p>
												)}
												{parsedData.education?.length > 0 && (
													<p>• Found {parsedData.education.length} education entry/entries</p>
												)}
												{parsedData.experiences?.length > 0 && (
													<p>• Found {parsedData.experiences.length} experience(s)</p>
												)}
												{parsedData.skills?.length > 0 && (
													<p>• Found {parsedData.skills.length} skill(s)</p>
												)}
												{parsedData.projects?.length > 0 && (
													<p>• Found {parsedData.projects.length} project(s)</p>
												)}
											</div>
											{parsedData.warnings?.length > 0 && (
												<div className="mt-2 text-yellow-700">
													<p className="font-semibold">Note:</p>
													{parsedData.warnings.map((warning, i) => (
														<p key={i}>• {warning}</p>
													))}
												</div>
											)}
										</div>
										<div className="mt-4 p-4 bg-gray-900 rounded-lg overflow-auto max-h-96">
											<pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
												{JSON.stringify(parsedData, null, 2)}
											</pre>
										</div>
									</div>
								)}

								{parseError && (
									<div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
										{parseError}
									</div>
								)}
							</div>
						</div>

						<div className="flex gap-4 justify-center">
							<button
								onClick={handleNext}
								className="px-8 py-3 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
							>
								{parsedData ? 'Continue with Parsed Data →' : "Let's Get Started →"}
							</button>
						</div>
					</div>
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
					<div className="py-8">
						<div className="text-center mb-8">
							<div className="text-6xl mb-6">🎉</div>
							<h2 className="text-3xl font-bold text-gray-900 mb-4">
								You're All Set!
							</h2>
							<p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
								Great job! You've completed your initial setup. You can always add more information later from your dashboard.
							</p>
						</div>

						{/* Optional: Extracurriculars */}
						{(formData.extracurriculars.length > 0 || formData.coursework.length > 0) && (
							<div className="mb-8 p-6 bg-gray-50 rounded-lg">
								<h3 className="text-xl font-semibold text-gray-900 mb-4">Additional Information</h3>
								
								{formData.extracurriculars.length > 0 && (
									<div className="mb-4">
										<h4 className="font-medium text-gray-700 mb-2">Extracurriculars:</h4>
										<div className="space-y-2">
											{formData.extracurriculars.map((extra, index) => (
												<div key={extra.id || index} className="bg-white p-3 rounded border border-gray-200">
													<p className="font-medium text-gray-900">{extra.name}</p>
													{extra.role && <p className="text-sm text-gray-600">{extra.role}</p>}
												</div>
											))}
										</div>
									</div>
								)}

								{formData.coursework.length > 0 && (
									<div>
										<h4 className="font-medium text-gray-700 mb-2">Coursework:</h4>
										<div className="flex flex-wrap gap-2">
											{formData.coursework.map((course, index) => (
												<span key={course.id || index} className="bg-white px-3 py-1 rounded border border-gray-200 text-sm">
													{course.name}
												</span>
											))}
										</div>
									</div>
								)}
							</div>
						)}

						<div className="text-center">
							<button
								onClick={handleComplete}
								className="px-8 py-3 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
							>
								Go to Dashboard →
							</button>
						</div>
					</div>
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

// ----------- Step Components -----------

// Contact Step Component.
function ContactStep({ contact, onUpdate }) {
	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">Your Contact Information</h2>
			<p className="text-gray-600 mb-6">Add your contact details and professional links.</p>

			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
					<input
						type="email"
						value={contact.email}
						onChange={(e) => onUpdate('email', e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="your.email@example.com"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
					<input
						type="tel"
						value={contact.phone}
						onChange={(e) => onUpdate('phone', e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="(123) 456-7890"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
					<input
						type="url"
						value={contact.github}
						onChange={(e) => onUpdate('github', e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="https://github.com/username"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
					<input
						type="url"
						value={contact.linkedin}
						onChange={(e) => onUpdate('linkedin', e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="https://linkedin.com/in/username"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Portfolio/Website</label>
					<input
						type="url"
						value={contact.portfolio}
						onChange={(e) => onUpdate('portfolio', e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="https://yourwebsite.com"
					/>
				</div>
			</div>
		</div>
	)
}

// Education Step Component.
function EducationStep({ education, onAdd, onRemove, onUpdate }) {
	const [form, setForm] = useState({
		school: '',
		degree: '',
		field: '',
		startDate: '',
		endDate: '',
		current: false,
	})

	// helper function to format date strings (YYYY-MM format)
	const formatDate = (dateStr) => {
		if (!dateStr) return 'Not specified'
		try {
			// handle YYYY-MM format
			if (dateStr.match(/^\d{4}-\d{2}$/)) {
				const [year, month] = dateStr.split('-')
				const date = new Date(parseInt(year), parseInt(month) - 1, 1)
				return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
			}
			// handle other formats
			const date = new Date(dateStr)
			if (isNaN(date.getTime())) return dateStr
			return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
		} catch {
			return dateStr
		}
	}

	const handleSubmit = (e) => {
		e.preventDefault()
		if (form.school && form.degree) {
			onAdd({ ...form, id: Date.now() })
			setForm({ school: '', degree: '', field: '', startDate: '', endDate: '', current: false })
		}
	}

	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">Tell us about your education</h2>
			<p className="text-gray-600 mb-6">Add your educational background. You can add multiple entries.</p>

			<form onSubmit={handleSubmit} className="space-y-4 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">School/University *</label>
						<input
							type="text"
							value={form.school}
							onChange={(e) => setForm({ ...form, school: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Degree *</label>
						<input
							type="text"
							value={form.degree}
							onChange={(e) => setForm({ ...form, degree: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							placeholder="e.g., Bachelor of Science"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
						<input
							type="text"
							value={form.field}
							onChange={(e) => setForm({ ...form, field: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							placeholder="e.g., Computer Science"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
						<input
							type="month"
							value={form.startDate}
							onChange={(e) => setForm({ ...form, startDate: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
						<input
							type="month"
							value={form.endDate}
							onChange={(e) => setForm({ ...form, endDate: e.target.value, current: false })}
							disabled={form.current}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent disabled:bg-gray-100"
						/>
					</div>
					<div className="flex items-center pt-6">
						<label className="flex items-center">
							<input
								type="checkbox"
								checked={form.current}
								onChange={(e) => setForm({ ...form, current: e.target.checked, endDate: '' })}
								className="mr-2"
							/>
							<span className="text-sm text-gray-700">Currently attending</span>
						</label>
					</div>
				</div>
				<button
					type="submit"
					className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
				>
					Add Education
				</button>
			</form>

			{education.length > 0 && (
				<div className="space-y-3 mt-6">
					<h3 className="font-semibold text-gray-900 mb-4">Added Education ({education.length}):</h3>
					{education.map((edu, index) => (
						<div key={edu.id || index} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
							<div className="flex justify-between items-start">
								<div className="flex-1">
									{/* School Name */}
									<div className="flex items-center gap-2 mb-2">
										<h4 className="text-lg font-semibold text-gray-900">{edu.school || 'Unnamed School'}</h4>
										{edu.fromParsed && (
											<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
												Parsed
											</span>
										)}
									</div>
									
									{/* Degree and Field */}
									<div className="mb-2">
										<p className="text-base text-gray-700 font-medium">
											{edu.degree || 'Degree not specified'}
										</p>
										{edu.field && (
											<p className="text-sm text-gray-600 mt-0.5">
												Field: <span className="font-medium">{edu.field}</span>
											</p>
										)}
									</div>
									
									{/* Dates */}
									<div className="flex items-center gap-2 text-sm text-gray-500">
										<span className="font-medium">Dates:</span>
										<span>
											{formatDate(edu.startDate)}
											{' - '}
											{edu.current ? (
												<span className="text-brand-pink font-semibold">Present</span>
											) : (
												formatDate(edu.endDate)
											)}
										</span>
									</div>
								</div>
								
								{/* Remove Button */}
								<button
									onClick={() => onRemove(index)}
									className="ml-4 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
									title="Remove this education entry"
								>
									Remove
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

// Skills Step Component.
function SkillsStep({ skills, onAdd, onRemove }) {
	const [skillInput, setSkillInput] = useState('')

	const handleAddSkill = (e) => {
		e.preventDefault()
		if (skillInput.trim()) {
			onAdd({ name: skillInput.trim(), id: Date.now() })
			setSkillInput('')
		}
	}

	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">What are your skills?</h2>
			<p className="text-gray-600 mb-6">Add your technical and professional skills. Press Enter or click Add after each skill.</p>

			<form onSubmit={handleAddSkill} className="mb-6">
				<div className="flex gap-2">
					<input
						type="text"
						value={skillInput}
						onChange={(e) => setSkillInput(e.target.value)}
						className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="e.g., JavaScript, Python, Project Management"
					/>
					<button
						type="submit"
						className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
					>
						Add
					</button>
				</div>
			</form>

			{skills.length > 0 && (
				<div className="mt-6">
					<h3 className="font-semibold text-gray-900 mb-4">Your Skills ({skills.length}):</h3>
					
					{/* Group skills by category if they have categories */}
					{(() => {
						// Check if any skills have categories
						const skillsWithCategories = skills.filter(s => s.category)
						const skillsWithoutCategories = skills.filter(s => !s.category)
						
						if (skillsWithCategories.length > 0) {
							// Group by category
							const groupedByCategory = {}
							skillsWithCategories.forEach(skill => {
								const category = skill.category || 'Other'
								if (!groupedByCategory[category]) {
									groupedByCategory[category] = []
								}
								groupedByCategory[category].push(skill)
							})
							
							return (
								<div className="space-y-4">
									{/* Skills grouped by category */}
									{Object.entries(groupedByCategory).map(([category, categorySkills]) => (
										<div key={category} className="bg-white border border-gray-200 rounded-lg p-4">
											<div className="flex items-center justify-between mb-3">
												<h4 className="text-base font-semibold text-gray-900">
													{category}:
												</h4>
												<span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
													{categorySkills.length} {categorySkills.length === 1 ? 'skill' : 'skills'}
												</span>
											</div>
											<div className="flex flex-wrap gap-2">
												{categorySkills.map((skill, idx) => {
													const originalIndex = skills.findIndex(s => s.id === skill.id)
													return (
														<div
															key={skill.id || idx}
															className="bg-brand-pink/10 border border-brand-pink/20 text-brand-pink px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium"
														>
															<span>{skill.name}</span>
															{skill.fromParsed && (
																<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
																	Parsed
																</span>
															)}
															<button
																onClick={() => onRemove(originalIndex)}
																className="text-brand-pink hover:text-red-600 hover:bg-red-50 rounded px-1 transition-colors"
																title="Remove this skill"
															>
																×
															</button>
														</div>
													)
												})}
											</div>
										</div>
									))}
									
									{/* Skills without categories */}
									{skillsWithoutCategories.length > 0 && (
										<div className="bg-white border border-gray-200 rounded-lg p-4">
											<div className="flex items-center justify-between mb-3">
												<h4 className="text-base font-semibold text-gray-900">
													Other Skills:
												</h4>
												<span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
													{skillsWithoutCategories.length} {skillsWithoutCategories.length === 1 ? 'skill' : 'skills'}
												</span>
											</div>
											<div className="flex flex-wrap gap-2">
												{skillsWithoutCategories.map((skill, idx) => {
													const originalIndex = skills.findIndex(s => s.id === skill.id)
													return (
														<div
															key={skill.id || idx}
															className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium ${
																skill.fromParsed
																	? 'bg-blue-50 border border-blue-200 text-blue-800'
																	: 'bg-brand-pink/10 border border-brand-pink/20 text-brand-pink'
															}`}
														>
															<span>{skill.name}</span>
															{skill.fromParsed && (
																<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
																	Parsed
																</span>
															)}
															<button
																onClick={() => onRemove(originalIndex)}
																className={`rounded px-1 transition-colors ${
																	skill.fromParsed
																		? 'text-blue-600 hover:text-red-600 hover:bg-red-50'
																		: 'text-brand-pink hover:text-red-600 hover:bg-red-50'
																}`}
																title="Remove this skill"
															>
																×
															</button>
														</div>
													)
												})}
											</div>
										</div>
									)}
								</div>
							)
						} else {
							// No categories, show simple list grouped by parsed/manual
							return (
								<div className="space-y-4">
									{skills.some(s => s.fromParsed) && skills.some(s => !s.fromParsed) ? (
										<>
											{/* Parsed Skills */}
											{skills.some(s => s.fromParsed) && (
												<div className="bg-white border border-gray-200 rounded-lg p-4">
													<div className="flex items-center justify-between mb-3">
														<h4 className="text-base font-semibold text-gray-700">From Resume:</h4>
														<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
															{skills.filter(s => s.fromParsed).length} skills
														</span>
													</div>
													<div className="flex flex-wrap gap-2">
														{skills.filter(s => s.fromParsed).map((skill, idx) => {
															const originalIndex = skills.findIndex(s => s.id === skill.id)
															return (
																<div
																	key={skill.id || idx}
																	className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium"
																>
																	<span>{skill.name}</span>
																	<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
																		Parsed
																	</span>
																	<button
																		onClick={() => onRemove(originalIndex)}
																		className="text-blue-600 hover:text-red-600 hover:bg-red-50 rounded px-1 transition-colors"
																		title="Remove this skill"
																	>
																		×
																	</button>
																</div>
															)
														})}
													</div>
												</div>
											)}
											
											{/* Manually Added Skills */}
											{skills.some(s => !s.fromParsed) && (
												<div className="bg-white border border-gray-200 rounded-lg p-4">
													<div className="flex items-center justify-between mb-3">
														<h4 className="text-base font-semibold text-gray-700">Manually Added:</h4>
														<span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
															{skills.filter(s => !s.fromParsed).length} skills
														</span>
													</div>
													<div className="flex flex-wrap gap-2">
														{skills.filter(s => !s.fromParsed).map((skill, idx) => {
															const originalIndex = skills.findIndex(s => s.id === skill.id)
															return (
																<div
																	key={skill.id || idx}
																	className="bg-brand-pink/10 border border-brand-pink/20 text-brand-pink px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium"
																>
																	<span>{skill.name}</span>
																	<button
																		onClick={() => onRemove(originalIndex)}
																		className="text-brand-pink hover:text-red-600 hover:bg-red-50 rounded px-1 transition-colors"
																		title="Remove this skill"
																	>
																		×
																	</button>
																</div>
															)
														})}
													</div>
												</div>
											)}
										</>
									) : (
										<div className="flex flex-wrap gap-2">
											{skills.map((skill, index) => (
												<div
													key={skill.id || index}
													className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium ${
														skill.fromParsed
															? 'bg-blue-50 border border-blue-200 text-blue-800'
															: 'bg-brand-pink/10 border border-brand-pink/20 text-brand-pink'
													}`}
												>
													<span>{skill.name}</span>
													{skill.fromParsed && (
														<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
															Parsed
														</span>
													)}
													<button
														onClick={() => onRemove(index)}
														className={`rounded px-1 transition-colors ${
															skill.fromParsed
																? 'text-blue-600 hover:text-red-600 hover:bg-red-50'
																: 'text-brand-pink hover:text-red-600 hover:bg-red-50'
														}`}
														title="Remove this skill"
													>
														×
													</button>
												</div>
											))}
										</div>
									)}
								</div>
							)
						}
					})()}
				</div>
			)}
		</div>
	)
}

// Experience Step Component.
function ExperienceStep({ experiences, onAdd, onRemove, onUpdate }) {
	const [form, setForm] = useState({
		title: '',
		company: '',
		description: '',
		startDate: '',
		endDate: '',
		current: false,
	})

	// helper function to format date strings (YYYY-MM format)
	const formatDate = (dateStr) => {
		if (!dateStr) return 'Not specified'
		try {
			// handle YYYY-MM format
			if (dateStr.match(/^\d{4}-\d{2}$/)) {
				const [year, month] = dateStr.split('-')
				const date = new Date(parseInt(year), parseInt(month) - 1, 1)
				return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
			}
			// handle other formats
			const date = new Date(dateStr)
			if (isNaN(date.getTime())) return dateStr
			return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
		} catch {
			return dateStr
		}
	}

	const handleSubmit = (e) => {
		e.preventDefault()
		if (form.title && form.company) {
			onAdd({ ...form, id: Date.now() })
			setForm({ title: '', company: '', description: '', startDate: '', endDate: '', current: false })
		}
	}

	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">Share your work experience</h2>
			<p className="text-gray-600 mb-6">Add your professional experiences. You can add multiple entries.</p>

			<form onSubmit={handleSubmit} className="space-y-4 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
						<input
							type="text"
							value={form.title}
							onChange={(e) => setForm({ ...form, title: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
						<input
							type="text"
							value={form.company}
							onChange={(e) => setForm({ ...form, company: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							required
						/>
					</div>
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
						<textarea
							value={form.description}
							onChange={(e) => setForm({ ...form, description: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							rows="3"
							placeholder="Describe your responsibilities and achievements..."
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
						<input
							type="month"
							value={form.startDate}
							onChange={(e) => setForm({ ...form, startDate: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
						<input
							type="month"
							value={form.endDate}
							onChange={(e) => setForm({ ...form, endDate: e.target.value, current: false })}
							disabled={form.current}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent disabled:bg-gray-100"
						/>
					</div>
					<div className="flex items-center pt-2">
						<label className="flex items-center">
							<input
								type="checkbox"
								checked={form.current}
								onChange={(e) => setForm({ ...form, current: e.target.checked, endDate: '' })}
								className="mr-2"
							/>
							<span className="text-sm text-gray-700">I currently work here</span>
						</label>
					</div>
				</div>
				<button
					type="submit"
					className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
				>
					Add Experience
				</button>
			</form>

			{experiences.length > 0 && (
				<div className="space-y-3 mt-6">
					<h3 className="font-semibold text-gray-900 mb-4">Added Experiences ({experiences.length}):</h3>
					{experiences.map((exp, index) => (
						<div key={exp.id || index} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
							<div className="flex justify-between items-start">
								<div className="flex-1">
									{/* Job Title */}
									<div className="flex items-center gap-2 mb-2">
										<h4 className="text-lg font-semibold text-gray-900">{exp.title || 'Untitled Position'}</h4>
										{exp.fromParsed && (
											<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
												Parsed
											</span>
										)}
									</div>
									
									{/* Company */}
									<div className="mb-2">
										<p className="text-base text-gray-700 font-medium">
											{exp.company || 'Company not specified'}
										</p>
									</div>
									
									{/* Description */}
									{exp.description && (
										<div className="mb-2">
											<div className="text-sm text-gray-600 leading-relaxed">
												{Array.isArray(exp.description) ? (
													// description is an array of bullet points
													exp.description.map((item, idx) => (
														<div key={idx} className="ml-4 mb-1">
															• {item}
														</div>
													))
												) : (
													// description is a string
													exp.description.split('\n').map((line, idx) => {
														// format bullet points
														if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
															return (
																<div key={idx} className="ml-4 mb-1">
																	{line.trim()}
																</div>
															)
														}
														return (
															<div key={idx} className="mb-1">
																{line}
															</div>
														)
													})
												)}
											</div>
										</div>
									)}
									
									{/* Dates */}
									<div className="flex items-center gap-2 text-sm text-gray-500">
										<span className="font-medium">Dates:</span>
										<span>
											{formatDate(exp.startDate)}
											{' - '}
											{exp.current ? (
												<span className="text-brand-pink font-semibold">Present</span>
											) : (
												formatDate(exp.endDate)
											)}
										</span>
									</div>
								</div>
								
								{/* Remove Button */}
								<button
									onClick={() => onRemove(index)}
									className="ml-4 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
									title="Remove this experience entry"
								>
									Remove
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

// Projects Step Component.
function ProjectsStep({ projects, onAdd, onRemove, onUpdate }) {
	const [form, setForm] = useState({
		title: '',
		description: '',
		techStack: '',
	})

	const handleSubmit = (e) => {
		e.preventDefault()
		if (form.title) {
			const techStackArray = form.techStack
				.split(',')
				.map(tech => tech.trim())
				.filter(tech => tech.length > 0)
			onAdd({ ...form, techStack: techStackArray, id: Date.now() })
			setForm({ title: '', description: '', techStack: '' })
		}
	}

	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">Showcase your projects</h2>
			<p className="text-gray-600 mb-6">Add projects you've worked on. You can add multiple entries.</p>

			<form onSubmit={handleSubmit} className="space-y-4 mb-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Project Title *</label>
					<input
						type="text"
						value={form.title}
						onChange={(e) => setForm({ ...form, title: e.target.value })}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						required
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
					<textarea
						value={form.description}
						onChange={(e) => setForm({ ...form, description: e.target.value })}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						rows="3"
						placeholder="Describe your project..."
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Tech Stack</label>
					<input
						type="text"
						value={form.techStack}
						onChange={(e) => setForm({ ...form, techStack: e.target.value })}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="e.g., React, Node.js, PostgreSQL (comma-separated)"
					/>
				</div>
				<button
					type="submit"
					className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
				>
					Add Project
				</button>
			</form>

			{projects.length > 0 && (
				<div className="space-y-3 mt-6">
					<h3 className="font-semibold text-gray-900 mb-4">Added Projects ({projects.length}):</h3>
					{projects.map((project, index) => (
						<div key={project.id || index} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
							<div className="flex justify-between items-start">
								<div className="flex-1">
									{/* Project Title */}
									<div className="flex items-center gap-2 mb-2">
										<h4 className="text-lg font-semibold text-gray-900">{project.title || 'Untitled Project'}</h4>
										{project.fromParsed && (
											<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
												Parsed
											</span>
										)}
									</div>
									
									{/* Description */}
									{project.description && (
										<div className="mb-3">
											<div className="text-sm text-gray-600 leading-relaxed">
												{Array.isArray(project.description) ? (
													// description is an array of bullet points
													project.description.map((item, idx) => (
														<div key={idx} className="ml-4 mb-1">
															• {item}
														</div>
													))
												) : (
													// description is a string
													<p>{project.description}</p>
												)}
											</div>
										</div>
									)}
									
									{/* Tech Stack */}
									{project.techStack && project.techStack.length > 0 && (
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-sm font-medium text-gray-500">Tech Stack:</span>
											<div className="flex flex-wrap gap-2">
												{project.techStack.map((tech, i) => (
													<span key={i} className="text-xs bg-brand-pink/10 text-brand-pink px-3 py-1 rounded-full font-medium">
														{tech}
													</span>
												))}
											</div>
										</div>
									)}
								</div>
								
								{/* Remove Button */}
								<button
									onClick={() => onRemove(index)}
									className="ml-4 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
									title="Remove this project entry"
								>
									Remove
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

// Extracurriculars Step Component.
function ExtracurricularsStep({ extracurriculars, onAdd, onRemove, onUpdate }) {
	const [form, setForm] = useState({
		name: '',
		role: '',
		description: '',
		startDate: '',
		endDate: '',
		current: false,
	})

	const handleSubmit = (e) => {
		e.preventDefault()
		if (form.name) {
			onAdd({ ...form, id: Date.now() })
			setForm({ name: '', role: '', description: '', startDate: '', endDate: '', current: false })
		}
	}

	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">Tell us about your extracurriculars</h2>
			<p className="text-gray-600 mb-6">Add clubs, organizations, volunteer work, or other activities. You can add multiple entries.</p>

			<form onSubmit={handleSubmit} className="space-y-4 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Activity/Organization Name *</label>
						<input
							type="text"
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Your Role</label>
						<input
							type="text"
							value={form.role}
							onChange={(e) => setForm({ ...form, role: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							placeholder="e.g., President, Volunteer, Member"
						/>
					</div>
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
						<textarea
							value={form.description}
							onChange={(e) => setForm({ ...form, description: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							rows="3"
							placeholder="Describe your involvement and achievements..."
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
						<input
							type="month"
							value={form.startDate}
							onChange={(e) => setForm({ ...form, startDate: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
						<input
							type="month"
							value={form.endDate}
							onChange={(e) => setForm({ ...form, endDate: e.target.value, current: false })}
							disabled={form.current}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent disabled:bg-gray-100"
						/>
					</div>
					<div className="flex items-center pt-2">
						<label className="flex items-center">
							<input
								type="checkbox"
								checked={form.current}
								onChange={(e) => setForm({ ...form, current: e.target.checked, endDate: '' })}
								className="mr-2"
							/>
							<span className="text-sm text-gray-700">Currently active</span>
						</label>
					</div>
				</div>
				<button
					type="submit"
					className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
				>
					Add Extracurricular
				</button>
			</form>

			{extracurriculars.length > 0 && (
				<div className="space-y-2">
					<h3 className="font-semibold text-gray-900">Added Extracurriculars:</h3>
					{extracurriculars.map((extra, index) => (
						<div key={extra.id || index} className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
							<div>
								<p className="font-medium text-gray-900">{extra.name}</p>
								{extra.role && <p className="text-sm text-gray-600">{extra.role}</p>}
								{extra.description && <p className="text-sm text-gray-500 mt-1">{extra.description}</p>}
								<p className="text-xs text-gray-500 mt-1">
									{extra.startDate} - {extra.current ? 'Present' : extra.endDate || 'N/A'}
								</p>
							</div>
							<button
								onClick={() => onRemove(index)}
								className="text-red-500 hover:text-red-700 text-sm"
							>
								Remove
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

// Coursework Step Component.
function CourseworkStep({ coursework, onAdd, onRemove }) {
	const [courseInput, setCourseInput] = useState('')

	const handleAddCourse = (e) => {
		e.preventDefault()
		if (courseInput.trim()) {
			onAdd({ name: courseInput.trim(), id: Date.now() })
			setCourseInput('')
		}
	}

	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">What relevant coursework have you completed?</h2>
			<p className="text-gray-600 mb-6">Add courses that are relevant to your career. Press Enter or click Add after each course.</p>

			<form onSubmit={handleAddCourse} className="mb-6">
				<div className="flex gap-2">
					<input
						type="text"
						value={courseInput}
						onChange={(e) => setCourseInput(e.target.value)}
						className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="e.g., Data Structures, Machine Learning, Web Development"
					/>
					<button
						type="submit"
						className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
					>
						Add
					</button>
				</div>
			</form>

			{coursework.length > 0 && (
				<div>
					<h3 className="font-semibold text-gray-900 mb-3">Your Coursework:</h3>
					<div className="flex flex-wrap gap-2">
						{coursework.map((course, index) => (
							<div
								key={course.id || index}
								className="bg-brand-pink/10 text-brand-pink px-4 py-2 rounded-full flex items-center gap-2"
							>
								<span>{course.name}</span>
								<button
									onClick={() => onRemove(index)}
									className="text-brand-pink hover:text-red-500"
								>
									×
								</button>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

// export.
export default AccountSetup

