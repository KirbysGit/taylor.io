// pages/5resume/ResumeChoose.jsx

// Selection page: choose which education, experiences, and projects from profile to include in this resume.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import TopNav from '@/components/TopNav'
import { getMyProfile } from '@/api/services/profile'

function ResumeChoose() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
	const [profile, setProfile] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [selectedEduIds, setSelectedEduIds] = useState(new Set())
	const [selectedExpIds, setSelectedExpIds] = useState(new Set())
	const [selectedProjIds, setSelectedProjIds] = useState(new Set())

	useEffect(() => {
		const token = localStorage.getItem('token')
		if (!token) {
			navigate('/auth')
			return
		}

		const userData = localStorage.getItem('user')
		if (userData) setUser(JSON.parse(userData))

		const fetchProfile = async () => {
			try {
				const res = await getMyProfile()
				const data = res.data || res
				setProfile(data)
				// Default: select all
				const eduIds = new Set((data.education || []).map((e) => e.id))
				const expIds = new Set((data.experiences || []).map((e) => e.id))
				const projIds = new Set((data.projects || []).map((p) => p.id))
				setSelectedEduIds(eduIds)
				setSelectedExpIds(expIds)
				setSelectedProjIds(projIds)
			} catch {
				toast.error('Failed to load profile')
				navigate('/resume/create')
			} finally {
				setIsLoading(false)
			}
		}

		fetchProfile()
	}, [navigate])

	const toggleEdu = (id) => {
		setSelectedEduIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const toggleExp = (id) => {
		setSelectedExpIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const toggleProj = (id) => {
		setSelectedProjIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const selectAllEdu = () => {
		const all = new Set((profile?.education || []).map((e) => e.id))
		setSelectedEduIds(all)
	}

	const deselectAllEdu = () => setSelectedEduIds(new Set())

	const selectAllExp = () => {
		const all = new Set((profile?.experiences || []).map((e) => e.id))
		setSelectedExpIds(all)
	}

	const deselectAllExp = () => setSelectedExpIds(new Set())

	const selectAllProj = () => {
		const all = new Set((profile?.projects || []).map((p) => p.id))
		setSelectedProjIds(all)
	}

	const deselectAllProj = () => setSelectedProjIds(new Set())

	const handleContinue = () => {
		navigate('/resume/preview', {
			state: {
			createMode: 'choose',
			selectedEducationIds: Array.from(selectedEduIds),
			selectedExperienceIds: Array.from(selectedExpIds),
			selectedProjectIds: Array.from(selectedProjIds),
			},
		})
	}

	const education = profile?.education || []
	const experiences = profile?.experiences || []
	const projects = profile?.projects || []

	if (isLoading) {
		return (
			<div className="min-h-screen flex flex-col bg-cream info-scrollbar overflow-y-auto" style={{ height: '100vh' }}>
				<TopNav
					user={user}
					onLogout={() => {
						localStorage.removeItem('token')
						localStorage.removeItem('user')
						navigate('/')
					}}
				/>
				<main className="flex-1 flex items-center justify-center">
					<p className="text-gray-500">Loading...</p>
				</main>
			</div>
		)
	}

	return (
		<div className="min-h-screen flex flex-col bg-cream info-scrollbar overflow-y-auto" style={{ height: '100vh' }}>
			<TopNav
				user={user}
				onLogout={() => {
					localStorage.removeItem('token')
					localStorage.removeItem('user')
					navigate('/')
				}}
			/>

			<main className="flex-1 py-12 bg-cream">
				<div className="max-w-4xl mx-auto px-8">
					<button
						onClick={() => navigate('/resume/create')}
						className="text-gray-600 hover:text-gray-900 text-sm font-medium mb-4 flex items-center gap-1"
					>
						← Back
					</button>
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						Choose from profile
					</h1>
					<p className="text-gray-600 mb-8">
						Select which education, experiences, and projects to include in this resume.
					</p>

					<div className="space-y-8">
						{/* Education */}
						<section
							className="bg-white-bright rounded-xl p-6 border-2 border-gray-200"
							style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
						>
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold text-gray-900">Education</h2>
								<div className="flex gap-2">
									<button
										onClick={selectAllEdu}
										className="text-sm text-brand-pink hover:underline font-medium"
									>
										Select all
									</button>
									<span className="text-gray-300">|</span>
									<button
										onClick={deselectAllEdu}
										className="text-sm text-gray-600 hover:underline font-medium"
									>
										Deselect all
									</button>
								</div>
							</div>
							{education.length === 0 ? (
								<p className="text-gray-500 text-sm">
									No education yet. Add some in Update Info first.
								</p>
							) : (
								<div className="space-y-3">
									{education.map((edu) => (
										<label
											key={edu.id}
											className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
										>
											<input
												type="checkbox"
												checked={selectedEduIds.has(edu.id)}
												onChange={() => toggleEdu(edu.id)}
												className="mt-1 rounded border-gray-300 text-brand-pink focus:ring-brand-pink"
											/>
											<div className="flex-1 min-w-0">
												<p className="font-medium text-gray-900">
													{edu.degree && edu.discipline ? `${edu.degree} in ${edu.discipline}` : edu.degree || edu.discipline || 'Education'}
													{edu.school ? ` at ${edu.school}` : ''}
												</p>
												<p className="text-sm text-gray-500 truncate">{edu.school || edu.location || '—'}</p>
											</div>
										</label>
									))}
								</div>
							)}
						</section>

						{/* Experiences */}
						<section
							className="bg-white-bright rounded-xl p-6 border-2 border-gray-200"
							style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
						>
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold text-gray-900">Experiences</h2>
								<div className="flex gap-2">
									<button
										onClick={selectAllExp}
										className="text-sm text-brand-pink hover:underline font-medium"
									>
										Select all
									</button>
									<span className="text-gray-300">|</span>
									<button
										onClick={deselectAllExp}
										className="text-sm text-gray-600 hover:underline font-medium"
									>
										Deselect all
									</button>
								</div>
							</div>
							{experiences.length === 0 ? (
								<p className="text-gray-500 text-sm">
									No experiences yet. Add some in Update Info first.
								</p>
							) : (
								<div className="space-y-3">
									{experiences.map((exp) => (
										<label
											key={exp.id}
											className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
										>
											<input
												type="checkbox"
												checked={selectedExpIds.has(exp.id)}
												onChange={() => toggleExp(exp.id)}
												className="mt-1 rounded border-gray-300 text-brand-pink focus:ring-brand-pink"
											/>
											<div className="flex-1 min-w-0">
												<p className="font-medium text-gray-900">{exp.title} at {exp.company}</p>
												<p className="text-sm text-gray-500 truncate">{exp.description}</p>
											</div>
										</label>
									))}
								</div>
							)}
						</section>

						{/* Projects */}
						<section
							className="bg-white-bright rounded-xl p-6 border-2 border-gray-200"
							style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
						>
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold text-gray-900">Projects</h2>
								<div className="flex gap-2">
									<button
										onClick={selectAllProj}
										className="text-sm text-brand-pink hover:underline font-medium"
									>
										Select all
									</button>
									<span className="text-gray-300">|</span>
									<button
										onClick={deselectAllProj}
										className="text-sm text-gray-600 hover:underline font-medium"
									>
										Deselect all
									</button>
								</div>
							</div>
							{projects.length === 0 ? (
								<p className="text-gray-500 text-sm">
									No projects yet. Add some in Update Info first.
								</p>
							) : (
								<div className="space-y-3">
									{projects.map((proj) => (
										<label
											key={proj.id}
											className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
										>
											<input
												type="checkbox"
												checked={selectedProjIds.has(proj.id)}
												onChange={() => toggleProj(proj.id)}
												className="mt-1 rounded border-gray-300 text-brand-pink focus:ring-brand-pink"
											/>
											<div className="flex-1 min-w-0">
												<p className="font-medium text-gray-900">{proj.title}</p>
												<p className="text-sm text-gray-500 truncate">{proj.description}</p>
											</div>
										</label>
									))}
								</div>
							)}
						</section>

						<div className="flex justify-end">
							<button
								onClick={handleContinue}
								className="px-6 py-3 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
							>
								Continue to editor
							</button>
						</div>
					</div>
				</div>
			</main>
		</div>
	)
}

export default ResumeChoose
