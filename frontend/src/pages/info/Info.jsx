// pages/info/Info.jsx

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyProfile, upsertContact } from '@/api/services/profile'
import { listTemplates } from '@/api/services/resume'
import AddExperienceModal from '@/components/modals/AddExperienceModal'
import AddProjectModal from '@/components/modals/AddProjectModal'
import AddSkillModal from '@/components/modals/AddSkillModal'
import TopNav from '@/components/TopNav'

function Info() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
	const [profile, setProfile] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [showExperienceModal, setShowExperienceModal] = useState(false)
	const [showProjectModal, setShowProjectModal] = useState(false)
	const [showSkillModal, setShowSkillModal] = useState(false)

	const [contactForm, setContactForm] = useState({
		email: '',
		phone: '',
		github: '',
		linkedin: '',
		portfolio: '',
		location: '',
	})

	useEffect(() => {
		const fetchProfile = async () => {
			const token = localStorage.getItem('token')
			const userData = localStorage.getItem('user')
			if (!token || !userData) {
				navigate('/auth')
				return
			}

			try {
				const parsedUser = JSON.parse(userData)
				setUser(parsedUser)
				const response = await getMyProfile()
				const data = response.data || {}
				setProfile(data)
				const contact = data.contact || {}
				setContactForm({
					email: contact.email || '',
					phone: contact.phone || '',
					github: contact.github || '',
					linkedin: contact.linkedin || '',
					portfolio: contact.portfolio || '',
					location: contact.location || '',
				})
			} catch (error) {
				console.error('Error fetching profile:', error)
				try {
					setUser(JSON.parse(userData))
				} catch {
					navigate('/auth')
				}
			} finally {
				setIsLoading(false)
			}
		}

		fetchProfile()
	}, [navigate])

	const refreshProfile = async () => {
		try {
			const response = await getMyProfile()
			setProfile(response.data)
		} catch (error) {
			console.error('Error refreshing profile:', error)
		}
	}

	const handleLogout = () => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}

	const handleContactSave = async () => {
		try {
			await upsertContact(contactForm)
			await refreshProfile()
		} catch (error) {
			console.error('Error saving contact:', error)
			alert('Failed to save contact info.')
		}
	}

	const ContactSection = () => (
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
							onChange={(e) => setContactForm((prev) => ({ ...prev, [field]: e.target.value }))}
							className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
						/>
					</div>
				))}
			</div>
		</section>
	)

	const EducationSection = () => (
		<section className="bg-white-bright rounded-xl shadow-sm p-6">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-xl font-bold text-gray-900">Education</h3>
			</div>
			{profile?.education && profile.education.length > 0 ? (
				<div className="space-y-4">
					{profile.education.map((edu) => (
						<div key={edu.id} className="border-l-4 border-brand-pink pl-4">
							{edu.school && <h4 className="font-semibold text-gray-900">{edu.school}</h4>}
							{edu.degree && <p className="text-sm text-gray-700">{edu.degree}</p>}
							{edu.field && <p className="text-sm text-gray-600">{edu.field}</p>}
							{edu.minor && <p className="text-sm text-gray-600">Minor: {edu.minor}</p>}
							<div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
								{edu.gpa && <span>GPA: {edu.gpa}</span>}
								{edu.location && <span>{edu.location}</span>}
								{edu.start_date && (
									<span>
										{new Date(edu.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} -{' '}
										{edu.end_date ? new Date(edu.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present'}
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
			) : (
				<p className="text-sm text-gray-500">No education entries yet.</p>
			)}
		</section>
	)

	const ExperiencesSection = () => (
		<section className="bg-white-bright rounded-xl shadow-sm p-6">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-xl font-bold text-gray-900">Experiences</h3>
				<button
					onClick={() => setShowExperienceModal(true)}
					className="text-brand-pink font-semibold hover:opacity-80"
				>
					Add Experience →
				</button>
			</div>
			{profile?.experiences && profile.experiences.length > 0 ? (
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
			) : (
				<p className="text-sm text-gray-500">No experiences yet.</p>
			)}
		</section>
	)

	const ProjectsSection = () => (
		<section className="bg-white-bright rounded-xl shadow-sm p-6">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-xl font-bold text-gray-900">Projects</h3>
				<button
					onClick={() => setShowProjectModal(true)}
					className="text-brand-pink font-semibold hover:opacity-80"
				>
					Add Project →
				</button>
			</div>
			{profile?.projects && profile.projects.length > 0 ? (
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
			) : (
				<p className="text-sm text-gray-500">No projects yet.</p>
			)}
		</section>
	)

	const SkillsSection = () => (
		<section className="bg-white-bright rounded-xl shadow-sm p-6">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-xl font-bold text-gray-900">Skills</h3>
				<button
					onClick={() => setShowSkillModal(true)}
					className="text-brand-pink font-semibold hover:opacity-80"
				>
					Add Skill →
				</button>
			</div>
			{profile?.skills && profile.skills.length > 0 ? (
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
			) : (
				<p className="text-sm text-gray-500">No skills yet.</p>
			)}
		</section>
	)

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
							<ContactSection />
							<EducationSection />
							<ExperiencesSection />
							<ProjectsSection />
							<SkillsSection />
						</div>
					)}
				</div>
			</main>

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

export default Info


