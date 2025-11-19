// components/2auth/LoginModal.jsx

// login modal component.

// imports.
import { useState } from 'react'

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

			// call success callback.
			if (onLoginSuccess) {
				onLoginSuccess(response.data.user || response.data)
			}

			// close modal.
			onClose()
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
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white-bright rounded-lg shadow-xl w-full max-w-md p-8 relative">
				{/* x button */}
				<button
					onClick={onClose}
					className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
				>
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>

				{/* header*/}
				<div className="text-center mb-6">
					<h2 className="text-3xl font-bold text-gray-900 mb-2">
						Welcome Back
					</h2>
					<p className="text-gray-600">
						Sign in to your account
					</p>
				</div>

				{/* form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Email
						</label>
						<input
							type="email"
							name="email"
							value={formData.email}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							placeholder="you@example.com"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Password
						</label>
						<input
							type="password"
							name="password"
							value={formData.password}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							placeholder="••••••••"
							required
						/>
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
						<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
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
				<div className="mt-6 text-center">
					<p className="text-sm text-gray-600">
						Don't have an account?{' '}
						<button
							onClick={onSwitchToSignUp}
							className="text-brand-pink hover:opacity-80 font-semibold"
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

