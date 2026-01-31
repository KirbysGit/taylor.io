// components / 2auth / components / SignUpModal.jsx

// sign up modal component.

// to-do:
//	- password complexity
//	- email verification
// 	- proper loading state, like three dots in a wave in the create account button.

// imports.
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { RequiredAsterisk, Checkmark, XIcon } from '@/components/icons'

// --- services imports.
import { registerUser } from '@/api/services/auth'

function SignUpModal({ isOpen, onClose, onSwitchToLogin, onSignUpSuccess }) {

	// ---- states ----
	const [isLoading, setIsLoading] = useState(false)						// loading state.
	const [showPassword, setShowPassword] = useState(false)					// show password or not.
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)	// show confirm password.

	const [formError, setFormError] = useState('')							// form error state.
	const [emailError, setEmailError] = useState('')							// email error state.
	const [showPasswordRequirements, setShowPasswordRequirements] = useState(false) // show password requirements.
	const [isPasswordRequirementsClosing, setIsPasswordRequirementsClosing] = useState(false) // track if closing animation is playing.
	const [showConfirmPasswordMatch, setShowConfirmPasswordMatch] = useState(false) // show confirm password match status.
	
	// field validation states (for checkmarks).
	const [successStates, setSuccessStates] = useState({
		first_name: false,
		last_name: false,
		email: false,
		password: false,
		confirmPassword: false,
	})

	// form data.
	const [formData, setFormData] = useState({
		first_name: '',
		last_name: '',
		email: '',
		password: '',
		confirmPassword: '',
	})

	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	
	// password validation checks.
	const passwordChecks = {
		minLength: formData.password.length >= 8,
		hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password),
		hasTwoNumbers: (formData.password.match(/\d/g) || []).length >= 2,
		hasCapital: /[A-Z]/.test(formData.password),
	}
	
	const isPasswordValid = Object.values(passwordChecks).every(check => check === true)
	
	// check if all fields are valid.
	const isFormValid = successStates.first_name && 
		successStates.last_name && 
		successStates.email && 
		successStates.password && 
		successStates.confirmPassword &&
		formData.password === formData.confirmPassword
	
	// ---- functions ----

	// function to handle form submission.
  	const handleSubmit = async (e) => {
		e.preventDefault()
		setFormError('')
		
		// if passwords do not match, set error and return.
		if (formData.password !== formData.confirmPassword) {
			setFormError('Passwords do not match')
			return
		}

		// validate password requirements.
		if (!isPasswordValid) {
			setFormError('Password does not meet all requirements')
			return
		}

		// set loading state to true.
		setIsLoading(true)

		try {
			// construct user data object.
			const userData = {
				first_name: formData.first_name,
				last_name: formData.last_name,
				email: formData.email,
				password: formData.password,
			}

			// api call to register user.
			const response = await registerUser(userData)
			
			// store user data in localStorage.
			if (response.data.user) {
				localStorage.setItem('user', JSON.stringify(response.data.user))
			}

			// call success callback (this will handle navigation).
			onSignUpSuccess(response.data.user || response.data)

		} catch (err) {
			setFormError(err.response?.data?.detail || err.response?.data?.message || 'Sign up failed. Please try again.')
		} finally {
			setIsLoading(false)
		}
  	}

	// function to handle form field changes with validation.
	const handleChange = (e) => {
		const { name, value } = e.target
		
		// update form data.
		setFormData(prev => ({
			...prev,
			[name]: value
		}))
		
		// validate and update success state immediately.
		let isValid = false
		let errorMessage = ''
		
		if (name === 'email') {
			isValid = emailRegex.test(value) && value.trim() !== ''
			if (!isValid && value.trim() !== '') {
				errorMessage = 'Please enter a valid email address (e.g. example@example.com)'
			}
			setEmailError(errorMessage)
		} else if (name === 'first_name' || name === 'last_name') {
			isValid = value.trim().length > 0
		} else if (name === 'password') {
			setShowPasswordRequirements(true)
			// compute password validity with updated value.
			const passwordChecks = {
				minLength: value.length >= 8,
				hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
				hasTwoNumbers: (value.match(/\d/g) || []).length >= 2,
				hasCapital: /[A-Z]/.test(value),
			}
			isValid = Object.values(passwordChecks).every(check => check === true)
		} else if (name === 'confirmPassword') {
			isValid = value === formData.password && value.trim() !== '' && formData.password.trim() !== ''
		}
		
		// update success state.
		setSuccessStates(prev => ({
			...prev,
			[name]: isValid && value.trim() !== ''
		}))
	}
	
	// validate confirmPassword when password changes.
	useEffect(() => {
		if (formData.confirmPassword.trim() !== '') {
			const isValid = formData.confirmPassword === formData.password && formData.password.trim() !== ''
			setSuccessStates(prev => ({
				...prev,
				confirmPassword: isValid
			}))
		}
	}, [formData.password, formData.confirmPassword])

	// hide password requirements dropdown after all criteria are met (with delay to show last checkmark).
	useEffect(() => {
		if (isPasswordValid && showPasswordRequirements && !isPasswordRequirementsClosing) {
			// wait 1 second to show the last checkmark, then start slide-out animation
			const timer = setTimeout(() => {
				setIsPasswordRequirementsClosing(true)
				// after animation completes, hide the element
				setTimeout(() => {
					setShowPasswordRequirements(false)
					setIsPasswordRequirementsClosing(false)
				}, 300) // match animation duration
			}, 1000)
			
			return () => clearTimeout(timer)
		}
	}, [isPasswordValid, showPasswordRequirements, isPasswordRequirementsClosing])

	// if modal is not open, return null.
  	if (!isOpen) return null

  	return (
		<div className="fixed inset-0 flex items-center justify-center z-50">
			<div className="bg-white-bright/95 backdrop-blur-sm rounded-lg shadow-xl w-full max-w-[496px] p-8 relative">
				{/* x button */}
				<button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>

				{/* header & divider*/}
				<div className="text-center mb-4">
					<h2 className="text-3xl font-bold text-gray-900 mb-3">
						Create Account
					</h2>
					<div className="smallDivider"></div>
				</div>

				{/* sign up form */}
				<form onSubmit={handleSubmit} className="space-y-4" noValidate>
					{/* name entry fields */}
					<div className="flex gap-2">
						{/* first name field */}
						<div className="flex-1">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								First Name <RequiredAsterisk />
							</label>
							<div className="relative">
								<input
									type="text"
									name="first_name"
									value={formData.first_name}
									onChange={handleChange}
									className={`input ${successStates.first_name ? 'input-success' : ''}`}
									placeholder="anita"
									required
								/>
								{successStates.first_name && (
									<div className="successCheckmark">
										<Checkmark className="w-3 h-3 text-white" />
									</div>
								)}
							</div>
						</div>

						{/* last name field */}
						<div className="flex-1">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Last Name <RequiredAsterisk />
							</label>
							<div className="relative">
								<input
									type="text"
									name="last_name"
									value={formData.last_name}
									onChange={handleChange}
									className={`input ${successStates.last_name ? 'input-success' : ''}`}
									placeholder="job"
									required
								/>
								{successStates.last_name && (
									<div className="successCheckmark">
										<Checkmark className="w-3 h-3 text-white" />
									</div>
								)}
							</div>
						</div>
					</div>

					{/* email entry field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Email <RequiredAsterisk />
						</label>
						<div className="relative">
							<input
								type="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								className={`input ${successStates.email ? 'input-success' : ''}`}
								placeholder="you@example.com"
								required
							/>
							{successStates.email && (
								<div className="successCheckmark">
									<Checkmark className="w-3 h-3 text-white" />
								</div>
							)}
						</div>
					</div>

					{/* email error message if any */}
					{emailError && (
						<div className="errorMessage">
							{emailError}
						</div>
					)}
					
					{/* password entry field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Password <RequiredAsterisk />
						</label>
						<div className="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								name="password"
								value={formData.password}
								onChange={handleChange}
								onFocus={() => setShowPasswordRequirements(true)}
								className={`input pr-11 ${successStates.password ? 'input-success' : ''}`}
								placeholder="your password"
								required
							/>
							{successStates.password && (
								<div className="successCheckmark" style={{ right: '2.75rem' }}>
									<Checkmark className="w-3 h-3 text-white" />
								</div>
							)}
							<button
								type="button"
								onClick={() => setShowPassword(prev => !prev)}
								aria-label={showPassword ? 'Hide password' : 'Show password'}
								tabIndex={-1}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
							>
								<FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
							</button>
						</div>
						
						{/* password requirements */}
						{showPasswordRequirements && (
							<div 
								className={`passwordRequirements mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm space-y-1.5 ${
									isPasswordRequirementsClosing ? 'slide-out' : ''
								}`}
								style={isPasswordRequirementsClosing ? {
									animation: 'slide-out 0.3s ease-in-out forwards'
								} : {}}
							>
								<div className={`flex items-center gap-2 ${passwordChecks.minLength ? 'text-brand-pink-light' : 'text-gray-600'}`}>
									<span>{passwordChecks.minLength ? '✓' : '✗'}</span>
									<span>At least 8 characters</span>
								</div>
								<div className={`flex items-center gap-2 ${passwordChecks.hasSpecialChar ? 'text-brand-pink-light' : 'text-gray-600'}`}>
									<span>{passwordChecks.hasSpecialChar ? '✓' : '✗'}</span>
									<span>One special character (!@#$%^&*)</span>
								</div>
								<div className={`flex items-center gap-2 ${passwordChecks.hasTwoNumbers ? 'text-brand-pink-light' : 'text-gray-600'}`}>
									<span>{passwordChecks.hasTwoNumbers ? '✓' : '✗'}</span>
									<span>At least 2 numbers</span>
								</div>
								<div className={`flex items-center gap-2 ${passwordChecks.hasCapital ? 'text-brand-pink-light' : 'text-gray-600'}`}>
									<span>{passwordChecks.hasCapital ? '✓' : '✗'}</span>
									<span>One capital letter</span>
								</div>
							</div>
						)}
					</div>

					{/* confirm password entry field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Confirm Password <RequiredAsterisk />
						</label>
						<div className="relative">
							<input
								type={showConfirmPassword ? 'text' : 'password'}
								name="confirmPassword"
								value={formData.confirmPassword}
								onChange={handleChange}
								onFocus={() => setShowConfirmPasswordMatch(true)}
								className={`input pr-11 ${successStates.confirmPassword ? 'input-success' : ''}`}
								placeholder="your password again"
								required
							/>
							{successStates.confirmPassword && (
								<div className="successCheckmark" style={{ right: '2.75rem' }}>
									<Checkmark className="w-3 h-3 text-white" />
								</div>
							)}
							<button
								type="button"
								onClick={() => setShowConfirmPassword(prev => !prev)}
								aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
								tabIndex={-1}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
							>
								<FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
							</button>
						</div>
						
						{/* confirm password match status */}
						{showConfirmPasswordMatch && formData.confirmPassword.trim() !== '' && (
							<div className="passwordRequirements mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm space-y-1.5">
								<div className={`flex items-center gap-2 ${formData.confirmPassword === formData.password ? 'text-brand-pink-light' : 'text-gray-600'}`}>
									{formData.confirmPassword === formData.password ? (
										<Checkmark className="w-4 h-4" />
									) : (
										<XIcon className="w-4 h-4" />
									)}
									<span>Passwords match</span>
								</div>
							</div>
						)}
					</div>

					{/* error message if any */}
					{formError && (
						<div className="errorMessage">
							{formError}
						</div>
					)}

					{/* create account button */}
					<button
						type="submit"
						disabled={isLoading || !isFormValid}
						className="w-full bg-brand-pink text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? 'Creating Your Account...' : 'Create Your Account'}
					</button>
				</form>

				{/* switch to login */}
				<div className="mt-4 text-center">
					<div className="smallDivider"></div>
					<p className="text-sm text-gray-600 mt-4">
						Already have an account?{' '}
						<button
							onClick={onSwitchToLogin}
							className="text-brand-pink hover:opacity-80 font-semibold underline"
						>
							Sign in
						</button>
					</p>
				</div>
			</div>
		</div>
  )
}

export default SignUpModal

