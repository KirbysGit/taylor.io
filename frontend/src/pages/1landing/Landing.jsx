// landing/Landing.jsx

// landing page component.

import { useNavigate } from 'react-router-dom'

function Landing() {
	const navigate = useNavigate()
	return (
		<div className="min-h-screen flex flex-col bg-cream overflow-y-auto landing-scrollbar" style={{ height: '100vh', overflowY: 'auto' }}>
		{/* Hero Header */}
		<header className="relative bg-gradient-to-br from-brand-pink via-brand-pink to-brand-pink-dark text-white py-20 md:py-28 text-center overflow-hidden">
			{/* Decorative background elements */}
			<div className="absolute inset-0 opacity-10">
				<div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
				<div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
			</div>
			<div className="relative max-w-6xl mx-auto px-8">
				<h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight animate-fade-in">
					taylor.io
				</h1>
				<p className="text-2xl md:text-3xl opacity-95 font-light mb-8 max-w-3xl mx-auto leading-relaxed">
					Your professional portfolio, tailored to perfection
				</p>
				<p className="text-lg md:text-xl opacity-90 mb-10 max-w-2xl mx-auto">
					Build stunning resumes and portfolios that showcase your unique story
				</p>
				<div className="flex gap-4 justify-center flex-wrap">
					<button
						onClick={() => navigate('/auth')}
						className="px-10 py-4 bg-white text-brand-pink font-bold text-lg rounded-xl hover:bg-cream transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/30 transform duration-300"
					>
						Get Started Free
					</button>
					<button
						onClick={() => navigate('/auth')}
						className="px-10 py-4 bg-transparent border-2 border-white text-white font-semibold text-lg rounded-xl hover:bg-white/10 transition-all hover:-translate-y-1 transform duration-300"
					>
						Learn More
					</button>
				</div>
			</div>
		</header>

		{/* Main Content */}
		<main className="flex-1 bg-cream">
			{/* Features Section */}
			<section className="py-20 md:py-28">
				<div className="max-w-6xl mx-auto px-8">
					<div className="text-center mb-16">
						<h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
							Everything you need to stand out
						</h2>
						<p className="text-xl text-gray-600 max-w-2xl mx-auto">
							Powerful tools to create a professional portfolio that gets you noticed
						</p>
					</div>
					
					<div className="grid md:grid-cols-3 gap-8 mb-20">
						{/* Feature Card 1 */}
						<div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
							<div className="w-16 h-16 bg-brand-pink/10 rounded-xl flex items-center justify-center mb-6">
								<svg className="w-8 h-8 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
							</div>
							<h3 className="text-2xl font-bold mb-3 text-gray-900">Professional Resumes</h3>
							<p className="text-gray-600 leading-relaxed">
								Create polished, ATS-friendly resumes with customizable templates that highlight your experience and skills.
							</p>
						</div>

						{/* Feature Card 2 */}
						<div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
							<div className="w-16 h-16 bg-brand-pink/10 rounded-xl flex items-center justify-center mb-6">
								<svg className="w-8 h-8 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
								</svg>
							</div>
							<h3 className="text-2xl font-bold mb-3 text-gray-900">Portfolio Builder</h3>
							<p className="text-gray-600 leading-relaxed">
								Showcase your projects, education, and achievements in a beautiful, organized portfolio that tells your story.
							</p>
						</div>

						{/* Feature Card 3 */}
						<div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
							<div className="w-16 h-16 bg-brand-pink/10 rounded-xl flex items-center justify-center mb-6">
								<svg className="w-8 h-8 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
								</svg>
							</div>
							<h3 className="text-2xl font-bold mb-3 text-gray-900">Easy Customization</h3>
							<p className="text-gray-600 leading-relaxed">
								Tailor every detail to match your style. Drag, drop, and edit with our intuitive interface.
							</p>
						</div>
					</div>

					{/* How It Works Section */}
					<div className="bg-white rounded-3xl p-12 md:p-16 shadow-xl border border-gray-100">
						<div className="text-center mb-12">
							<h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
								Simple. Fast. Effective.
							</h2>
							<p className="text-lg text-gray-600">
								Get started in minutes, not hours
							</p>
						</div>
						
						<div className="grid md:grid-cols-3 gap-8">
							<div className="text-center">
								<div className="w-20 h-20 bg-brand-pink rounded-full flex items-center justify-center mx-auto mb-6 text-white text-3xl font-bold">
									1
								</div>
								<h3 className="text-xl font-bold mb-3 text-gray-900">Sign Up</h3>
								<p className="text-gray-600">
									Create your free account in seconds
								</p>
							</div>
							
							<div className="text-center">
								<div className="w-20 h-20 bg-brand-pink rounded-full flex items-center justify-center mx-auto mb-6 text-white text-3xl font-bold">
									2
								</div>
								<h3 className="text-xl font-bold mb-3 text-gray-900">Build</h3>
								<p className="text-gray-600">
									Fill in your information and customize your design
								</p>
							</div>
							
							<div className="text-center">
								<div className="w-20 h-20 bg-brand-pink rounded-full flex items-center justify-center mx-auto mb-6 text-white text-3xl font-bold">
									3
								</div>
								<h3 className="text-xl font-bold mb-3 text-gray-900">Export</h3>
								<p className="text-gray-600">
									Download your professional resume and portfolio
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white">
				<div className="max-w-4xl mx-auto px-8 text-center">
					<h2 className="text-4xl md:text-5xl font-bold mb-6">
						Ready to build your professional presence?
					</h2>
					<p className="text-xl md:text-2xl mb-10 opacity-95">
						Join thousands of professionals who trust taylor.io
					</p>
					<button
						onClick={() => navigate('/auth')}
						className="px-12 py-5 bg-white text-brand-pink font-bold text-xl rounded-xl hover:bg-cream transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/30 transform duration-300"
					>
						Start Building Now
					</button>
				</div>
			</section>
		</main>

		{/* Footer */}
		<footer className="bg-gray-900 text-white py-12">
			<div className="max-w-6xl mx-auto px-8">
				<div className="text-center mb-8">
					<h3 className="text-2xl font-bold mb-4">taylor.io</h3>
					<p className="opacity-80 mb-6">
						Your professional portfolio, tailored to perfection
					</p>
				</div>
				<div className="border-t border-gray-800 pt-8 text-center">
					<p className="opacity-70 text-sm">&copy; 2025 taylor.io. All rights reserved.</p>
				</div>
			</div>
		</footer>
		</div>
	)
}

export default Landing

