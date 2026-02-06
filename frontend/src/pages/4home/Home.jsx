// pages/4home/Home.jsx

// homepage component (shown after successful login/signup).

// imports.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from '@/components/TopNav'

// ----------- main component -----------

function Home() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
	const [isLoading, setIsLoading] = useState(true)

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

	// function to handle resume generation - navigate to preview page.
	const handleGenerateResume = () => {
		navigate('/resume/preview')
	}

	// function to handle logout.
	const handleLogout = () => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}

	// placeholder past resumes data
	const pastResumes = [
		// This will be populated from backend later
	]

	return (
		<div className="min-h-screen flex flex-col bg-cream">
			<TopNav user={user} onLogout={handleLogout} />

			{/* Main Content */}
			<main className="flex-1 py-12 bg-cream">
				<div className="max-w-6xl mx-auto px-8">
					{/* Welcome Section */}
					<section className="mb-8">
						<div className="text-center mb-6">
							<h1 className="text-4xl font-bold mb-2 text-gray-900">
								Welcome back, {user?.first_name || 'there'}! 👋
							</h1>
							<p className="text-xl text-gray-600 mt-2">
								What would you like to do?
							</p>
						</div>
					</section>

					{/* Action Grid */}
					<section className="mb-12">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							{/* Update Info Card */}
							<button
								onClick={() => navigate('/info')}
								className="bg-white-bright rounded-xl shadow-lg p-8 hover:shadow-xl transition-all border-2 border-gray-200 hover:border-brand-pink/40 group"
								style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
							>
								<div className="flex flex-col items-center text-center">
									<div className="w-16 h-16 bg-brand-pink/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-pink/20 transition-colors">
										<svg className="w-8 h-8 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</div>
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										Update Info
									</h3>
									<p className="text-sm text-gray-600">
										Review and edit your contact, education, and experience details
									</p>
								</div>
							</button>

							{/* Generate Preview Card - Highlighted with Star */}
							<button
								onClick={handleGenerateResume}
								className="bg-white-bright rounded-xl shadow-xl p-8 hover:shadow-2xl transition-all border-brand-pink relative transform hover:scale-[1.02] group"
								style={{ 
									boxShadow: '0 20px 40px -10px rgba(214, 86, 86, 0.25), 0 10px 20px -5px rgba(0, 0, 0, 0.1)',
									borderWidth: '3px',
									borderStyle: 'solid'
								}}
							>
								{/* Star badge */}
								<div className="absolute -top-3 -right-3 bg-yellow-400 rounded-full p-2 shadow-lg border-2 border-white">
									<svg className="w-6 h-6 text-yellow-800" fill="currentColor" viewBox="0 0 20 20">
										<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
									</svg>
								</div>
								<div className="flex flex-col items-center text-center">
									<div className="w-16 h-16 bg-brand-pink/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-pink/20 transition-colors">
										<svg className="w-8 h-8 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										</svg>
									</div>
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										Generate Preview
									</h3>
									<p className="text-sm text-gray-600">
										View and customize your resume before downloading
									</p>
								</div>
							</button>

							{/* Templates Card */}
							<button
								onClick={() => navigate('/resume/preview')}
								className="bg-white-bright rounded-xl shadow-lg p-8 hover:shadow-xl transition-all border-2 border-gray-200 hover:border-brand-pink/40 group"
								style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
							>
								<div className="flex flex-col items-center text-center">
									<div className="w-16 h-16 bg-brand-pink/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-pink/20 transition-colors">
										<svg className="w-8 h-8 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
										</svg>
									</div>
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										Templates
									</h3>
									<p className="text-sm text-gray-600">
										Browse and select from available resume templates
									</p>
								</div>
							</button>
						</div>
					</section>

					{/* Past Resumes Section */}
					<section>
						<div 
							className="bg-white-bright rounded-xl p-8 border-2 border-gray-200"
							style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
						>
							<h2 className="text-2xl font-bold mb-4 text-gray-900">
								Past Resumes
							</h2>
							{pastResumes.length === 0 ? (
								<div className="text-center py-12">
									<svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									<p className="text-gray-500 text-sm">
										Your generated resumes will appear here
									</p>
								</div>
							) : (
								<div className="space-y-3">
									{pastResumes.map((resume, index) => (
										<div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
											<div className="flex items-center justify-between">
												<div>
													<h3 className="font-semibold text-gray-900">{resume.name}</h3>
													<p className="text-sm text-gray-500">{resume.date}</p>
												</div>
												<button className="text-brand-pink hover:text-brand-pink/80 text-sm font-medium">
													View
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</section>

				</div>
			</main>

		</div>
	)
}

// export.
export default Home

