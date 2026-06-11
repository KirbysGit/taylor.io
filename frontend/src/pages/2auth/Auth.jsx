import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowLeft,
	faArrowRight,
	faEnvelope,
	faEye,
	faEyeSlash,
	faLock,
	faRotateRight,
} from '@fortawesome/free-solid-svg-icons'

import LoginModal from './components/LoginModal'
import SignUpModal from './components/SignUpModal'
import { forgotPassword, resendVerification, resetPassword } from '@/api/services/auth'
import { API_BASE_URL } from '@/api/api'
import { ErrorIcon } from '@/components/icons'

// ─── shared shell ────────────────────────────────────────────────────────────

function AuthShell({ children }) {
	const navigate = useNavigate()
	return (
		<div className="auth-page-shell relative min-h-screen overflow-hidden bg-[#fff8ef]">
			<div className="auth-background-photo absolute inset-0" aria-hidden />
			<div className="auth-corner-blotch auth-corner-blotch--top-right" aria-hidden />
			<div className="auth-corner-blotch auth-corner-blotch--bottom-left" aria-hidden />
			<button
				type="button"
				onClick={() => navigate('/')}
				className="auth-home-pill absolute left-5 top-5 z-[60] inline-flex items-center rounded-full border px-5 py-3 transition hover:-translate-y-0.5 sm:left-8 sm:top-8"
				aria-label="Go to taylor home"
			>
				<img src="/lg_tr_logo.png" alt="taylor" className="h-11 w-auto object-contain" />
			</button>
			<div className="relative z-10">{children}</div>
		</div>
	)
}

// ─── shared card wrapper ──────────────────────────────────────────────────────

function AuthCard({ children }) {
	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-24 sm:p-5 sm:pt-20">
			<div className="w-full max-w-[30rem] rounded-[1.45rem] border border-brand-pink/18 bg-white/90 px-6 py-8 shadow-[0_28px_80px_-24px_rgba(120,40,40,0.34)] backdrop-blur-xl sm:px-8">
				{children}
			</div>
		</div>
	)
}

// ─── icon badge ──────────────────────────────────────────────────────────────

function IconBadge({ icon, className = '' }) {
	return (
		<div className={`mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl ${className}`}>
			<FontAwesomeIcon icon={icon} className="size-6" />
		</div>
	)
}

// ─── check email ─────────────────────────────────────────────────────────────

