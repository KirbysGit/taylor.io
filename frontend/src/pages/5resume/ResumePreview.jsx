// pages/5resume/ResumePreview.jsx

// building back incrementally.

// imports.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// api imports.
import { listTemplates } from '@/api/services/resume'


// ----------- main component -----------
function ResumePreview() {

    // allows us to navigate to other pages.
	const navigate = useNavigate()

    // ----- page states -----
	const [user, setUser] = useState(() => {
		// optional: hydrate from cached auth payload first.
		try {
			const raw = localStorage.getItem('user')
			return raw ? JSON.parse(raw) : null
		} catch {
			return null
		}
	})
	const [template, setTemplate] = useState('main')                            // template being used for resume.
	const [availableTemplates, setAvailableTemplates] = useState(['main'])      // available templates to choose from.
	const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)          // loading state for templates.

    // ----- use effects -----

	// auth guard on mount.
	useEffect(() => {
		const token = localStorage.getItem('token')
		if (!token) {
			navigate('/auth')
			return
		}

		// simplest: rely on cached user payload from localStorage (no network call).
		try {
			const raw = localStorage.getItem('user')
			setUser(raw ? JSON.parse(raw) : null)
		} catch {
			setUser(null)
		}
	}, [navigate])

	// on mount fetches.
	useEffect(() => {
		let cancelled = false

		const loadTemplates = async () => {
			try {
				const res = await listTemplates()
				const templates = res?.data?.templates
				if (cancelled) return

				if (Array.isArray(templates) && templates.length) {
					setAvailableTemplates(templates)
					setTemplate(templates[0])
				}
			} catch (err) {
				console.error('Failed to load templates', err)
			} finally {
				if (!cancelled) setIsLoadingTemplates(false)
			}
		}

		loadTemplates()

		return () => {
			cancelled = true
		}
	}, [])

	return (
		<div className="min-h-screen flex flex-col bg-cream">
			<header className="bg-brand-pink text-white py-4 shadow-md">
				<div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
					<h1 className="text-2xl font-bold">Resume</h1>
					<button
						type="button"
						onClick={() => navigate('/home')}
						className="px-4 py-2 bg-white-bright text-brand-pink font-semibold rounded-lg hover:opacity-90 transition-all"
					>
						← Back
					</button>
				</div>
			</header>

			<main className="flex-1 flex overflow-hidden min-h-0">
				{/* Left: controls */}
				<aside className="w-[420px] max-w-[520px] bg-white-bright border-r border-gray-200 p-6 overflow-y-auto">
					<h2 className="text-2xl font-semibold text-gray-900 mb-1">
						{user?.name ? `Hi, ${user.name}` : 'Controls'}
					</h2>
					{user?.email && <p className="text-sm text-gray-600 mb-4">{user.email}</p>}
					{!user?.email && <div className="mb-4" />}

					<label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
					<select
						value={template}
						onChange={(e) => setTemplate(e.target.value)}
						disabled={isLoadingTemplates}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent bg-white"
					>
						{availableTemplates.map((t) => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>

					<div className="mt-6 flex gap-2">
						<button
							type="button"
							disabled
							className="flex-1 px-4 py-2 bg-brand-pink text-white font-semibold rounded-lg opacity-50 cursor-not-allowed"
							title="Coming next"
						>
							Preview
						</button>
						<button
							type="button"
							disabled
							className="flex-1 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg opacity-50 cursor-not-allowed"
							title="Coming next"
						>
							Download
						</button>
					</div>

					<p className="mt-4 text-sm text-gray-600">
						This is a minimal skeleton. Next we’ll add: preview generation, then style controls, then content editing.
					</p>
				</aside>

				{/* Right: preview placeholder */}
				<section className="flex-1 bg-gray-50 overflow-auto p-8">
					<div className="max-w-3xl mx-auto">
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
							<h2 className="text-lg font-semibold text-gray-900">Preview</h2>
							<p className="text-sm text-gray-600 mt-1">
								Selected template: <span className="font-medium">{template}</span>
							</p>
							<div className="mt-6 h-[520px] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500">
								PDF preview will render here.
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>
	)
}

export default ResumePreview

