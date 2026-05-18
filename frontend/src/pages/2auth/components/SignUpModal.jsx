import { useState, useEffect, useId } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCreditCard, faEnvelope, faEye, faEyeSlash, faGift, faLock, faShieldHalved, faWandSparkles } from '@fortawesome/free-solid-svg-icons'
import { RequiredAsterisk, Checkmark, XIcon } from '@/components/icons'
import { registerUser } from '@/api/services/auth'
import { AuthModalDocPreview } from './AuthModalDocPreview'

function SignUpModal({ isOpen, onClose, onSwitchToLogin, onSignUpSuccess }) {
	const formId = useId()
	const formErrorId = `${formId}-form-error`

	const [isLoading, setIsLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [formError, setFormError] = useState('')
	const [emailError, setEmailError] = useState('')
	const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
	const [isPasswordRequirementsClosing, setIsPasswordRequirementsClosing] = useState(false)
	const [showConfirmPasswordMatch, setShowConfirmPasswordMatch] = useState(false)

	const [successStates, setSuccessStates] = useState({
		first_name: false,
		last_name: false,
		email: false,
		password: false,
		confirmPassword: false,
	})

	const [formData, setFormData] = useState({
		first_name: '',
		last_name: '',
		email: '',
		password: '',
		confirmPassword: '',
	})

	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

	const passwordChecks = {
		minLength: formData.password.length >= 8,
		hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password),
		hasTwoNumbers: (formData.password.match(/\d/g) || []).length >= 2,
		hasCapital: /[A-Z]/.test(formData.password),
	}

	const isPasswordValid = Object.values(passwordChecks).every((check) => check === true)

	const isFormValid =
		successStates.first_name &&
		successStates.last_name &&
		successStates.email &&
		successStates.password &&
		successStates.confirmPassword &&
		formData.password === formData.confirmPassword

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
		setFormError('')

		if (formData.password !== formData.confirmPassword) {
			setFormError('Passwords do not match')
			return
		}

		if (!isPasswordValid) {
			setFormError('Password does not meet all requirements')
			return
		}

		setIsLoading(true)

		try {
			const userData = {
				first_name: formData.first_name,
				last_name: formData.last_name,
				email: formData.email,
				password: formData.password,
			}

			const response = await registerUser(userData)

			if (response.data.user) {
				localStorage.setItem('user', JSON.stringify(response.data.user))
			}

			onSignUpSuccess(response.data.user || response.data)
		} catch (err) {
			setFormError(
				err.response?.data?.detail || err.response?.data?.message || 'Sign up failed. Please try again.',
			)
		} finally {
			setIsLoading(false)
		}
	}

	const handleChange = (e) => {
		const { name, value } = e.target

		setFormData((prev) => ({
			...prev,
			[name]: value,
		}))

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
			const checks = {
				minLength: value.length >= 8,
				hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
				hasTwoNumbers: (value.match(/\d/g) || []).length >= 2,
				hasCapital: /[A-Z]/.test(value),
			}
			isValid = Object.values(checks).every((check) => check === true)
		} else if (name === 'confirmPassword') {
			isValid = value === formData.password && value.trim() !== '' && formData.password.trim() !== ''
		}

		setSuccessStates((prev) => ({
			...prev,
			[name]: isValid && value.trim() !== '',
		}))
	}

	useEffect(() => {
		if (formData.confirmPassword.trim() !== '') {
			const isValid =
				formData.confirmPassword === formData.password && formData.password.trim() !== ''
			setSuccessStates((prev) => ({
				...prev,
				confirmPassword: isValid,
			}))
		}
	}, [formData.password, formData.confirmPassword])

	useEffect(() => {
		if (isPasswordValid && showPasswordRequirements && !isPasswordRequirementsClosing) {
			const timer = setTimeout(() => {
				setIsPasswordRequirementsClosing(true)
				setTimeout(() => {
					setShowPasswordRequirements(false)
					setIsPasswordRequirementsClosing(false)
				}, 300)
			}, 1000)

			return () => clearTimeout(timer)
		}
	}, [isPasswordValid, showPasswordRequirements, isPasswordRequirementsClosing])

	if (!isOpen) return null

	const describedBy = [formError ? formErrorId : null, emailError ? `${formId}-email-error` : null]
		.filter(Boolean)
		.join(' ') || undefined

	// Tap-outside does not dismiss; only the X or home control leaves auth (avoids accidental navigate to /).
	return (
		<div
			className="auth-modal-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-20 animate-fade-in sm:p-5 sm:pt-16 lg:pt-14"
			role="presentation"
		>
			<div
				className="auth-card animate-fade-in w-full max-w-[31rem] overflow-hidden rounded-[1.45rem] border border-brand-pink/18 bg-white/88 shadow-[0_28px_80px_-24px_rgba(120,40,40,0.34)] backdrop-blur-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="signup-modal-title"
				aria-describedby={describedBy}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="hidden">
					<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />
					<div className="landing-hero-orb pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
					<div className="relative">
						<p className="text-xs font-semibold uppercase tracking-widest text-white/80">taylor.io</p>
						<h2 className="mt-4 text-2xl font-bold leading-snug tracking-tight">
							Create your account
						</h2>
						<p className="mt-3 max-w-[260px] text-sm font-light leading-relaxed text-white/90">
							One workspace for your profile, templates, and exports — let&apos;s get you started.
						</p>
					</div>
					<AuthModalDocPreview />
				</div>

				<div className="auth-modal-content relative flex flex-col overflow-visible px-5 py-5 sm:px-8 sm:py-7">

					<div className="auth-modal-hero mb-4 mt-2 text-center">
						<p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-brand-pink">Your story starts here</p>
						<h2 id="signup-modal-title" className="mx-auto mt-2 max-w-[23rem] pb-3 font-serif text-[2rem] font-black leading-[0.98] tracking-tight text-gray-950 sm:text-[2.35rem]">
							Start your first tailored{' '}
							<span className="relative inline-block text-inherit">
								r&eacute;sum&eacute;
								{/* em-based size ties stroke to the heading so it grows with sm: text-[2.35rem] instead of locking to 9–10px. */}
								<img
									src="/underline.svg"
									alt=""
									width={1242}
									height={109}
									decoding="async"
									draggable={false}
									className="pointer-events-none absolute left-1/2 top-full z-0 mt-[-0.05em] h-[0.4em] w-auto min-h-[11px] -translate-x-1/2 object-contain object-center select-none sm:h-[0.44em] sm:min-h-[12px]"
									aria-hidden
								/>
							</span>
							.
						</h2>
						<p className="mx-auto mt-1.5 max-w-[22rem] text-sm leading-relaxed text-gray-600">
							Save your experience, choose the role, and generate a r&eacute;sum&eacute; that fits.
						</p>
					</div>

					<form onSubmit={handleSubmit} className="auth-form space-y-3.5" noValidate>
						<div className="flex gap-3">
							<div className="min-w-0 flex-1">
								<label htmlFor="signup-first-name" className="auth-compact-label label">
									First name <RequiredAsterisk />
								</label>
								<div className="relative">
									<input
										id="signup-first-name"
										type="text"
										name="first_name"
										value={formData.first_name}
										onChange={handleChange}
									className={`auth-compact-input input ${successStates.first_name ? 'input-success' : ''}`}
										placeholder="Jordan"
										autoComplete="given-name"
										required
									/>
									{successStates.first_name && (
										<div className="successCheckmark">
											<Checkmark className="h-3 w-3 text-white" />
										</div>
									)}
								</div>
							</div>
							<div className="min-w-0 flex-1">
								<label htmlFor="signup-last-name" className="auth-compact-label label">
									Last name <RequiredAsterisk />
								</label>
								<div className="relative">
									<input
										id="signup-last-name"
										type="text"
										name="last_name"
										value={formData.last_name}
										onChange={handleChange}
									className={`auth-compact-input input ${successStates.last_name ? 'input-success' : ''}`}
										placeholder="Lee"
										autoComplete="family-name"
										required
									/>
									{successStates.last_name && (
										<div className="successCheckmark">
											<Checkmark className="h-3 w-3 text-white" />
										</div>
									)}
								</div>
							</div>
						</div>

						<div>
							<label htmlFor="signup-email" className="auth-compact-label label">
								Email <RequiredAsterisk />
							</label>
							<div className="relative">
								<input
									id="signup-email"
									type="email"
									name="email"
									value={formData.email}
									onChange={handleChange}
									className={`auth-compact-input input pl-10 ${successStates.email ? 'input-success' : ''}`}
									placeholder="you@example.com"
									autoComplete="email"
									required
									aria-invalid={emailError ? 'true' : undefined}
									aria-describedby={emailError ? `${formId}-email-error` : undefined}
								/>
								{successStates.email && (
									<div className="successCheckmark">
										<Checkmark className="h-3 w-3 text-white" />
									</div>
								)}
								<FontAwesomeIcon icon={faEnvelope} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
							</div>
						</div>

						{emailError && (
							<div id={`${formId}-email-error`} className="errorMessage" role="alert">
								{emailError}
							</div>
						)}

						<div>
							<label htmlFor="signup-password" className="auth-compact-label label">
								Password <RequiredAsterisk />
							</label>
							<div className="relative">
								<input
									id="signup-password"
									type={showPassword ? 'text' : 'password'}
									name="password"
									value={formData.password}
									onChange={handleChange}
									onFocus={() => setShowPasswordRequirements(true)}
									className={`auth-compact-input input pl-10 pr-11 ${successStates.password ? 'input-success' : ''}`}
									placeholder="Create a strong password"
									autoComplete="new-password"
									required
								/>
								{successStates.password && (
									<div className="successCheckmark" style={{ right: '2.75rem' }}>
										<Checkmark className="h-3 w-3 text-white" />
									</div>
								)}
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

							{showPasswordRequirements && (
								<div
									className={`passwordRequirements mt-2 space-y-1.5 rounded-xl border border-gray-200 bg-gray-50/90 p-3 text-sm ${
										isPasswordRequirementsClosing ? 'slide-out' : ''
									}`}
									style={
										isPasswordRequirementsClosing
											? { animation: 'slide-out 0.3s ease-in-out forwards' }
											: undefined
									}
								>
									<div
										className={`flex items-center gap-2 ${passwordChecks.minLength ? 'text-brand-pink' : 'text-gray-600'}`}
									>
										<span>{passwordChecks.minLength ? '✓' : '○'}</span>
										<span>At least 8 characters</span>
									</div>
									<div
										className={`flex items-center gap-2 ${passwordChecks.hasSpecialChar ? 'text-brand-pink' : 'text-gray-600'}`}
									>
										<span>{passwordChecks.hasSpecialChar ? '✓' : '○'}</span>
										<span>One special character (!@#$%…)</span>
									</div>
									<div
										className={`flex items-center gap-2 ${passwordChecks.hasTwoNumbers ? 'text-brand-pink' : 'text-gray-600'}`}
									>
										<span>{passwordChecks.hasTwoNumbers ? '✓' : '○'}</span>
										<span>At least 2 numbers</span>
									</div>
									<div
										className={`flex items-center gap-2 ${passwordChecks.hasCapital ? 'text-brand-pink' : 'text-gray-600'}`}
									>
										<span>{passwordChecks.hasCapital ? '✓' : '○'}</span>
										<span>One capital letter</span>
									</div>
								</div>
							)}
						</div>

						<div>
							<label htmlFor="signup-confirm-password" className="auth-compact-label label">
								Confirm password <RequiredAsterisk />
							</label>
							<div className="relative">
								<input
									id="signup-confirm-password"
									type={showConfirmPassword ? 'text' : 'password'}
									name="confirmPassword"
									value={formData.confirmPassword}
									onChange={handleChange}
									onFocus={() => setShowConfirmPasswordMatch(true)}
									className={`auth-compact-input input pl-10 pr-11 ${successStates.confirmPassword ? 'input-success' : ''}`}
									placeholder="Repeat password"
									autoComplete="new-password"
									required
								/>
								{successStates.confirmPassword && (
									<div className="successCheckmark" style={{ right: '2.75rem' }}>
										<Checkmark className="h-3 w-3 text-white" />
									</div>
								)}
								<FontAwesomeIcon icon={faShieldHalved} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
								<button
									type="button"
									onClick={() => setShowConfirmPassword((p) => !p)}
									aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
									className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
								>
									<FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} className="h-4 w-4" />
								</button>
							</div>

							{showConfirmPasswordMatch && formData.confirmPassword.trim() !== '' && (
								<div className="passwordRequirements mt-2 rounded-xl border border-gray-200 bg-gray-50/90 p-3 text-sm">
									<div
										className={`flex items-center gap-2 ${formData.confirmPassword === formData.password ? 'text-brand-pink' : 'text-gray-600'}`}
									>
										{formData.confirmPassword === formData.password ? (
											<Checkmark className="h-4 w-4" />
										) : (
											<XIcon className="h-4 w-4" />
										)}
										<span>Passwords match</span>
									</div>
								</div>
							)}
						</div>

						{formError && (
							<div id={formErrorId} className="errorMessage" role="alert">
								{formError}
							</div>
						)}

						<button
							type="submit"
							disabled={isLoading || !isFormValid}
							className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-pink py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(214,86,86,0.28)] transition hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
						>
							<FontAwesomeIcon icon={faWandSparkles} className="size-4" />
							{isLoading ? 'Creating account…' : 'Create account'}
						</button>
					</form>

					<div className="auth-google-secondary mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-gray-500">
						<span className="h-px w-12 bg-gray-200" />
						<button
							type="button"
							disabled
							className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-75"
							title="Google sign-up coming soon"
						>
							<span className="text-sm font-black text-[#4285f4]">G</span>
							Google
						</button>
						<span className="h-px w-12 bg-gray-200" />
					</div>

					<div className="auth-trust-line mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[0.72rem] font-medium text-gray-500">
						<span className="inline-flex items-center gap-1.5">
							<FontAwesomeIcon icon={faGift} className="size-3 text-brand-pink" />
							Free to try
						</span>
						<span className="inline-flex items-center gap-1.5">
							<FontAwesomeIcon icon={faCreditCard} className="size-3 text-violet-500" />
							No credit card required
						</span>
						<span className="inline-flex items-center gap-1.5">
							<FontAwesomeIcon icon={faLock} className="size-3 text-cyan-600" />
							Drafts stay private
						</span>
					</div>

					<div className="auth-switch-row -mx-5 mt-4 border-t border-gray-100 px-5 pt-3.5 text-center sm:-mx-7 sm:px-7">
						<p className="text-sm text-gray-600">
							Already have an account?{' '}
							<button
								type="button"
								onClick={onSwitchToLogin}
								className="font-bold text-brand-pink decoration-brand-pink/45 underline-offset-2 transition hover:underline hover:opacity-90 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								Sign in
							</button>
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}

export default SignUpModal
