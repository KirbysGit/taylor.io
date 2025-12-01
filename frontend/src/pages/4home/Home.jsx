// pages/4home/Home.jsx

// homepage component (shown after successful login/signup).

// imports.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyProfile } from '@/api/services/profile'
import { listTemplates } from '@/api/services/resume'
import AddExperienceModal from '@/components/modals/AddExperienceModal'
import AddProjectModal from '@/components/modals/AddProjectModal'
import AddSkillModal from '@/components/modals/AddSkillModal'

// ----------- main component -----------

function Home() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
	const [profile, setProfile] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [showExperienceModal, setShowExperienceModal] = useState(false)
	const [showProjectModal, setShowProjectModal] = useState(false)
	const [showSkillModal, setShowSkillModal] = useState(false)
	const [resumeFormat, setResumeFormat] = useState('pdf') // 'pdf' or 'docx'
	const [docxTemplate, setDocxTemplate] = useState('main') // template for DOCX
	const [availableTemplates, setAvailableTemplates] = useState(['main']) // available templates

	// get user profile from backend on mount.
	useEffect(() => {
		const fetchProfile = async () => {
			const token = localStorage.getItem('token')
			const userData = localStorage.getItem('user')
			
			// if no token or user, redirect to auth page.
			if (!token || !userData) {
				navigate('/auth')
				return
			}

			try {
				// parse user data from localStorage.
				const parsedUser = JSON.parse(userData)
				setUser(parsedUser)

				// fetch full profile from backend.
				const response = await getMyProfile()
				setProfile(response.data)
				
				// fetch available templates.
				const templatesResponse = await listTemplates()
				if (templatesResponse?.data?.templates) {
					setAvailableTemplates(templatesResponse.data.templates)
					// if current template not in list, use first available
					if (!templatesResponse.data.templates.includes('main')) {
						setDocxTemplate(templatesResponse.data.templates[0] || 'main')
					}
				}
			} catch (error) {
				console.error('Error fetching profile:', error)
				// if error, still show user from localStorage
				try {
					setUser(JSON.parse(userData))
				} catch (parseError) {
					navigate('/auth')
				}
			} finally {
				setIsLoading(false)
			}
		}

		fetchProfile()
	}, [navigate])

	// function to refresh profile data.
	const refreshProfile = async () => {
		try {
			const response = await getMyProfile()
			setProfile(response.data)
		} catch (error) {
			console.error('Error refreshing profile:', error)
		}
	}

	// function to handle resume generation - navigate to preview page.
	const handleGenerateResume = () => {
		// navigate to preview page with format and template params.
		navigate(`/resume/preview?format=${resumeFormat}&template=${docxTemplate}`)
	}

	// function to handle logout.
	const handleLogout = () => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}

	return (
		<div className="min-h-screen flex flex-col bg-cream">
			{/* Header */}
			<header className="bg-brand-pink text-white py-4 shadow-md">
				<div className="max-w-6xl mx-auto px-8 flex justify-between items-center">
					<h1 className="text-2xl font-bold">taylor.io</h1>
					<div className="flex items-center gap-4">
						{user && (
							<span className="text-sm opacity-90">
								Welcome, {user.name}
							</span>
						)}
						<button
							onClick={handleLogout}
							className="px-4 py-2 bg-white-bright text-brand-pink font-semibold rounded-lg hover:opacity-90 transition-all"
						>
							Logout
						</button>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1 py-12 bg-cream">
				<div className="max-w-6xl mx-auto px-8">
					{/* Welcome Section */}
					<section className="mb-12">
						<div className="bg-white-bright rounded-xl shadow-sm p-8">
							<h2 className="text-3xl font-bold mb-2 text-gray-900">
								Welcome back, {user?.name || 'there'}! 👋
							</h2>
							<p className="text-gray-600 mb-4">
								Your professional database is ready. Start by adding a job description to tailor your resume, or customize your information below.
							</p>
							<div className="mt-4 space-y-4">
								<div className="flex flex-wrap gap-3">
									<button className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all">
										Add Job Description
									</button>
									<button
										onClick={handleGenerateResume}
										className="px-6 py-2 border-2 border-brand-pink text-brand-pink font-semibold rounded-lg hover:bg-brand-pink/10 transition-all"
									>
										Preview & Generate Resume
									</button>
								</div>
								{/* Format Selection */}
								<div className="flex items-center gap-4">
									<label className="text-sm font-medium text-gray-700">Format:</label>
									<div className="flex gap-2">
										<button
											onClick={() => setResumeFormat('pdf')}
											className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
												resumeFormat === 'pdf'
													? 'bg-brand-pink text-white'
													: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
											}`}
										>
											PDF
										</button>
										<button
											onClick={() => setResumeFormat('docx')}
											className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
												resumeFormat === 'docx'
													? 'bg-brand-pink text-white'
													: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
											}`}
										>
											Word (DOCX)
										</button>
									</div>
								</div>
								{/* Template Selection (only for DOCX) */}
								{resumeFormat === 'docx' && (
									<div className="flex items-center gap-4">
										<label className="text-sm font-medium text-gray-700">Template:</label>
										<select
											value={docxTemplate}
											onChange={(e) => setDocxTemplate(e.target.value)}
											className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
										>
											{availableTemplates.map(template => (
												<option key={template} value={template}>
													{template.charAt(0).toUpperCase() + template.slice(1)}
												</option>
											))}
										</select>
									</div>
								)}
							</div>
						</div>
					</section>

					{/* Quick Stats / Overview */}
					<section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
						<div className="bg-white-bright p-6 rounded-xl shadow-sm">
							<h3 className="text-xl font-bold mb-2 text-gray-900">Experiences</h3>
							<p className="text-3xl font-bold text-brand-pink mb-1">
								{isLoading ? '...' : (profile?.experiences?.length || 0)}
							</p>
							<p className="text-sm text-gray-600">Work history entries</p>
						</div>
						<div className="bg-white-bright p-6 rounded-xl shadow-sm">
							<h3 className="text-xl font-bold mb-2 text-gray-900">Projects</h3>
							<p className="text-3xl font-bold text-brand-pink mb-1">
								{isLoading ? '...' : (profile?.projects?.length || 0)}
							</p>
							<p className="text-sm text-gray-600">Showcased projects</p>
						</div>
						<div className="bg-white-bright p-6 rounded-xl shadow-sm">
							<h3 className="text-xl font-bold mb-2 text-gray-900">Skills</h3>
							<p className="text-3xl font-bold text-brand-pink mb-1">
								{isLoading ? '...' : (profile?.skills?.length || 0)}
							</p>
							<p className="text-sm text-gray-600">Technical skills</p>
						</div>
					</section>

					{/* Display User Information */}
					{!isLoading && profile && (
						<section className="mb-12">
							<h2 className="text-2xl font-bold text-gray-900 mb-6">Your Information</h2>
							
							{/* Contact Information Display */}
							{profile.contact && (
								<div className="bg-white-bright rounded-xl shadow-sm p-6 mb-6">
									<h3 className="text-xl font-bold mb-4 text-gray-900">Contact Information</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{profile.contact.email && (
											<div>
												<span className="text-sm font-medium text-gray-600">Email:</span>
												<p className="text-gray-900">{profile.contact.email}</p>
											</div>
										)}
										{profile.contact.phone && (
											<div>
												<span className="text-sm font-medium text-gray-600">Phone:</span>
												<p className="text-gray-900">{profile.contact.phone}</p>
											</div>
										)}
										{profile.contact.github && (
											<div>
												<span className="text-sm font-medium text-gray-600">GitHub:</span>
												<a 
													href={profile.contact.github} 
													target="_blank" 
													rel="noopener noreferrer"
													className="text-brand-pink hover:underline"
												>
													{profile.contact.github}
												</a>
											</div>
										)}
										{profile.contact.linkedin && (
											<div>
												<span className="text-sm font-medium text-gray-600">LinkedIn:</span>
												<a 
													href={profile.contact.linkedin} 
													target="_blank" 
													rel="noopener noreferrer"
													className="text-brand-pink hover:underline"
												>
													{profile.contact.linkedin}
												</a>
											</div>
										)}
										{profile.contact.portfolio && (
											<div>
												<span className="text-sm font-medium text-gray-600">Portfolio:</span>
												<a 
													href={profile.contact.portfolio} 
													target="_blank" 
													rel="noopener noreferrer"
													className="text-brand-pink hover:underline"
												>
													{profile.contact.portfolio}
												</a>
											</div>
										)}
									</div>
								</div>
							)}
							
							{/* Education Display */}
							{profile.education && profile.education.length > 0 && (
								<div className="bg-white-bright rounded-xl shadow-sm p-6 mb-6">
									<h3 className="text-xl font-bold mb-4 text-gray-900">Education</h3>
									<div className="space-y-4">
										{profile.education.map((edu) => (
											<div key={edu.id} className="border-l-4 border-brand-pink pl-4">
												{edu.school && <h4 className="font-semibold text-gray-900">{edu.school}</h4>}
												{edu.degree && <p className="text-sm text-gray-700">{edu.degree}</p>}
												{edu.field && <p className="text-sm text-gray-600">{edu.field}</p>}
												<div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
													{edu.gpa && <span>GPA: {edu.gpa}</span>}
													{edu.location && <span>{edu.location}</span>}
													{edu.start_date && (
														<span>
															{new Date(edu.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {edu.end_date ? new Date(edu.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present'}
														</span>
													)}
												</div>
												{edu.honors_awards && (
													<p className="text-xs text-gray-600 mt-2">
														<span className="font-medium">Honors & Awards:</span> {edu.honors_awards}
													</p>
												)}
												{edu.clubs_extracurriculars && (
													<p className="text-xs text-gray-600 mt-1">
														<span className="font-medium">Clubs & Extracurriculars:</span> {edu.clubs_extracurriculars}
													</p>
												)}
												{edu.relevant_coursework && (
													<p className="text-xs text-gray-600 mt-1">
														<span className="font-medium">Relevant Coursework:</span> {edu.relevant_coursework}
													</p>
												)}
											</div>
										))}
									</div>
								</div>
							)}
							
							{/* Skills Display */}
							{profile.skills && profile.skills.length > 0 && (
								<div className="bg-white-bright rounded-xl shadow-sm p-6 mb-6">
									<h3 className="text-xl font-bold mb-4 text-gray-900">Skills</h3>
									<div className="flex flex-wrap gap-2">
										{profile.skills.map((skill) => (
											<span
												key={skill.id}
												className="bg-brand-pink/10 text-brand-pink px-4 py-2 rounded-full text-sm font-medium"
											>
												{skill.name}
											</span>
										))}
									</div>
								</div>
							)}

							{/* Experiences Display */}
							{profile.experiences && profile.experiences.length > 0 && (
								<div className="bg-white-bright rounded-xl shadow-sm p-6 mb-6">
									<h3 className="text-xl font-bold mb-4 text-gray-900">Experiences</h3>
									<div className="space-y-4">
										{profile.experiences.map((exp) => (
											<div key={exp.id} className="border-l-4 border-brand-pink pl-4">
												<h4 className="font-semibold text-gray-900">{exp.title}</h4>
												{exp.company && <p className="text-sm text-gray-600">{exp.company}</p>}
												{exp.description && <p className="text-sm text-gray-500 mt-1">{exp.description}</p>}
												{exp.start_date && (
													<p className="text-xs text-gray-400 mt-1">
														{new Date(exp.start_date).toLocaleDateString()} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Present'}
													</p>
												)}
											</div>
										))}
									</div>
								</div>
							)}

							{/* Projects Display */}
							{profile.projects && profile.projects.length > 0 && (
								<div className="bg-white-bright rounded-xl shadow-sm p-6 mb-6">
									<h3 className="text-xl font-bold mb-4 text-gray-900">Projects</h3>
									<div className="space-y-4">
										{profile.projects.map((project) => (
											<div key={project.id} className="border-l-4 border-brand-pink pl-4">
												<h4 className="font-semibold text-gray-900">{project.title}</h4>
												{project.description && <p className="text-sm text-gray-600 mt-1">{project.description}</p>}
												{project.tech_stack && project.tech_stack.length > 0 && (
													<div className="flex flex-wrap gap-1 mt-2">
														{project.tech_stack.map((tech, i) => (
															<span key={i} className="text-xs bg-gray-200 px-2 py-1 rounded">
																{tech}
															</span>
														))}
													</div>
												)}
											</div>
										))}
									</div>
								</div>
							)}

							{/* Empty State */}
							{(!profile.skills || profile.skills.length === 0) &&
							 (!profile.experiences || profile.experiences.length === 0) &&
							 (!profile.projects || profile.projects.length === 0) &&
							 (!profile.education || profile.education.length === 0) && (
								<div className="bg-white-bright rounded-xl shadow-sm p-8 text-center">
									<p className="text-gray-600 mb-4">You haven't added any information yet.</p>
									<button
										onClick={() => navigate('/setup')}
										className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
									>
										Complete Your Profile
									</button>
								</div>
							)}
						</section>
					)}

					{/* Action Cards */}
					<section className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="bg-white-bright p-8 rounded-xl shadow-sm hover:-translate-y-1 transition-all hover:shadow-md">
							<div className="text-4xl mb-4">💼</div>
							<h3 className="text-2xl font-bold mb-2 text-gray-900">Add Experience</h3>
							<p className="text-gray-600 mb-4">
								Highlight your professional journey and work history.
							</p>
							<button
								onClick={() => setShowExperienceModal(true)}
								className="text-brand-pink font-semibold hover:opacity-80"
							>
								Add Experience →
							</button>
						</div>

						<div className="bg-white-bright p-8 rounded-xl shadow-sm hover:-translate-y-1 transition-all hover:shadow-md">
							<div className="text-4xl mb-4">🚀</div>
							<h3 className="text-2xl font-bold mb-2 text-gray-900">Add Project</h3>
							<p className="text-gray-600 mb-4">
								Showcase your best work and projects.
							</p>
							<button
								onClick={() => setShowProjectModal(true)}
								className="text-brand-pink font-semibold hover:opacity-80"
							>
								Add Project →
							</button>
						</div>

						<div className="bg-white-bright p-8 rounded-xl shadow-sm hover:-translate-y-1 transition-all hover:shadow-md">
							<div className="text-4xl mb-4">⚡</div>
							<h3 className="text-2xl font-bold mb-2 text-gray-900">Add Skills</h3>
							<p className="text-gray-600 mb-4">
								Display your technical and professional skills.
							</p>
							<button
								onClick={() => setShowSkillModal(true)}
								className="text-brand-pink font-semibold hover:opacity-80"
							>
								Add Skill →
							</button>
						</div>
					</section>
				</div>
			</main>

			{/* Footer */}
			<footer className="bg-gray-900 text-white py-6 text-center">
				<div className="max-w-6xl mx-auto px-8">
					<p className="opacity-80">&copy; 2025 taylor.io. All rights reserved.</p>
				</div>
			</footer>

			{/* Modals */}
			<AddExperienceModal
				isOpen={showExperienceModal}
				onClose={() => setShowExperienceModal(false)}
				onSuccess={refreshProfile}
			/>
			<AddProjectModal
				isOpen={showProjectModal}
				onClose={() => setShowProjectModal(false)}
				onSuccess={refreshProfile}
			/>
			<AddSkillModal
				isOpen={showSkillModal}
				onClose={() => setShowSkillModal(false)}
				onSuccess={refreshProfile}
			/>
		</div>
	)
}

// export.
export default Home

