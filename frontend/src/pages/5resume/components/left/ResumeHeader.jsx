// pages / 5resume / components / left / ResumeHeader.jsx

// smooth closing / opening of collapsible section.
// friendlier text between fields to clarify what each field is for.
// placeholder text for each field.
// input validation, like @ . com for email, etc.
// ability to do a header line.
// ability to add a header image.
// toggle for "https://".
// add your own link sort of thing (more for people not on linkedin, github, etc.)

// imports.
import { useState, useEffect } from 'react'

// icons imports.
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash, faGripVertical, faPencil, faCheck } from '@fortawesome/free-solid-svg-icons'
import { RequiredAsterisk } from '@/components/icons'

// ----------- component -----------
const ResumeHeader = ({ headerData, onHeaderChange, bare = false }) => {
	
	// which field is being edited: 'name' | 'email' | 'phone' | ... or null
	const [editingField, setEditingField] = useState(null)

	// visibility states for contacts (including email).
	const [showEmail, setShowEmail] = useState(headerData?.visibility?.showEmail ?? true)
	const [showPhone, setShowPhone] = useState(headerData?.visibility?.showPhone ?? true)
	const [showLocation, setShowLocation] = useState(headerData?.visibility?.showLocation ?? true)
	const [showLinkedin, setShowLinkedin] = useState(headerData?.visibility?.showLinkedin ?? true)
	const [showGithub, setShowGithub] = useState(headerData?.visibility?.showGithub ?? true)
	const [showPortfolio, setShowPortfolio] = useState(headerData?.visibility?.showPortfolio ?? true)
	const [showTagline, setShowTagline] = useState(headerData?.visibility?.showTagline ?? true)

	// contact ordering (includes email now)
	const [contactOrder, setContactOrder] = useState(
		headerData?.contactOrder || ['email', 'phone', 'location', 'linkedin', 'github', 'portfolio']
	)
	
	// drag and drop state
	const [draggedField, setDraggedField] = useState(null)
	const [dragOverIndex, setDragOverIndex] = useState(null)

	// internal state for all header fields.
	// Initialize from localStorage first, then from headerData if available
	const getInitialName = () => {
		if (headerData?.first_name || headerData?.last_name) {
			return headerData.first_name || ''
		}
		// Try localStorage as fallback
		try {
			const userData = localStorage.getItem('user')
			if (userData) {
				const user = JSON.parse(userData)
				return user.first_name || ''
			}
		} catch (e) {
			// Ignore parse errors
		}
		return ''
	}

	const getInitialLastName = () => {
		if (headerData?.last_name) {
			return headerData.last_name
		}
		// Try localStorage as fallback
		try {
			const userData = localStorage.getItem('user')
			if (userData) {
				const user = JSON.parse(userData)
				return user.last_name || ''
			}
		} catch (e) {
			//Ignore parse errors
		}
		return ''
	}

	const getInitialEmail = () => {
		if (headerData?.email) {
			return headerData.email
		}
		// Try localStorage as fallback
		try {
			const userData = localStorage.getItem('user')
			if (userData) {
				const user = JSON.parse(userData)
				return user.email || ''
			}
		} catch (e) {
			//Ignore parse errors
		}
		return ''
	}

	const [firstName, setFirstName] = useState(getInitialName())
	const [lastName, setLastName] = useState(getInitialLastName())
	const [email, setEmail] = useState(getInitialEmail())
	const [phoneValue, setPhoneValue] = useState(headerData?.phone || '')
	const [locationValue, setLocationValue] = useState(headerData?.location || '')
	const [linkedinValue, setLinkedinValue] = useState(headerData?.linkedin || '')
	const [githubValue, setGithubValue] = useState(headerData?.github || '')
	const [portfolioValue, setPortfolioValue] = useState(headerData?.portfolio || '')
	const [taglineValue, setTaglineValue] = useState(headerData?.tagline || '')

	// Update local state when headerData changes (e.g., from discard changes)
	useEffect(() => {
		if (headerData) {
			setFirstName(headerData.first_name || '')
			setLastName(headerData.last_name || '')
			setEmail(headerData.email || '')
			setPhoneValue(headerData.phone || '')
			setLocationValue(headerData.location || '')
			setLinkedinValue(headerData.linkedin || '')
			setGithubValue(headerData.github || '')
			setPortfolioValue(headerData.portfolio || '')
			setTaglineValue(headerData.tagline || '')
			setShowEmail(headerData.visibility?.showEmail ?? true)
			setShowPhone(headerData.visibility?.showPhone ?? true)
			setShowLocation(headerData.visibility?.showLocation ?? true)
			setShowLinkedin(headerData.visibility?.showLinkedin ?? true)
			setShowGithub(headerData.visibility?.showGithub ?? true)
			setShowPortfolio(headerData.visibility?.showPortfolio ?? true)
			setShowTagline(headerData.visibility?.showTagline ?? true)
			if (headerData.contactOrder) {
				setContactOrder(headerData.contactOrder)
			}
		}
	}, [headerData])

	// export header data whenever any header-related states change.
	// export both actual values and visibility states separately.
	useEffect(() => {
		const exportedData = {
			// actual values (always exported, regardless of visibility).
			first_name: firstName,
			last_name: lastName,
			email: email,
			phone: phoneValue,
			location: locationValue,
			linkedin: linkedinValue,
			github: githubValue,
			portfolio: portfolioValue,
			tagline: taglineValue,
			// visibility states.
			visibility: {
				showEmail,
				showPhone,
				showLocation,
				showLinkedin,
				showGithub,
				showPortfolio,
				showTagline,
			},
			// contact ordering (includes email).
			contactOrder: contactOrder,
		}
		onHeaderChange(exportedData)
	}, [firstName, lastName, email, phoneValue, locationValue, linkedinValue, githubValue, portfolioValue, taglineValue, showEmail, showPhone, showLocation, showLinkedin, showGithub, showPortfolio, showTagline, contactOrder])

	const fieldMap = {
		email: { label: 'Email', value: email, setValue: setEmail, show: showEmail, setShow: setShowEmail },
		phone: { label: 'Phone Number', value: phoneValue, setValue: setPhoneValue, show: showPhone, setShow: setShowPhone },
		location: { label: 'Location', value: locationValue, setValue: setLocationValue, show: showLocation, setShow: setShowLocation },
		linkedin: { label: 'LinkedIn', value: linkedinValue, setValue: setLinkedinValue, show: showLinkedin, setShow: setShowLinkedin },
		github: { label: 'GitHub', value: githubValue, setValue: setGithubValue, show: showGithub, setShow: setShowGithub },
		portfolio: { label: 'Portfolio', value: portfolioValue, setValue: setPortfolioValue, show: showPortfolio, setShow: setShowPortfolio },
	}

	const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || ''

	const doneBtn = () => (
		<button
			type="button"
			data-done-btn
			onClick={() => {
				setTimeout(() => setEditingField(null), 0)
			}}
			className="p-2 rounded-md text-brand-pink bg-brand-pink/10 hover:bg-brand-pink/15 transition-colors"
			aria-label="Done"
			title="Done"
		>
			<FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
		</button>
	)

	const handleInputBlur = (e) => {
		// Don't exit if focus moved to our done button (avoid re-opening edit)
		if (e.relatedTarget?.closest?.('[data-done-btn]')) return
		setEditingField(null)
	}

	const pencilBtn = (fieldKey, label) => (
		<button
			type="button"
			onClick={() => setEditingField(fieldKey)}
			className="p-2 rounded-md text-gray-400 hover:text-brand-pink hover:bg-gray-50 transition-colors"
			aria-label={label}
			title={label}
		>
			<FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5" />
		</button>
	)

	const taglineRow = (
		<div className="flex items-center gap-4 py-3.5">
			<label className="w-28 flex-shrink-0 text-sm font-medium text-gray-500">Tagline</label>
			<div className="flex-1 min-w-0 flex items-center gap-3">
				{editingField === 'tagline' ? (
					<>
						<input
							type="text"
							value={taglineValue}
							onBlur={handleInputBlur}
							onChange={(e) => setTaglineValue(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
							className="input py-1.5 text-sm flex-1 disabled:opacity-60"
							disabled={!showTagline}
							placeholder="**Bold** · _italic_ · type * for middle dots (·)"
							autoFocus
						/>
						<button
							type="button"
							onClick={() => setShowTagline((prev) => !prev)}
							className="p-2 rounded-md text-gray-400 hover:text-brand-pink hover:bg-gray-50 transition-colors"
							title={showTagline ? 'Hide on resume' : 'Show on resume'}
						>
							<FontAwesomeIcon icon={showTagline ? faEye : faEyeSlash} className="w-3.5 h-3.5" />
						</button>
						{doneBtn()}
					</>
				) : (
					<>
						<span className={`text-sm flex-1 ${taglineValue ? 'text-gray-900' : 'text-gray-400'}`}>
							{taglineValue || 'Optional line below your name'}
						</span>
						<button
							type="button"
							onClick={() => setShowTagline((prev) => !prev)}
							className="p-2 rounded-md text-gray-400 hover:text-brand-pink hover:bg-gray-50 transition-colors"
							title={showTagline ? 'Hide on resume' : 'Show on resume'}
						>
							<FontAwesomeIcon icon={showTagline ? faEye : faEyeSlash} className="w-3.5 h-3.5" />
						</button>
						{pencilBtn('tagline', 'Edit tagline')}
					</>
				)}
			</div>
		</div>
	)

	const nameRow = (
		<div className="flex items-center gap-4 py-4">
			<label className="w-28 flex-shrink-0 text-sm font-medium text-gray-500">
				Your name <RequiredAsterisk />
			</label>
			<div className="flex-1 min-w-0 flex items-center gap-3">
				{editingField === 'name' ? (
					<>
						<input
							type="text"
							value={firstName + (lastName ? ' ' + lastName : '')}
							onBlur={handleInputBlur}
							onChange={(e) => {
								const val = e.target.value
								const lastSpaceIndex = val.lastIndexOf(' ')
								if (lastSpaceIndex === -1) {
									setFirstName(val)
									setLastName('')
								} else {
									const afterSpace = val.substring(lastSpaceIndex + 1)
									if (afterSpace.length > 0) {
										setFirstName(val.substring(0, lastSpaceIndex))
										setLastName(afterSpace)
									} else {
										setFirstName(val)
										setLastName('')
									}
								}
							}}
							onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
							className="input py-1.5 text-sm flex-1"
							placeholder="First and last name"
							autoFocus
						/>
						{doneBtn()}
					</>
				) : (
					<>
						<span className={`text-sm flex-1 ${fullName ? 'text-gray-900' : 'text-gray-400'}`}>
							{fullName || 'Add your name'}
						</span>
						{pencilBtn('name', 'Edit name')}
					</>
				)}
			</div>
		</div>
	)

	const contactRow = (fieldKey, field, index) => {
		const isEditing = editingField === fieldKey
		const isDragging = draggedField === fieldKey
		const isDragOver = dragOverIndex === index
		return (
			<div
				key={fieldKey}
				draggable={!isEditing}
				onDragStart={(e) => {
					setDraggedField(fieldKey)
					e.dataTransfer.effectAllowed = 'move'
					e.dataTransfer.setData('text/plain', fieldKey)
				}}
				onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIndex(index) }}
				onDragLeave={() => setDragOverIndex(null)}
				onDrop={(e) => {
					e.preventDefault()
					if (!draggedField || draggedField === fieldKey) return
					const di = contactOrder.indexOf(draggedField)
					if (di === -1 || di === index) return
					const next = [...contactOrder]
					const [removed] = next.splice(di, 1)
					next.splice(index, 0, removed)
					setContactOrder(next)
					setDraggedField(null)
					setDragOverIndex(null)
				}}
				onDragEnd={() => { setDraggedField(null); setDragOverIndex(null) }}
				className={`flex items-center gap-4 py-3.5 transition-colors
					${isDragOver ? 'bg-gray-50/80 rounded-lg -mx-1 px-2' : ''}
					${isDragging ? 'opacity-50' : ''}`}
			>
				<div className="w-28 flex-shrink-0 flex items-center gap-4">
					<FontAwesomeIcon icon={faGripVertical} className="w-3.5 h-3.5 text-gray-300 cursor-move flex-shrink-0" />
					<label className="text-sm font-medium text-gray-500">{field.label}</label>
				</div>
				<div className="flex-1 min-w-0 flex items-center gap-3">
					{isEditing ? (
						<>
							<input
								type="text"
								value={field.value}
								onBlur={handleInputBlur}
								onChange={(e) => field.setValue(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
								className="input py-1.5 text-sm flex-1 disabled:opacity-60"
								disabled={!field.show}
								placeholder={field.label}
								autoFocus
							/>
							<button
								type="button"
								onClick={() => field.setShow(prev => !prev)}
								className="p-2 rounded-md text-gray-400 hover:text-brand-pink hover:bg-gray-50 transition-colors"
								title={field.show ? 'Hide on resume' : 'Show on resume'}
							>
								<FontAwesomeIcon icon={field.show ? faEye : faEyeSlash} className="w-3.5 h-3.5" />
							</button>
							{doneBtn()}
						</>
					) : (
						<>
							<span className={`text-sm flex-1 ${field.value ? 'text-gray-900' : 'text-gray-400'}`}>
								{field.value || `Add ${field.label.toLowerCase()}`}
							</span>
							<button
								type="button"
								onClick={() => field.setShow(prev => !prev)}
								className="p-2 rounded-md text-gray-400 hover:text-brand-pink hover:bg-gray-50 transition-colors"
								title={field.show ? 'Hide on resume' : 'Show on resume'}
							>
								<FontAwesomeIcon icon={field.show ? faEye : faEyeSlash} className="w-3.5 h-3.5" />
							</button>
							{pencilBtn(fieldKey, `Edit ${field.label}`)}
						</>
					)}
				</div>
			</div>
		)
	}

	const content = (
		<div className="divide-y divide-gray-100">
			{nameRow}
			{taglineRow}
			{contactOrder.map((key, i) => {
				const f = fieldMap[key]
				return f ? contactRow(key, f, i) : null
			})}
		</div>
	)

	if (bare) {
		return <div className="px-4 py-5">{content}</div>
	}

	return (
		<div className="mb-4">
			<h2 className="text-lg font-semibold text-gray-900 mb-3">Resume Header</h2>
			{content}
		</div>
	)
}

export default ResumeHeader;
