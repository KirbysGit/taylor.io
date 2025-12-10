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
	const [resumeFormat, setResumeFormat] = useState('pdf') // 'pdf' or 'docx'

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
		// navigate to preview page with format and template params.
		// Use 'main' as default template for DOCX
		const template = resumeFormat === 'docx' ? 'main' : undefined
		const url = template 
			? `/resume/preview?format=${resumeFormat}&template=${template}`
			: `/resume/preview?format=${resumeFormat}`
		navigate(url)
	}

	// function to handle logout.
	const handleLogout = () => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}

	return (
		<div className="min-h-screen flex flex-col bg-cream">
			<TopNav user={user} onLogout={handleLogout} />

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
							</div>
						</div>
					</section>

				</div>
			</main>

		</div>
	)
}

// export.
export default Home

