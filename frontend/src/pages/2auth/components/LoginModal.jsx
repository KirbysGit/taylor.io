import { useState, useEffect, useId } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { XIcon } from '@/components/icons'
import { loginUser } from '@/api/services/auth'
import { AuthModalDocPreview } from './AuthModalDocPreview'

function LoginModal({ isOpen, onClose, onSwitchToSignUp, onLoginSuccess }) {
	const formId = useId()
	const errorId = `${formId}-error`

	const [formData, setFormData] = useState({
		email: '',
		password: '',
		rememberMe: false,
	})
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	useEffect(() => {
		if (!isOpen) return
		const prevOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		const onKeyDown = (e) => {
			if (e.key === 'Escape') onClose()
		}
		window.addEventListener('keydown', onKeyDown)
		return () => {
			document.body.style.overflow = prevOverflow
			window.removeEventListener('keydown', onKeyDown)
		}
	}, [isOpen, onClose])

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		setIsLoading(true)

		try {
			const response = await loginUser({
				email: formData.email,
				password: formData.password,
			})

			if (response.data.user) {
				localStorage.setItem('user', JSON.stringify(response.data.user))
			}

			if (onLoginSuccess) {
				onLoginSuccess(response.data.user || response.data)
			} else {
				onClose()
			}
		} catch (err) {
			console.error('Login failed:', err)
			if (err.response?.data?.detail) setError(err.response.data.detail)
			else if (err.response?.data?.message) setError(err.response.data.message)
			else setError('Login failed. Please check your credentials.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target
		setFormData((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value,
		}))
	}

	if (!isOpen) return null

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-fade-in"
			role="presentation"
			onClick={onClose}
		>
			<div
				className="animate-fade-in grid w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200/90 bg-white-bright shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] sm:max-w-lg md:max-w-3xl md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="login-modal-title"
				aria-describedby={error ? errorId : undefined}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Brand / visual column */}
				<div className="landing-hero-mesh relative hidden flex-col justify-between px-8 py-10 text-white md:flex md:min-h-[420px]">
					<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />
					<div className="landing-hero-orb pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
					<div className="relative">
						<p className="text-xs font-semibold uppercase tracking-widest text-white/80">taylor.io</p>
						<h2 className="mt-4 text-2xl font-bold leading-snug tracking-tight">
							Welcome back to your workspace
						</h2>
						<p className="mt-3 max-w-[260px] text-sm font-light leading-relaxed text-white/90">
							Sign in to keep building resumes and previews that match your story.
						</p>
					</div>
					<AuthModalDocPreview />
				</div>

				{/* Form column */}
				<div className="relative flex flex-col p-6 sm:p-8">
					<button
						type="button"
						onClick={onClose}
						className="absolute right-3 top-3 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 sm:right-4 sm:top-4"
						aria-label="Close"
					>
						<XIcon className="h-5 w-5" />
					</button>

					<div className="md:hidden">
						<p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-pink">taylor.io</p>
					</div>

					<div className="mb-6 mt-2 text-center md:mt-0 md:text-left">
						<h2 id="login-modal-title" className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
							Sign in
						</h2>
						<p className="mt-2 text-sm text-gray-600">
							Use the email and password for your account.
						</p>
						<div className="mx-auto mt-4 h-0.5 max-w-[5rem] rounded-full bg-brand-pink md:mx-0" />
					</div>

					<form onSubmit={handleSubmit} className="space-y-4" noValidate>
						<div>
							<label htmlFor="login-email" className="label">
								Email
							</label>
							<input
								id="login-email"
								type="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								className="input"
								placeholder="you@example.com"
								autoComplete="email"
								required
							/>
						</div>

						<div>
							<label htmlFor="login-password" className="label">
								Password
							</label>
							<div className="relative">
								<input
									id="login-password"
									type={showPassword ? 'text' : 'password'}
									name="password"
									value={formData.password}
									onChange={handleChange}
									className="input pr-11"
									placeholder="••••••••"
									autoComplete="current-password"
									required
								/>
								<button
									type="button"
									onClick={() => setShowPassword((p) => !p)}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
									className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
								>
									<FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-4 w-4" />
								</button>
							</div>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-3">
							<label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-600">
								<input
									type="checkbox"
									name="rememberMe"
									checked={formData.rememberMe}
									onChange={handleChange}
									className="h-4 w-4 rounded border-gray-300 text-brand-pink focus:ring-brand-pink focus:ring-offset-0"
								/>
								Remember me
							</label>
							<span className="text-sm text-gray-400" title="Coming soon">
								Forgot password?
							</span>
						</div>

						{error && (
							<div id={errorId} className="errorMessage" role="alert">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={isLoading}
							className="w-full rounded-xl bg-brand-pink py-3.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
						>
							{isLoading ? 'Signing in…' : 'Sign in'}
						</button>
					</form>

					<div className="mt-6 border-t border-gray-100 pt-6 text-center">
						<p className="text-sm text-gray-600">
							Don&apos;t have an account?{' '}
							<button
								type="button"
								onClick={onSwitchToSignUp}
								className="font-semibold text-brand-pink underline decoration-brand-pink/40 underline-offset-2 transition hover:opacity-90 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								Sign up
							</button>
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}

export default LoginModal
