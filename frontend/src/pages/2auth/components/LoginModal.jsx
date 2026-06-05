import { useState, useEffect, useId } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faEnvelope, faEye, faEyeSlash, faLock, faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import { XIcon, ErrorIcon } from '@/components/icons'
import { loginUser, resendVerification } from '@/api/services/auth'

function LoginModal({ isOpen, onClose, onSwitchToSignUp, onLoginSuccess, onForgotPassword, statusMessage }) {
	const formId = useId()
	const errorId = `${formId}-error`

	const [formData, setFormData] = useState({
		email: '',
		password: '',
	})
	const [error, setError] = useState('')
	const [unverifiedEmail, setUnverifiedEmail] = useState('')
	const [resendStatus, setResendStatus] = useState('')
	const [fieldErrors, setFieldErrors] = useState({})
	const [isLoading, setIsLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

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
		const nextErrors = {}

		if (!formData.email.trim()) {
			nextErrors.email = 'Enter your email address.'
		} else if (!emailRegex.test(formData.email.trim())) {
			nextErrors.email = 'Enter a valid email address.'
		}

		if (!formData.password.trim()) {
			nextErrors.password = 'Enter your password.'
		}

		if (Object.keys(nextErrors).length > 0) {
			setFieldErrors(nextErrors)
			return
		}

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
			const detail = err.response?.data?.detail
			if (detail?.code === 'email_not_verified') {
				setUnverifiedEmail(detail.email || formData.email)
				setError(detail.message || 'Please verify your email before signing in.')
			}
			else if (typeof detail === 'string') setError(detail)
			else if (detail?.message) setError(detail.message)
			else if (err.response?.data?.message) setError(err.response.data.message)
			else setError('Sign in failed — double-check your email and password.')
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
		setError('')
		setResendStatus('')
		setUnverifiedEmail('')
		setFieldErrors((prev) => {
			if (!prev[name]) return prev
			const next = { ...prev }
			delete next[name]
			return next
		})
	}

	if (!isOpen) return null
	const emailErrorId = `${formId}-email-error`
	const passwordErrorId = `${formId}-password-error`
	const describedBy = [
		error ? errorId : null,
		fieldErrors.email ? emailErrorId : null,
		fieldErrors.password ? passwordErrorId : null,
	].filter(Boolean).join(' ') || undefined

	return (
		<div
			className="auth-modal-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-20 animate-fade-in sm:p-5 sm:pt-16 lg:pt-14"
			role="presentation"
		>
			<div
				className="auth-card info-scrollbar animate-fade-in w-full max-w-[31rem] overflow-y-auto overflow-x-hidden rounded-[1.45rem] border border-brand-pink/18 bg-white/88 shadow-[0_28px_80px_-24px_rgba(120,40,40,0.34)] backdrop-blur-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="login-modal-title"
				aria-describedby={describedBy}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="auth-modal-content relative flex flex-col overflow-visible px-5 py-5 sm:px-8 sm:py-7">
					<button
						type="button"
						onClick={onClose}
						className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 transition hover:bg-brand-pink-lighter/70 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
						aria-label="Close"
					>
						<XIcon className="h-5 w-5" />
					</button>

					<div className="auth-modal-hero mb-5 mt-2 text-center">
						<p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-brand-pink">Welcome back</p>
						<h2 id="login-modal-title" className="mx-auto mt-2 max-w-[23rem] font-serif text-[2rem] font-black leading-[0.98] tracking-tight text-gray-950 sm:text-[2.35rem]">
							Continue your growth.
						</h2>
						<p className="mx-auto mt-3 max-w-[22rem] text-sm leading-relaxed text-gray-600">
							Sign in to keep your profile, drafts, and tailored r&eacute;sum&eacute;s moving forward.
						</p>
					</div>

					{statusMessage && (
						<div className="mb-3 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-400 px-4 py-3.5 text-sm font-semibold text-white" role="status">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								className="size-5 shrink-0 text-white"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"
									strokeDasharray="63" strokeDashoffset="63"
									style={{ animation: 'draw-circle 0.4s ease-out forwards' }}
								/>
								<path
									stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
									d="M7 12.5l3.5 3.5 6.5-7"
									strokeDasharray="14" strokeDashoffset="14"
									style={{ animation: 'draw-check 0.3s ease-out 0.35s forwards' }}
								/>
							</svg>
							<span>{statusMessage}</span>
						</div>
					)}

					<form onSubmit={handleSubmit} className="auth-form space-y-3.5" noValidate>
						<div>
							<label htmlFor="login-email" className="auth-compact-label label">
								Email
							</label>
							<div className="relative">
								<input
									id="login-email"
									type="email"
									name="email"
									value={formData.email}
									onChange={handleChange}
									className="auth-compact-input input pl-10"
									placeholder="you@example.com"
									autoComplete="email"
									required
									aria-invalid={fieldErrors.email ? 'true' : undefined}
									aria-describedby={fieldErrors.email ? emailErrorId : undefined}
								/>
								<FontAwesomeIcon icon={faEnvelope} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
							</div>
							{fieldErrors.email && (
								<div id={emailErrorId} className="errorMessage mt-2" role="alert">
									<ErrorIcon className="errorMessage-icon" />
									<span>{fieldErrors.email}</span>
								</div>
							)}
						</div>

						<div>
							<label htmlFor="login-password" className="auth-compact-label label">
								Password
							</label>
							<div className="relative">
								<input
									id="login-password"
									type={showPassword ? 'text' : 'password'}
									name="password"
									value={formData.password}
									onChange={handleChange}
									className="auth-compact-input input pl-10 pr-11"
									placeholder="Password"
									autoComplete="current-password"
									required
									aria-invalid={fieldErrors.password ? 'true' : undefined}
									aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
								/>
								<FontAwesomeIcon icon={faLock} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
								<button
									type="button"
									onClick={() => setShowPassword((p) => !p)}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
									className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
								>
									<FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-4 w-4" />
								</button>
							</div>
							{fieldErrors.password && (
								<div id={passwordErrorId} className="errorMessage mt-2" role="alert">
									<ErrorIcon className="errorMessage-icon" />
									<span>{fieldErrors.password}</span>
								</div>
							)}
						</div>

						<div className="flex flex-wrap items-center justify-end gap-3">
							<button
								type="button"
								onClick={onForgotPassword}
								className="text-xs font-bold text-brand-pink-dark transition hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
							>
								Forgot password?
							</button>
						</div>

						{error && (
							<div id={errorId} className="errorMessage" role="alert">
								<ErrorIcon className="errorMessage-icon shrink-0" />
								<span>
									{error}
									{unverifiedEmail ? (
										<div className="mt-2">
											<button
												type="button"
												onClick={async () => {
													setResendStatus('')
													await resendVerification(unverifiedEmail)
													setResendStatus('Verification email sent. Check your inbox.')
												}}
												className="font-bold underline underline-offset-2"
											>
												Resend verification email
											</button>
										</div>
									) : null}
								</span>
							</div>
						)}
						{resendStatus ? <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">{resendStatus}</div> : null}

						<button
							type="submit"
							disabled={isLoading}
							className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-pink py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(214,86,86,0.28)] transition hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
						>
							{isLoading ? 'Signing in...' : 'Sign in'}
							<FontAwesomeIcon icon={faArrowRight} className="size-4" />
						</button>
					</form>

					<div className="auth-trust-line mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[0.72rem] font-medium text-gray-500">
						<span className="inline-flex items-center gap-1.5">
							<FontAwesomeIcon icon={faLock} className="size-3 text-cyan-600" />
							Drafts stay private
						</span>
						<span className="inline-flex items-center gap-1.5">
							<FontAwesomeIcon icon={faPenToSquare} className="size-3 text-violet-500" />
							Edit before export
						</span>
					</div>

					<div className="auth-switch-row -mx-5 mt-4 border-t border-gray-100 px-5 pt-3.5 text-center sm:-mx-7 sm:px-7">
						<p className="text-sm text-gray-600">
							Don&apos;t have an account?{' '}
							<button
								type="button"
								onClick={onSwitchToSignUp}
								className="font-bold text-brand-pink decoration-brand-pink/45 underline-offset-2 transition hover:underline hover:opacity-90 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								Create account →
							</button>
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}

export default LoginModal
