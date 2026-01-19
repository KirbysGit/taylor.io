// pages/5resume/ResumePreview.jsx

// building back incrementally.

// imports.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// api imports.
import { listTemplates } from '@/api/services/templates'
import { getMyProfile } from '@/api/services/profile'
import { generateResumePreview } from '@/api/services/resume'

// icons imports.
import { XIcon } from '@/components/icons'

// component imports.
import ResumeHeader from './components/ResumeHeader'

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

	// preview states.
	const [previewUrl, setPreviewUrl] = useState(null)
	const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

	// resume data state.
	const [resumeData, setResumeData] = useState({
		header: {
			first_name: '',
			last_name: '',
			email: '',
			phone: '',
			location: '',
			github: '',
			linkedin: '',
			portfolio: '',
		},
	})

	// ----- handlers -----

	const handleMouseDown = (e) => {
		setIsResizing(true);
		e.preventDefault();
	}

	const handleMouseMove = (e) => {
		if (!isResizing) return;
		const newWidth = e.clientX
		setLeftPanelWidth(Math.min(Math.max(300, newWidth), 800))
	}

	const handleMouseUp = () => {
		setIsResizing(false);
	}


	// ----- use effects -----

	// auth guard on mount.
	useEffect(() => {

		// if user not logged in, redirect to auth page.
		const token = localStorage.getItem('token')
		if (!token) {
			navigate('/auth')
			return
		}

		// fetch user data from backend.
		try {
			
			// step 1 : fetch user data from local storage.
			// we can immediately display name & email.
			const userData = localStorage.getItem('user')
			if (userData) {
				setUser(JSON.parse(userData))
			}

			// step 2 : fetch user data from backend.
			const fetchCurrentUser = async () => {
				const response = await getMyProfile()
				const responseData = response.data
				const userData = responseData.user  // Extract user object from response
				setUser(userData)

				setResumeData({
					header: {
						first_name: userData.first_name,
						last_name: userData.last_name,
						email: userData.email,
						phone: responseData.contact?.phone || '',
						location: responseData.contact?.location || '',
						portfolio: responseData.contact?.portfolio || '',
						linkedin: responseData.contact?.linkedin || '',
						github: responseData.contact?.github || '',
					}
				})
			}

			fetchCurrentUser();
		} catch {
			setUser(null)
		}
	}, [navigate])

	useEffect(() => {
		setIsLoadingTemplates(true)

		const fetchTemplates = async () => {
			const response = await listTemplates()
			const responseData = response.data
			setAvailableTemplates(responseData.templates)
			setIsLoadingTemplates(false)
		}

		fetchTemplates()
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

	useEffect(() => {
		setIsGeneratingPreview(true)

		if (!resumeData.header.first_name && !resumeData.header.email) {
			console.log("Skipping Preview")
			return
		}

		const timer = setTimeout(async () => {
			try {
				const pdfBlob = await generateResumePreview(template, resumeData)
				
				const url = URL.createObjectURL(pdfBlob)

				if (previewUrl) {
					URL.revokeObjectURL(previewUrl)
				}

				setPreviewUrl(url)
			} catch (error) {
				console.error('Failed to generate preview: ', error)
			} finally {
				setIsGeneratingPreview(false)
			}
		}, 1000)

		return () => clearTimeout(timer)
	}, [template, resumeData])

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
					<ResumeHeader 
						headerData = {resumeData.header}
						onHeaderChange = {(updatedData) => setResumeData(prev => ({ ...prev, header: updatedData }))}
					/>
					

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
					<div className="mt-6 h-[520px] rounded-lg border-2 border-dashed border-gray-300">
						{isGeneratingPreview ? (
							<div className="flex items-center justify-center h-full">
								<p className="text-gray-500">Generating preview...</p>
							</div>
						) : previewUrl ? (
							<iframe 
								src={previewUrl} 
								className="w-full h-full rounded-lg"
								title="Resume Preview"
							/>
						) : (
							<div className="flex items-center justify-center h-full text-gray-500">
								PDF preview will render here.
							</div>
						)}
					</div>
				</section>
			</main>
		</div>
	)
}

export default ResumePreview

