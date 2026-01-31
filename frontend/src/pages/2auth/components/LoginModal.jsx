// components/2auth/LoginModal.jsx

// login modal component.

// imports.
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { XIcon } from '@/components/icons'

// services.
import { loginUser } from '@/api/services/auth'

// ----------- main component -----------
function LoginModal({ isOpen, onClose, onSwitchToSignUp, onLoginSuccess }) {

	// states.
	const [formData, setFormData] = useState({
		email: '',													// state for email.
		password: '',												// state for password.
		rememberMe: false,											// state for remember me.
	})
	const [error, setError] = useState('')							// state for error message.
	const [isLoading, setIsLoading] = useState(false)				// state for loading state.
	const [showPassword, setShowPassword] = useState(false)			// state for showing password.

	// ------------------ functions ------------------

	// function to handle login submission.
	const handleSubmit = async (e) => {
		// prevent default form submission.
		e.preventDefault()
		setError('')
		setIsLoading(true)

		try {
			// construct credentials object.
			const credentials = {
				email: formData.email,
				password: formData.password,
			}

			// api call to login user.
			const response = await loginUser(credentials)
			
			// store user data in localStorage.
			if (response.data.user) {
				localStorage.setItem('user', JSON.stringify(response.data.user))
			}

			// call success callback (this will handle navigation).
			if (onLoginSuccess) {
				onLoginSuccess(response.data.user || response.data)
			} else {
				// if no callback, close modal.
				onClose()
			}
		} catch (err) {
			// log error.
			console.error('Login failed:', err)

			// set error message.
			if (err.response?.data?.detail) setError(err.response.data.detail)
			else if (err.response?.data?.message) setError(err.response.data.message)
			else setError('Login failed. Please check your credentials.')

		} finally {
			// set loading state to false.
			setIsLoading(false)
		}
	}

	// function to handle input change.
	const handleChange = (e) => {
		// get name, value, type, and checked from target.
		const { name, value, type, checked } = e.target

		// update form data.
		setFormData(prev => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value
		}))
	}

	// if modal is not open, return null.
	if (!isOpen) return null

	// return modal.
	return (
		<div className="fixed inset-0 flex items-center justify-center z-50">
			<div className="bg-white-bright/95 backdrop-blur-sm rounded-lg shadow-xl w-full max-w-[496px] p-8 relative">
				{/* x button */}
				<button
					onClick={onClose}
					className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
				>
					<XIcon className="w-6 h-6" />
				</button>

				{/* header & divider*/}
				<div className="text-center mb-4">
					<h2 className="text-3xl font-bold text-gray-900 mb-3">
						Welcome Back
					</h2>
					<div className="smallDivider"></div>
				</div>

				{/* form */}
				<form onSubmit={handleSubmit} className="space-y-4" noValidate>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Email
						</label>
						<input
							type="email"
							name="email"
							value={formData.email}
							onChange={handleChange}
							className="input"
							placeholder="you@example.com"
							required
						/>
					</div>

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
								className="input pr-11"
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

					<div className="flex items-center justify-between">
						<label className="flex items-center">
							<input
								type="checkbox"
								name="rememberMe"
								checked={formData.rememberMe}
								onChange={handleChange}
								className="mr-2"
							/>
							<span className="text-sm text-gray-600">Remember me</span>
						</label>
						<a href="#" className="text-sm text-brand-pink hover:opacity-80">
							Forgot password?
						</a>
					</div>

					{error && (
						<div className="errorMessage">
							{error}
						</div>
					)}

					{/* submit button */}
					<button
						type="submit"
						disabled={isLoading}
						className="w-full bg-brand-pink text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? 'Signing In...' : 'Sign In'}
					</button>
				</form>

				{/* switch to sign up */}
				<div className="mt-4 text-center">
					<div className="smallDivider"></div>
					<p className="text-sm text-gray-600 mt-4">
						Don't have an account?{' '}
						<button
							onClick={onSwitchToSignUp}
							className="text-brand-pink hover:opacity-80 font-semibold underline"
						>
							Sign up
						</button>
					</p>
				</div>
			</div>
		</div>
	)
}

// export.
export default LoginModal

