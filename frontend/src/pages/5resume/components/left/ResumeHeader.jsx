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
import { faEye, faEyeSlash, faGripVertical } from '@fortawesome/free-solid-svg-icons'
import { RequiredAsterisk, ChevronDown, ChevronUp } from '@/components/icons'

// ----------- component -----------
const ResumeHeader = ({ headerData, onHeaderChange }) => {
	
	// collapsible section state.
	const [isHeaderExpanded, setIsHeaderExpanded] = useState(true)

	// visibility states for contacts (including email).
	const [showEmail, setShowEmail] = useState(headerData?.visibility?.showEmail ?? true)
	const [showPhone, setShowPhone] = useState(headerData?.visibility?.showPhone ?? true)
	const [showLocation, setShowLocation] = useState(headerData?.visibility?.showLocation ?? true)
	const [showLinkedin, setShowLinkedin] = useState(headerData?.visibility?.showLinkedin ?? true)
	const [showGithub, setShowGithub] = useState(headerData?.visibility?.showGithub ?? true)
	const [showPortfolio, setShowPortfolio] = useState(headerData?.visibility?.showPortfolio ?? true)

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
			setShowEmail(headerData.visibility?.showEmail ?? true)
			setShowPhone(headerData.visibility?.showPhone ?? true)
			setShowLocation(headerData.visibility?.showLocation ?? true)
			setShowLinkedin(headerData.visibility?.showLinkedin ?? true)
			setShowGithub(headerData.visibility?.showGithub ?? true)
			setShowPortfolio(headerData.visibility?.showPortfolio ?? true)
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
			// visibility states.
			visibility: {
				showEmail,
				showPhone,
				showLocation,
				showLinkedin,
				showGithub,
				showPortfolio,
			},
			// contact ordering (includes email).
			contactOrder: contactOrder,
		}
		onHeaderChange(exportedData)
	}, [firstName, lastName, email, phoneValue, locationValue, linkedinValue, githubValue, portfolioValue, showEmail, showPhone, showLocation, showLinkedin, showGithub, showPortfolio, contactOrder])

	return (
		<div className="flex flex-col mb-4 border-[2px] border-brand-pink-light rounded-md p-4">
			{/* header with chevron */}
			<div
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
			</div>
			
			{isHeaderExpanded && (
				<div>
					<p className="text-[0.875rem] text-gray-500 mb-2">This is the top of your resume. It's your brand.</p>
					
					{/* name */}
					<div className="mb-4">
						<div className="labelInputPair">
							<label className="label">Your Name <RequiredAsterisk /></label>
							<input
								type="text"
								value={firstName + (lastName ? ' ' + lastName : '')}
								onChange={(e) => {
									const fullName = e.target.value
									// Split on the last space to handle multiple middle names correctly
									const lastSpaceIndex = fullName.lastIndexOf(' ')
									if (lastSpaceIndex === -1) {
										// No space found, treat entire string as first name
										setFirstName(fullName)
										setLastName('')
									} else {
										// Check if there's content after the last space
										const afterSpace = fullName.substring(lastSpaceIndex + 1)
										if (afterSpace.length > 0) {
											// There's content after the space, split normally
											setFirstName(fullName.substring(0, lastSpaceIndex))
											setLastName(afterSpace)
										} else {
											// Trailing space - keep it in firstName so user can continue typing
											setFirstName(fullName)
											setLastName('')
										}
									}
								}}
								className="input"
								required
							/>
						</div>
					</div>
					
					{/* contact fields with drag and drop */}
					<div className="flex flex-col mt-4 gap-2">
						<h2 className="sectionHeading">Nice To Haves (Optional Contacts)</h2>
						
						{/* Contact Fields - Rendered in specified order with drag handles */}
						{contactOrder.map((fieldKey, index) => {
							// Map field keys to their values and visibility states
							const fieldMap = {
								email: {
									label: 'Email',
									value: email,
									setValue: setEmail,
									show: showEmail,
									setShow: setShowEmail,
									required: false,
								},
								phone: {
									label: 'Phone Number',
									value: phoneValue,
									setValue: setPhoneValue,
									show: showPhone,
									setShow: setShowPhone,
									required: false,
								},
								location: {
									label: 'Location',
									value: locationValue,
									setValue: setLocationValue,
									show: showLocation,
									setShow: setShowLocation,
									required: false,
								},
								linkedin: {
									label: 'LinkedIn',
									value: linkedinValue,
									setValue: setLinkedinValue,
									show: showLinkedin,
									setShow: setShowLinkedin,
									required: false,
								},
								github: {
									label: 'GitHub',
									value: githubValue,
									setValue: setGithubValue,
									show: showGithub,
									setShow: setShowGithub,
									required: false,
								},
								portfolio: {
									label: 'Portfolio',
									value: portfolioValue,
									setValue: setPortfolioValue,
									show: showPortfolio,
									setShow: setShowPortfolio,
									required: false,
								},
							}

							const field = fieldMap[fieldKey]
							if (!field) return null

							const isDragging = draggedField === fieldKey
							const isDragOver = dragOverIndex === index

							// Drag handlers
							const handleDragStart = (e) => {
								setDraggedField(fieldKey)
								e.dataTransfer.effectAllowed = 'move'
								e.dataTransfer.setData('text/plain', fieldKey)
							}

							const handleDragOver = (e) => {
								e.preventDefault()
								e.dataTransfer.dropEffect = 'move'
								setDragOverIndex(index)
							}

							const handleDragLeave = () => {
								setDragOverIndex(null)
							}

							const handleDrop = (e) => {
								e.preventDefault()
								
								if (!draggedField) return

								const draggedIndex = contactOrder.indexOf(draggedField)
								if (draggedIndex === -1 || draggedIndex === index) {
									setDraggedField(null)
									setDragOverIndex(null)
									return
								}

								// Reorder contact fields
								const newOrder = [...contactOrder]
								const [removed] = newOrder.splice(draggedIndex, 1)
								newOrder.splice(index, 0, removed)

								setContactOrder(newOrder)
								setDraggedField(null)
								setDragOverIndex(null)
							}

							const handleDragEnd = () => {
								setDraggedField(null)
								setDragOverIndex(null)
							}

							return (
								<div
									key={fieldKey}
									draggable={true}
									onDragStart={handleDragStart}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onDrop={handleDrop}
									onDragEnd={handleDragEnd}
									className={`
										labelInputPairHoriz
										${isDragging ? 'opacity-50' : ''}
										${isDragOver ? 'border-2 border-brand-pink border-dashed rounded' : ''}
									`}
								>
									{/* Drag Handle - 6 dots */}
									<div className="flex-shrink-0 text-gray-400 cursor-move px-2">
										<FontAwesomeIcon icon={faGripVertical} className="w-4 h-4" />
									</div>
									
									{/* Label */}
									<label className="labelHoriz">
										{field.label}&nbsp;{field.required && <RequiredAsterisk />}
									</label>
									
									{/* Input */}
									<input
										type="text"
										value={field.value}
										onChange={(e) => field.setValue(e.target.value)}
										className="input flex-1"
										disabled={!field.show}
										required={field.required}
									/>
									
									{/* Visibility Toggle */}
									{field.setShow && (
										<button
											type="button"
											onClick={() => field.setShow(prev => !prev)}
											className="visibilityToggle"
											aria-label={field.show ? `Hide ${field.label.toLowerCase()}` : `Show ${field.label.toLowerCase()}`}
											tabIndex={-1}
										>
											<FontAwesomeIcon icon={field.show ? faEye : faEyeSlash} className="w-5 h-5" />
										</button>
									)}
								</div>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}

export default ResumeHeader;
