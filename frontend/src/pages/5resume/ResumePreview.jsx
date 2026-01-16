// pages/5resume/ResumePreview.jsx

// building back incrementally.

// imports.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// api imports.
import { listTemplates } from '@/api/services/resume'

// icons imports.
import { XIcon, RequiredAsterisk, ChevronDown, ChevronUp } from '@/components/icons'

// ----------- main component -----------
function ResumePreview() {

    // allows us to navigate to other pages.
	const navigate = useNavigate()

    // ----- page states -----
	const [user, setUser] = useState(null)										// user's data.

	// welcome message states.
	const [welcomeMessage, setWelcomeMessage] = useState(true);					// if welcome message should be shown.

	// template states.
	const [template, setTemplate] = useState('main')                            // template being used for resume.
	const [availableTemplates, setAvailableTemplates] = useState(['main'])      // available templates to choose from.
	const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)          // loading state for templates.
	
	// panel states.
	const [leftPanelWidth, setLeftPanelWidth] = useState(560);                  // width of left panel.
	const [isResizing, setIsResizing] = useState(false);						// if user is currently resizing panel.
	
	// collapsible section states.
	const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);			// if resume header section is expanded.

	// ----- handlers -----

	const handleMouseDown = (e) => {
		setIsResizing(true);
		e.preventDefault();
	}

	const handleMouseMove = (e) => {
		if (!isResizing) return;
		const newWidth = e.clientX
		setLeftPanelWidth(Math.min(Math.max(300, newWidth), 800))
		console.log(newWidth)
	}

	const handleMouseUp = () => {
		setIsResizing(false);
	}

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

	// resizing global listener.
	useEffect(() => {
		if (isResizing) {
			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('mouseup', handleMouseUp)
			document.body.style.cursor = 'col-resize'
			document.body.style.userSelect = 'none'
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
			document.body.style.cursor = ''
			document.body.style.userSelect = ''
		}
	}, [isResizing])

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
				
				{/* left panel : inputs / controls */}
				<aside style = {{ width: `${leftPanelWidth}px` }} className="flex-shrink-0 bg-white-bright border-r border-gray-200 p-6 overflow-y-auto">
					{ welcomeMessage && (
						<div className="flex flex-col gap-0.5 p-3 border-[2px] rounded-md border-brand-pink-light mb-4 relative">
							<h2 className="text-[1.25rem] font-semibold text-gray-900 mb-1">
								{user?.first_name ? `Hey, ${user.first_name}! 👋` : 'Hey there! 👋'}
							</h2>
							<span className="text-[0.875rem] text-gray-500">Welcome to the <b>Builder</b>! This is where you will customize your resume.</span>
							<span className="text-[0.875rem] text-gray-500">We’ve filled in what we know. Feel free to tweak or add anything. 😄</span>
							<button
								type="button"
								onClick={() => setWelcomeMessage(false)}
								className="absolute top-2 right-2 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
							>
								<XIcon />
							</button>
						</div>
					)}
					
					{/* resume header section */}
					<div className="flex flex-col mb-4">
						{/* header with chevron */}
						<button
							type="button"
							onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
							className="flex items-center gap-3 w-full transition-colors"
						>
							{/* title */}
							<h1 className="text-[1.375rem] font-semibold text-gray-900">Resume Header</h1>
							
							{/* divider */}
							<div className="flex-1 h-[3px] rounded bg-gray-300"></div>
							
							{/* chevron in circle */}
							<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
								{isHeaderExpanded ? (
									<ChevronUp className="w-4 h-4 text-gray-600" />
								) : (
									<ChevronDown className="w-4 h-4 text-gray-600" />
								)}
							</div>
						</button>
						
						{isHeaderExpanded && (
							<div>
								<p className="text-[0.875rem] text-gray-500 mb-2">This is the top of your resume. It's your brand.</p>
								{/* name & email */}
								<div className="flex gap-4 mb-2">
									<div className="labelInputPair">
										<label className="label">Your Name <RequiredAsterisk /></label>
										<input
											type="text"
											value={user?.first_name + ' ' + user?.last_name}
											className="input"
											required
										/>
									</div>
									<div className="labelInputPair">
										<label className="label">Email <RequiredAsterisk /></label>
										<input
											type="text"
											value={user?.email}
											className="input"
											required
										/>
									</div>
								</div>
								<div className="flex flex-col">
									<h2 className="text-[1.125rem] font-semibold text-gray-900 mb-2">Nice To Haves</h2>
									<div className="labelInputPair">
										<label className="label">Phone Number</label>
										<input
											type="text"
											value={user?.phone_number || ''}
											className="input"
										/>
									</div>
								</div>
							</div>
						)}
						
						{/* Divider */}
						<div className="mt-6 border-t border-gray-200"></div>
					</div>
					
					

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

				{/* resizable divider */}
				<div
					onMouseDown={handleMouseDown}
					className={`w-1 bg-gray-300 hover:bg-brand-pink cursor-col-resize transition-colors ${isResizing ? 'bg-brand-pink' : ''}`}
				/>
				
				{/* right panel : preview placeholder */}
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

