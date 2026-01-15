// components / 2auth / components / SignUpModal.jsx

// sign up modal component.

// to-do:
//	- password complexity
//	- email verification

// imports.
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

// --- services imports.
import { registerUser } from '@/api/services/auth'

function SignUpModal({ isOpen, onClose, onSwitchToLogin, onSignUpSuccess }) {

	// ---- states ----
	const [error, setError] = useState('')									// error state.
	const [isLoading, setIsLoading] = useState(false)						// loading state.
	const [showPassword, setShowPassword] = useState(false)					// show password or not.
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)	// show confirm password.

	// form data.
	const [formData, setFormData] = useState({
		first_name: '',
		last_name: '',
		email: '',
		password: '',
		confirmPassword: '',
	})
	
	// ---- functions ----

	// function to handle form submission.
  	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		
		// if passwords do not match, set error and return.
		if (formData.password !== formData.confirmPassword) {
			setError('Passwords do not match')
			return
		}

		// if password is less than 6 characters, set error and return.
		if (formData.password.length < 6) {
			setError('Password must be at least 6 characters')
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
			setError(err.response?.data?.detail || err.response?.data?.message || 'Sign up failed. Please try again.')
		} finally {
			setIsLoading(false)
		}
  	}

	// function to handle form field changes.
	const handleChange = (e) => {
		const { name, value } = e.target
		setFormData(prev => ({
			...prev,
			[name]: value
		}))
	}

	// if modal is not open, return null.
  	if (!isOpen) return null

  	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-start pl-[7.5%] z-50">
			<div className="bg-white-bright rounded-lg shadow-xl w-full max-w-[496px] p-8 relative">
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
					<div className="text-gray-600 h-[3px] bg-brand-pink opacity-80 w-full"></div>
				</div>

				{/* sign up form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* name entry fields */}
					<div className="flex gap-2">
						{/* first name field */}
						<div className="flex-1">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								First Name
							</label>
							<input
								type="text"
								name="first_name"
								value={formData.first_name}
								onChange={handleChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent"
								placeholder="John"
								required
							/>
						</div>

						{/* last name field */}
						<div className="flex-1">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Last Name
							</label>
							<input
								type="text"
								name="last_name"
								value={formData.last_name}
								onChange={handleChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent"
								placeholder="Doe"
								required
							/>
						</div>
					</div>

					{/* email entry field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Email
						</label>
						<input
							type="email"
							name="email"
							value={formData.email}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							placeholder="you@example.com"
							required
						/>
					</div>
					
					{/* password entry field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Password
						</label>
						<div className="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								name="password"
								value={formData.password}
								onChange={handleChange}
								className="w-full px-4 py-2 pr-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent"
								placeholder="••••••••"
								required
							/>
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
					</div>

					{/* confirm password entry field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Confirm Password
						</label>
						<div className="relative">
							<input
								type={showConfirmPassword ? 'text' : 'password'}
								name="confirmPassword"
								value={formData.confirmPassword}
								onChange={handleChange}
								className="w-full px-4 py-2 pr-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent"
								placeholder="••••••••"
								required
							/>
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
					</div>

					{/* error message if any */}
					{error && (
						<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
						{error}
						</div>
					)}

					{/* create account button */}
					<button
						type="submit"
						disabled={isLoading}
						className="w-full bg-brand-pink text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? 'Creating Your Account...' : 'Create Your Account'}
					</button>
				</form>

				{/* switch to login */}
				<div className="mt-4 text-center">
					<div className="h-[3px] bg-brand-pink opacity-80 w-full"></div>
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