function CheckEmailPanel({ email, onBackToLogin }) {
	const [status, setStatus] = useState('')
	const [loading, setLoading] = useState(false)

	const handleResend = async () => {
		setLoading(true)
		setStatus('')
		try {
			await resendVerification(email)
			setStatus('Sent! Check your inbox — it may take a minute.')
		} catch {
			setStatus('Something went wrong. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<AuthCard>
			<IconBadge icon={faEnvelope} className="bg-brand-pink/[0.10] text-brand-pink" />

			<div className="text-center">
				<p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-brand-pink">Almost there</p>
				<h1 className="mx-auto mt-2 font-serif text-[2rem] font-black leading-[1.05] tracking-tight text-gray-950 sm:text-[2.2rem]">
					Check your email.
				</h1>
				<p className="mx-auto mt-3 max-w-[22rem] text-sm leading-relaxed text-gray-600">
					We sent a verification link{email ? <> to <span className="font-semibold text-gray-800">{email}</span></> : ''}.
					{' '}Click it to activate your account and start building.
				</p>
			</div>

			<div className="mt-6 space-y-3">
				{status ? (
					<div className={`rounded-xl px-4 py-3 text-sm font-medium ${
						status.startsWith('Sent')
							? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
							: 'border border-red-200 bg-red-50 text-red-800'
					}`} role="status">
						{status}
					</div>
				) : null}

				<button
					type="button"
					disabled={!email || loading}
					onClick={handleResend}
					className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-pink/30 bg-brand-pink/[0.07] px-5 py-3 text-sm font-bold text-brand-pink-dark transition hover:bg-brand-pink/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
				>
					<FontAwesomeIcon icon={faRotateRight} className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
					{loading ? 'Sending…' : 'Resend verification email'}
				</button>

				<button
					type="button"
					onClick={onBackToLogin}
					className="flex w-full items-center justify-center gap-2 text-sm font-bold text-gray-500 transition hover:text-brand-pink-dark"
				>
					<FontAwesomeIcon icon={faArrowLeft} className="size-3" />
					Back to sign in
				</button>
			</div>

			<p className="mt-6 text-center text-xs text-gray-400">
				Didn't get it? Check your spam folder or try a different email address.
			</p>
		</AuthCard>
	)
}

// ─── forgot password ──────────────────────────────────────────────────────────

function ForgotPasswordPanel({ onBackToLogin }) {
	const [email, setEmail] = useState('')
	const [sent, setSent] = useState(false)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		setLoading(true)
		try {
			await forgotPassword(email)
			setSent(true)
		} catch {
			setError('Something went wrong. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<AuthCard>
			<IconBadge icon={faLock} className="bg-brand-pink/[0.10] text-brand-pink" />

			<div className="text-center">
				<p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-brand-pink">Password reset</p>
				<h1 className="mx-auto mt-2 font-serif text-[2rem] font-black leading-[1.05] tracking-tight text-gray-950 sm:text-[2.2rem]">
					{sent ? 'Link sent.' : 'Forgot your password?'}
				</h1>
				<p className="mx-auto mt-3 max-w-[22rem] text-sm leading-relaxed text-gray-600">
					{sent
						? <>We sent a reset link to <span className="font-semibold text-gray-800">{email}</span>. Check your inbox.</>
						: "Enter your email and we'll send you a link to reset it."}
				</p>
			</div>

			{!sent ? (
				<form onSubmit={handleSubmit} className="mt-6 space-y-3" noValidate>
					<div>
						<label htmlFor="forgot-email" className="label">Email</label>
						<div className="relative">
							<input
								id="forgot-email"
								type="email"
								required
								value={email}
								onChange={(e) => { setEmail(e.target.value); setError('') }}
								className="input pl-10"
								placeholder="you@example.com"
								autoComplete="email"
							/>
							<FontAwesomeIcon icon={faEnvelope} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
						</div>
					</div>

					{error ? (
						<div className="errorMessage" role="alert">
						<ErrorIcon className="errorMessage-icon" />
						<span>{error}</span>
					</div>
					) : null}

					<button
						type="submit"
						disabled={loading || !email.trim()}
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-pink py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(214,86,86,0.28)] transition hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
					>
						{loading ? 'Sending…' : 'Send reset link'}
						{!loading ? <FontAwesomeIcon icon={faArrowRight} className="size-3.5" /> : null}
					</button>
				</form>
			) : (
				<div className="mt-6 space-y-3">
					<button
						type="button"
						disabled={loading}
						onClick={async () => {
							setLoading(true)
							try { await forgotPassword(email) } finally { setLoading(false) }
						}}
						className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-pink/30 bg-brand-pink/[0.07] px-5 py-3 text-sm font-bold text-brand-pink-dark transition hover:bg-brand-pink/[0.12] disabled:opacity-50"
					>
						<FontAwesomeIcon icon={faRotateRight} className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
						{loading ? 'Resending…' : 'Resend link'}
					</button>
				</div>
			)}

			<button
				type="button"
				onClick={onBackToLogin}
				className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-bold text-gray-500 transition hover:text-brand-pink-dark"
			>
				<FontAwesomeIcon icon={faArrowLeft} className="size-3" />
				Back to sign in
			</button>
		</AuthCard>
	)
}

// ─── reset password ───────────────────────────────────────────────────────────

function ResetPasswordPanel({ token }) {
	const navigate = useNavigate()
	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		if (!token) return setError('This reset link is missing a token.')
		// mirror the signup password rules (also enforced server-side).
		if (password.length < 8) return setError('Password must be at least 8 characters.')
		if (!/[A-Z]/.test(password)) return setError('Password must include at least one uppercase letter.')
		if ((password.match(/\d/g) || []).length < 2) return setError('Password must include at least two numbers.')
		if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return setError('Password must include at least one special character (!@#$%…).')
		if (password !== confirm) return setError('Passwords do not match.')
		setLoading(true)
		try {
			await resetPassword(token, password)
			navigate('/auth?mode=login&reset=1', { replace: true })
		} catch (err) {
			const detail = err?.response?.data?.detail
			// pydantic 422s send detail as an array — pull out the human message.
			const message = typeof detail === 'string'
				? detail
				: detail?.[0]?.msg?.replace(/^Value error, /, '')
			setError(message || 'This reset link has expired or is invalid.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<AuthCard>
			<IconBadge icon={faLock} className="bg-brand-pink/[0.10] text-brand-pink" />

			<div className="text-center">
				<p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-brand-pink">Create new password</p>
				<h1 className="mx-auto mt-2 font-serif text-[2rem] font-black leading-[1.05] tracking-tight text-gray-950 sm:text-[2.2rem]">
					Reset password.
				</h1>
				<p className="mx-auto mt-3 max-w-[22rem] text-sm leading-relaxed text-gray-600">
					Choose a strong password — you'll use it to sign in going forward.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="mt-6 space-y-3" noValidate>
				<div>
					<label htmlFor="reset-password" className="label">New password</label>
					<div className="relative">
						<input
							id="reset-password"
							type={showPassword ? 'text' : 'password'}
							value={password}
							onChange={(e) => { setPassword(e.target.value); setError('') }}
							className="input pl-10 pr-11"
							placeholder="At least 8 characters"
							autoComplete="new-password"
							required
						/>
						<FontAwesomeIcon icon={faLock} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
						<button
							type="button"
							onClick={() => setShowPassword((p) => !p)}
							aria-label={showPassword ? 'Hide password' : 'Show password'}
							className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
						>
							<FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="size-4" />
						</button>
					</div>
				</div>

				<div>
					<label htmlFor="reset-confirm" className="label">Confirm password</label>
					<div className="relative">
						<input
							id="reset-confirm"
							type={showConfirm ? 'text' : 'password'}
							value={confirm}
							onChange={(e) => { setConfirm(e.target.value); setError('') }}
							className="input pl-10 pr-11"
							placeholder="Repeat your password"
							autoComplete="new-password"
							required
						/>
						<FontAwesomeIcon icon={faLock} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
						<button
							type="button"
							onClick={() => setShowConfirm((p) => !p)}
							aria-label={showConfirm ? 'Hide password' : 'Show password'}
							className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
						>
							<FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} className="size-4" />
						</button>
					</div>
					{confirm && password && confirm !== password ? (
						<p className="mt-1.5 text-xs font-medium text-red-600">Passwords don't match yet.</p>
					) : confirm && password && confirm === password ? (
						<p className="mt-1.5 text-xs font-medium text-emerald-600">Passwords match ✓</p>
					) : null}
				</div>

				{error ? (
					<div className="errorMessage" role="alert">
						<ErrorIcon className="errorMessage-icon" />
						<span>{error}</span>
					</div>
				) : null}

				<button
					type="submit"
					disabled={loading || !password || !confirm}
					className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-pink py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(214,86,86,0.28)] transition hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
				>
					{loading ? 'Updating…' : 'Update password'}
					{!loading ? <FontAwesomeIcon icon={faArrowRight} className="size-3.5" /> : null}
				</button>
			</form>
		</AuthCard>
	)
}

// ─── verify email redirect ────────────────────────────────────────────────────

function VerifyEmailRedirect({ token }) {
	useEffect(() => {
		if (token) window.location.replace(`${API_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
	}, [token])

	return (
		<AuthCard>
			<div className="py-4 text-center">
				{token ? (
					<>
						{/* Spinner */}
						<div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand-pink/[0.10]">
							<svg
								className="size-7 animate-spin text-brand-pink"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
							</svg>
						</div>
						<p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-brand-pink">Verifying</p>
						<h1 className="mx-auto mt-2 font-serif text-[2rem] font-black leading-[1.05] tracking-tight text-gray-950">
							Checking your link.
						</h1>
						<p className="mx-auto mt-3 max-w-[22rem] text-sm leading-relaxed text-gray-600">
							One moment while we verify your email address.
						</p>
					</>
				) : (
					<>
						<IconBadge icon={faEnvelope} className="bg-red-50 text-red-400" />
						<p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-red-400">Invalid link</p>
						<h1 className="mx-auto mt-2 font-serif text-[2rem] font-black leading-[1.05] tracking-tight text-gray-950">
							Link is missing.
						</h1>
						<p className="mx-auto mt-3 max-w-[22rem] text-sm leading-relaxed text-gray-600">
							This verification link is incomplete. Try clicking the link in your email again.
						</p>
					</>
				)}
			</div>
		</AuthCard>
	)
}

// ─── root auth component ──────────────────────────────────────────────────────

function Auth() {
	const navigate = useNavigate()
	const location = useLocation()
	const [searchParams] = useSearchParams()
	const mode = searchParams.get('mode') || 'signup'
	const email = searchParams.get('email') || ''
	const token = searchParams.get('token') || ''
	const pathname = location.pathname

	const statusMessage = useMemo(() => {
		if (searchParams.get('verified') === '1') return "Email verified! Sign in to get started."
		if (searchParams.get('verified') === '0') return 'That verification link expired or is invalid — request a new one.'
		if (searchParams.get('reset') === '1') return "Password updated! Sign in with your new one."
		if (searchParams.get('unverified') === '1') return "Quick step first — verify your email, then you're in."
		return ''
	}, [searchParams])

	const handleClose = () => navigate('/')
	const switchToSignUp = () => navigate('/auth?mode=signup', { replace: true })
	const switchToLogin = () => navigate('/auth?mode=login', { replace: true })
	const switchToForgot = () => navigate('/auth?mode=forgot', { replace: true })
	const handleSignUpSuccess = (payload) => {
		const nextEmail = payload?.email || email
		navigate(`/auth?mode=check-email${nextEmail ? `&email=${encodeURIComponent(nextEmail)}` : ''}`, { replace: true })
	}
	// route on the server's setup flag: onboarded users land home, new users go straight to setup.
	const handleLoginSuccess = (user) => navigate(user?.setup_completed ? '/home' : '/setup')

	if (pathname === '/auth/reset-password') {
		return <AuthShell><ResetPasswordPanel token={token} /></AuthShell>
	}
	if (pathname === '/auth/verify-email') {
		return <AuthShell><VerifyEmailRedirect token={token} /></AuthShell>
	}

	return (
		<AuthShell>
			{mode === 'check-email' ? (
				<CheckEmailPanel email={email} onBackToLogin={switchToLogin} />
			) : mode === 'forgot' ? (
				<ForgotPasswordPanel onBackToLogin={switchToLogin} />
			) : (
				<>
					<LoginModal
						isOpen={mode === 'login'}
						onClose={handleClose}
						onSwitchToSignUp={switchToSignUp}
						onLoginSuccess={handleLoginSuccess}
						onForgotPassword={switchToForgot}
						statusMessage={statusMessage}
					/>
					<SignUpModal
						isOpen={mode !== 'login'}
						onClose={handleClose}
						onSwitchToLogin={switchToLogin}
						onSignUpSuccess={handleSignUpSuccess}
					/>
				</>
			)}
		</AuthShell>
	)
}

export default Auth
