// landing/Landing.jsx

// landing page component.

import { useNavigate } from 'react-router-dom'

function Landing() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Header */}
      <header className="bg-brand-pink text-white py-16 text-center">
        <div className="max-w-6xl mx-auto px-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            taylor.io
          </h1>
          <p className="text-xl opacity-95 font-light">
            Your professional portfolio, tailored to perfection
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-16 bg-cream">
        <div className="max-w-6xl mx-auto px-8">
          {/* Hero Section */}
          <section className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Showcase Your Work
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Build a beautiful portfolio that highlights your experiences, projects, and skills.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={() => navigate('/auth')}
                className="px-8 py-3 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-pink/40"
              >
                Get Started
              </button>
              <button className="px-8 py-3 bg-white-bright text-brand-pink font-semibold rounded-lg border-2 border-brand-pink hover:bg-cream transition-all hover:-translate-y-0.5">
                Learn More
              </button>
            </div>
          </section>

          {/* Features Section */}
          <section className="mt-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white-bright p-8 rounded-xl shadow-sm hover:-translate-y-1 transition-all hover:shadow-md">
                <h3 className="text-2xl font-bold mb-2 text-gray-900">Experiences</h3>
                <p className="text-gray-600">Highlight your professional journey</p>
              </div>
              <div className="bg-white-bright p-8 rounded-xl shadow-sm hover:-translate-y-1 transition-all hover:shadow-md">
                <h3 className="text-2xl font-bold mb-2 text-gray-900">Projects</h3>
                <p className="text-gray-600">Showcase your best work</p>
              </div>
              <div className="bg-white-bright p-8 rounded-xl shadow-sm hover:-translate-y-1 transition-all hover:shadow-md">
                <h3 className="text-2xl font-bold mb-2 text-gray-900">Skills</h3>
                <p className="text-gray-600">Display your expertise</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 text-center">
        <div className="max-w-6xl mx-auto px-8">
          <p className="opacity-80">&copy; 2025 taylor.io. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default Landing

