// pages / 5resume / components / ResumeHeader.jsx

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

	// internal state for all header fields.
	const [firstName, setFirstName] = useState(headerData?.first_name || '')
	const [lastName, setLastName] = useState(headerData?.last_name || '')
	const [email, setEmail] = useState(headerData?.email || '')
	const [phoneValue, setPhoneValue] = useState(headerData?.phone || '')
	const [locationValue, setLocationValue] = useState(headerData?.location || '')
	const [linkedinValue, setLinkedinValue] = useState(headerData?.linkedin || '')
	const [githubValue, setGithubValue] = useState(headerData?.github || '')
	const [portfolioValue, setPortfolioValue] = useState(headerData?.portfolio || '')

	// export header data whenever any header-related states change.
	useEffect(() => {
		const exportedData = {
			first_name: firstName,
			last_name: lastName,
			email: email,
			phone: showPhone ? phoneValue : '',
			location: showLocation ? locationValue : '',
			linkedin: showLinkedin ? linkedinValue : '',
			github: showGithub ? githubValue : '',
			portfolio: showPortfolio ? portfolioValue : '',
		}
		onHeaderChange(exportedData)
	}, [firstName, lastName, email, phoneValue, locationValue, linkedinValue, githubValue, portfolioValue, showPhone, showLocation, showLinkedin, showGithub, showPortfolio])

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
								value={`${firstName} ${lastName}`.trim()}
								onChange={(e) => {
									const fullName = e.target.value.trim()
									const parts = fullName.split(' ')
									setFirstName(parts[0] || '')
									setLastName(parts.slice(1).join(' ') || '')
								}}
								className="input"
								required
							/>
						</div>
						<div className="labelInputPair">
							<label className="label">Email <RequiredAsterisk /></label>
							<input
								type="text"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
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
								value={phoneValue}
								onChange={(e) => setPhoneValue(e.target.value)}
								className="input flex-1"
								disabled={!showPhone}
							/>
							<button
								type="button"
								onClick={() => setShowPhone(prev => !prev)}
								className="visibilityToggle"
								aria-label={showPhone ? 'Hide phone number' : 'Show phone number'}
								tabIndex={-1}
							>
								<FontAwesomeIcon icon={showPhone ? faEye : faEyeSlash} className="w-5 h-5" />
							</button>
						</div>
						{/* location */}
						<div className="labelInputPairHoriz">
							<label className="labelHoriz">Location</label>
							<input
								type="text"
								value={locationValue}
								onChange={(e) => setLocationValue(e.target.value)}
								className="input flex-1"
								disabled={!showLocation}
							/>
							<button
								type="button"
								onClick={() => setShowLocation(prev => !prev)}
								className="visibilityToggle"
								aria-label={showLocation ? 'Hide location' : 'Show location'}
								tabIndex={-1}
							>
								<FontAwesomeIcon icon={showLocation ? faEye : faEyeSlash} className="w-5 h-5" />
							</button>
						</div>
						{/* linkedin */}
						<div className="labelInputPairHoriz">
							<label className="labelHoriz">LinkedIn</label>
							<input
								type="text"
								value={linkedinValue}
								onChange={(e) => setLinkedinValue(e.target.value)}
								className="input flex-1"
								disabled={!showLinkedin}
							/>
							<button
								type="button"
								onClick={() => setShowLinkedin(prev => !prev)}
								className="visibilityToggle"
								aria-label={showLinkedin ? 'Hide linkedin' : 'Show linkedin'}
								tabIndex={-1}
							>
								<FontAwesomeIcon icon={showLinkedin ? faEye : faEyeSlash} className="w-5 h-5" />
							</button>
						</div>
						{/* github */}
						<div className="labelInputPairHoriz">
							<label className="labelHoriz">GitHub</label>
							<input
								type="text"
								value={githubValue}
								onChange={(e) => setGithubValue(e.target.value)}
								className="input flex-1"
								disabled={!showGithub}
							/>
							<button
								type="button"
								onClick={() => setShowGithub(prev => !prev)}
								className="visibilityToggle"
								aria-label={showGithub ? 'Hide github' : 'Show github'}
								tabIndex={-1}
							>
								<FontAwesomeIcon icon={showGithub ? faEye : faEyeSlash} className="w-5 h-5" />
							</button>
						</div>
						{/* portfolio */}
						<div className="labelInputPairHoriz">
							<label className="labelHoriz">Portfolio</label>
							<input
								type="text"
								value={portfolioValue}
								onChange={(e) => setPortfolioValue(e.target.value)}
								className="input flex-1"
								disabled={!showPortfolio}
							/>
							<button
								type="button"
								onClick={() => setShowPortfolio(prev => !prev)}
								className="visibilityToggle"
								aria-label={showPortfolio ? 'Hide portfolio' : 'Show portfolio'}
								tabIndex={-1}
							>
								<FontAwesomeIcon icon={showPortfolio ? faEye : faEyeSlash} className="w-5 h-5" />
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default ResumeHeader;
