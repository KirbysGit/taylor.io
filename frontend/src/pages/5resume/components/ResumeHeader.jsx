// pages / 5resume / components / ResumeHeader.jsx

// imports.
import { useState } from 'react'

// icons imports.
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { RequiredAsterisk, ChevronDown, ChevronUp } from '@/components/icons'

// ----------- component -----------
const ResumeHeader = ({ headerData, onHeaderChange }) => {
	
	// collapsible section state.
	const [isHeaderExpanded, setIsHeaderExpanded] = useState(true)

	// visibility states for optional contacts.
	const [showPhone, setShowPhone] = useState(true)
	const [showLocation, setShowLocation] = useState(true)
	const [showLinkedin, setShowLinkedin] = useState(true)
	const [showGithub, setShowGithub] = useState(true)
	const [showPortfolio, setShowPortfolio] = useState(true)

	console.log(headerData);

	return (
		<div className="flex flex-col mb-4 border-[2px] border-brand-pink-light rounded-md p-4">
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
					<div className="flex gap-4 mb-4">
						<div className="labelInputPair">
							<label className="label">Your Name <RequiredAsterisk /></label>
							<input
								type="text"
								value={`${headerData?.first_name || ''} ${headerData?.last_name || ''}`.trim()}
								onChange={(e) => {
									const fullName = e.target.value.trim()
									const parts = fullName.split(' ')
									const firstName = parts[0] || ''
									const lastName = parts.slice(1).join(' ') || ''
									onHeaderChange({ 
										...(headerData || {}), 
										first_name: firstName,
										last_name: lastName
									})
								}}
								className="input"
								required
							/>
						</div>
						<div className="labelInputPair">
							<label className="label">Email <RequiredAsterisk /></label>
							<input
								type="text"
								value={headerData?.email || ''}
								onChange={(e) => onHeaderChange({ ...headerData, email: e.target.value })}
								className="input"
								required
							/>
						</div>
					</div>
					
					{/* optional contacts */}
					<div className="flex flex-col mt-4 gap-2">
						<h2 className="sectionHeading">Nice To Haves (Optional Contacts)</h2>
						{/* phone number */}
						<div className="labelInputPairHoriz">
							<label className="labelHoriz">Phone Number</label>
							<input
								type="text"
								value={headerData?.phone || ''}
								onChange={(e) => onHeaderChange({ ...headerData, phone: e.target.value })}
								className="input flex-1"
							/>
							<button
								type="button"
								onClick={() => setShowPhone(!showPhone)}
								className="visibilityToggle"
								aria-label={showPhone ? 'Hide phone number' : 'Show phone number'}
								tabIndex={-1}
							>
								<FontAwesomeIcon icon={showPhone ? faEyeSlash : faEye} className="w-5 h-5" />
							</button>
						</div>
						{/* location */}
						<div className="labelInputPairHoriz">
							<label className="labelHoriz">Location</label>
							<input
								type="text"
								value={headerData?.location || ''}
								onChange={(e) => onHeaderChange({ ...headerData, location: e.target.value })}
								className="input flex-1"
							/>
							<button
								type="button"
								onClick={() => setShowLocation(!showLocation)}
								className="visibilityToggle"
								aria-label={showLocation ? 'Hide location' : 'Show location'}
								tabIndex={-1}
							>
								<FontAwesomeIcon icon={showLocation ? faEyeSlash : faEye} className="w-5 h-5" />
							</button>
						</div>
						{/* linkedin */}
						<div className="labelInputPairHoriz">
							<label className="labelHoriz">LinkedIn</label>
							<input
								type="text"
								value={headerData?.linkedin || ''}
								onChange={(e) => onHeaderChange({ ...headerData, linkedin: e.target.value })}
								className="input flex-1"
							/>
							<button
								type="button"
								onClick={() => setShowLinkedin(!showLinkedin)}
								className="visibilityToggle"
								aria-label={showLinkedin ? 'Hide linkedin' : 'Show linkedin'}
								tabIndex={-1}
							>
								<FontAwesomeIcon icon={showLinkedin ? faEyeSlash : faEye} className="w-5 h-5" />
							</button>
						</div>
						{/* github */}
						<div className="labelInputPairHoriz">
							<label className="labelHoriz">GitHub</label>
							<input
								type="text"
								value={headerData?.github || ''}
								onChange={(e) => onHeaderChange({ ...headerData, github: e.target.value })}
								className="input flex-1"
							/>
							<button
								type="button"
								onClick={() => setShowGithub(!showGithub)}
								className="visibilityToggle"
								aria-label={showGithub ? 'Hide github' : 'Show github'}
								tabIndex={-1}
							>
								<FontAwesomeIcon icon={showGithub ? faEyeSlash : faEye} className="w-5 h-5" />
							</button>
						</div>
						{/* portfolio */}
						<div className="labelInputPairHoriz">
							<label className="labelHoriz">Portfolio</label>
							<input
								type="text"
								value={headerData?.portfolio || ''}
								onChange={(e) => onHeaderChange({ ...headerData, portfolio: e.target.value })}
								className="input flex-1"
							/>
							<button
								type="button"
								onClick={() => setShowPortfolio(!showPortfolio)}
								className="visibilityToggle"
								aria-label={showPortfolio ? 'Hide portfolio' : 'Show portfolio'}
								tabIndex={-1}
							>
								<FontAwesomeIcon icon={showPortfolio ? faEyeSlash : faEye} className="w-5 h-5" />
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default ResumeHeader;
