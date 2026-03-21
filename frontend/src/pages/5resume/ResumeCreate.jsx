// pages/5resume/ResumeCreate.jsx

// Intermediate page: choose how to build your resume (Choose from profile, Tailor, Start fresh).

import { useNavigate } from 'react-router-dom'
import TopNav from '@/components/TopNav'

function ResumeCreate() {
	const navigate = useNavigate()

	return (
		<div className="min-h-screen flex flex-col bg-cream info-scrollbar overflow-y-auto" style={{ height: '100vh' }}>
			<TopNav
				user={JSON.parse(localStorage.getItem('user') || '{}')}
				onLogout={() => {
					localStorage.removeItem('token')
					localStorage.removeItem('user')
					navigate('/')
				}}
			/>

			<main className="flex-1 py-12 bg-cream">
				<div className="max-w-4xl mx-auto px-8">
					<section className="mb-8">
						<button
							onClick={() => navigate('/home')}
							className="text-gray-600 hover:text-gray-900 text-sm font-medium mb-4 flex items-center gap-1"
						>
							← Back to Home
						</button>
						<h1 className="text-3xl font-bold text-gray-900 mb-2">
							Create your resume
						</h1>
						<p className="text-gray-600">
							How would you like to build this resume?
						</p>
					</section>

					<section className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* Choose from profile */}
						<button
							onClick={() => navigate('/resume/create/choose')}
							className="bg-white-bright rounded-xl shadow-lg p-8 hover:shadow-xl transition-all border-2 border-gray-200 hover:border-brand-pink/40 group text-left"
							style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
						>
							<div className="w-16 h-16 bg-brand-pink/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-pink/20 transition-colors">
								<svg className="w-8 h-8 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
								</svg>
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-2">
								Choose from profile
							</h3>
							<p className="text-sm text-gray-600">
								Select which experiences and projects to include from your saved data
							</p>
						</button>

						{/* Tailor - Coming soon */}
						<button
							disabled
							className="bg-white-bright rounded-xl shadow-lg p-8 border-2 border-gray-200 opacity-75 cursor-not-allowed group text-left relative"
							style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
						>
							<span className="absolute top-3 right-3 bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded">
								Coming soon
							</span>
							<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
								<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
								</svg>
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-2">
								Tailor
							</h3>
							<p className="text-sm text-gray-600">
								AI helps optimize your resume for a specific job
							</p>
						</button>

						{/* Start fresh */}
						<button
							onClick={() => navigate('/resume/preview', { state: { createMode: 'startFresh' } })}
							className="bg-white-bright rounded-xl shadow-lg p-8 hover:shadow-xl transition-all border-2 border-gray-200 hover:border-brand-pink/40 group text-left"
							style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
						>
							<div className="w-16 h-16 bg-brand-pink/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-pink/20 transition-colors">
								<svg className="w-8 h-8 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
								</svg>
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-2">
								Start fresh
							</h3>
							<p className="text-sm text-gray-600">
								Build from scratch with a blank resume
							</p>
						</button>
					</section>
				</div>
			</main>
		</div>
	)
}

export default ResumeCreate
