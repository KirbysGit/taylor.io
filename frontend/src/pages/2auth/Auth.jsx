import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import LoginModal from './components/LoginModal'
import SignUpModal from './components/SignUpModal'
import { forgotPassword, resendVerification, resetPassword } from '@/api/services/auth'
import { API_BASE_URL } from '@/api/api'

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
				aria-label="Go to taylor.io home"
			>
				<img src="/lg_tr_logo.png" alt="taylor.io" className="h-11 w-auto object-contain" />
			</button>
			<div className="relative z-10">{children}</div>
		</div>
	)
}

function CenterCard({ title, eyebrow, children }) {
	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-24 sm:p-5 sm:pt-20">
			<section className="w-full max-w-[31rem] rounded-[1.45rem] border border-brand-pink/18 bg-white/90 px-6 py-7 text-center shadow-[0_28px_80px_-24px_rgba(120,40,40,0.34)] backdrop-blur-xl sm:px-8">
				<p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-brand-pink">{eyebrow}</p>
				<h1 className="mx-auto mt-2 max-w-[23rem] font-serif text-[2rem] font-black leading-[0.98] tracking-tight text-gray-950 sm:text-[2.35rem]">
					{title}
				</h1>
				<div className="mt-5">{children}</div>
			</section>
		</div>
	)
}

function CheckEmailPanel({ email, onBackToLogin }) {
	const [status, setStatus] = useState('')
	const [loading, setLoading] = useState(false)
	return (
		<CenterCard eyebrow="Almost there" title="Check your email.">
			<p className="text-sm leading-relaxed text-gray-600">
				We sent a verification link{email ? ` to ${email}` : ''}. Verify your email before signing in.
			</p>
			<div className="mt-5 flex flex-col gap-3">
				<button
					type="button"
					disabled={!email || loading}
					onClick={async () => {
						setLoading(true)
						setStatus('')
						try {
							await resendVerification(email)
							setStatus('Verification email sent. Check your inbox.')
						} finally {
							setLoading(false)
						}
					}}
					className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-black text-white transition hover:bg-brand-pink-dark disabled:cursor-not-allowed disabled:opacity-50"
				>
					{loading ? 'Sending...' : 'Resend verification email'}
				</button>
				<button type="button" onClick={onBackToLogin} className="text-sm font-bold text-brand-pink-dark hover:underline">
					Back to sign in
				</button>
			</div>
			{status ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{status}</p> : null}
		</CenterCard>
	)
}

function ForgotPasswordPanel({ onBackToLogin }) {
	const [email, setEmail] = useState('')
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(false)
	return (
		<CenterCard eyebrow="Password reset" title="Get a reset link.">
			<form
				className="space-y-4 text-left"
				onSubmit={async (e) => {
					e.preventDefault()
					setLoading(true)
					setMessage('')
					try {
						await forgotPassword(email)
						setMessage('If an account exists, we sent a reset link.')
					} finally {
						setLoading(false)
					}
				}}
			>
				<label className="label" htmlFor="forgot-email">Email</label>
				<input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
				<button type="submit" disabled={loading} className="w-full rounded-xl bg-brand-pink px-5 py-3 text-sm font-black text-white transition hover:bg-brand-pink-dark disabled:opacity-50">
					{loading ? 'Sending...' : 'Send reset link'}
				</button>
			</form>
			{message ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{message}</p> : null}
			<button type="button" onClick={onBackToLogin} className="mt-4 text-sm font-bold text-brand-pink-dark hover:underline">
				Back to sign in
			</button>
		</CenterCard>
	)
}

function ResetPasswordPanel({ token }) {
	const navigate = useNavigate()
	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	return (
		<CenterCard eyebrow="Create new password" title="Reset password.">
			<form
				className="space-y-4 text-left"
				onSubmit={async (e) => {
					e.preventDefault()
					setError('')
					if (!token) return setError('This reset link is missing a token.')
					if (password.length < 8) return setError('Password must be at least 8 characters.')
					if (password !== confirm) return setError('Passwords do not match.')
					setLoading(true)
					try {
						await resetPassword(token, password)
						navigate('/auth?mode=login&reset=1', { replace: true })
					} catch (err) {
						setError(err?.response?.data?.detail || 'This reset link expired or is invalid.')
					} finally {
						setLoading(false)
					}
				}}
			>
				<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="New password" autoComplete="new-password" />
				<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" placeholder="Confirm password" autoComplete="new-password" />
				{error ? <div className="errorMessage" role="alert">{error}</div> : null}
				<button type="submit" disabled={loading} className="w-full rounded-xl bg-brand-pink px-5 py-3 text-sm font-black text-white transition hover:bg-brand-pink-dark disabled:opacity-50">
					{loading ? 'Updating...' : 'Update password'}
				</button>
			</form>
		</CenterCard>
	)
}

function VerifyEmailRedirect({ token }) {
	useEffect(() => {
		if (token) window.location.replace(`${API_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
	}, [token])
	return (
		<CenterCard eyebrow="Verifying" title="Checking your link.">
			<p className="text-sm text-gray-600">{token ? 'One moment while we verify your email.' : 'This verification link is missing a token.'}</p>
		</CenterCard>
	)
}

function Auth() {
	const navigate = useNavigate()
	const location = useLocation()
	const [searchParams] = useSearchParams()
	const mode = searchParams.get('mode') || 'signup'
	const email = searchParams.get('email') || ''
	const token = searchParams.get('token') || ''
	const pathname = location.pathname

	const statusMessage = useMemo(() => {
		if (searchParams.get('verified') === '1') return 'Email verified. You can sign in now.'
		if (searchParams.get('verified') === '0') return 'This verification link expired or is invalid.'
		if (searchParams.get('reset') === '1') return 'Password updated. You can sign in now.'
		if (searchParams.get('unverified') === '1') return 'Please verify your email before continuing.'
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
	const handleLoginSuccess = () => navigate('/home')

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
