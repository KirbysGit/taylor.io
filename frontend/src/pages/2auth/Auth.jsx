import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import LoginModal from './components/LoginModal'
import SignUpModal from './components/SignUpModal'

function Auth() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const mode = searchParams.get('mode') || 'signup'
    
    const [showLogin, setShowLogin] = useState(mode === 'login')
    const [showSignUp, setShowSignUp] = useState(mode === 'signup')

    useEffect(() => {
		if (mode === 'signup') {
			setShowLogin(false)
			setShowSignUp(true)
		} else {
			setShowLogin(true)
			setShowSignUp(false)
		}
    }, [mode])

    const handleClose = () => {
      	navigate('/')
    }

    const switchToSignUp = () => {
		setShowLogin(false)
		setShowSignUp(true)
    }

    const switchToLogin = () => {
		setShowSignUp(false)
		setShowLogin(true)
    }

    const handleSignUpSuccess = (user) => {
		setShowSignUp(false)
		setShowLogin(true)
		navigate('/auth?mode=login')
    }

    const handleLoginSuccess = (user) => {
		navigate('/home')
    }

    return (
		<div className="auth-page-shell relative min-h-screen overflow-hidden bg-[#fff8ef]">
			<div className="auth-resume-pattern absolute inset-0 opacity-[0.48]" aria-hidden />
			<div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-brand-pink/20 blur-3xl" aria-hidden />
			<div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-brand-pink/24 blur-3xl" aria-hidden />
			<div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.88),transparent_58%)]" aria-hidden />
			
			<button
				type="button"
				onClick={() => navigate('/')}
				className="absolute left-5 top-5 z-[60] inline-flex items-center rounded-full border border-brand-pink/25 bg-gradient-to-br from-brand-pink-lighter via-white/95 to-brand-pink-lighter/55 px-5 py-3 shadow-[0_14px_38px_rgba(214,86,86,0.22)] ring-1 ring-white/70 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-brand-pink/35 hover:shadow-[0_18px_44px_rgba(214,86,86,0.28)] sm:left-8 sm:top-8"
				aria-label="Go to taylor.io home"
			>
				<img src="/lg_tr_logo.png" alt="taylor.io" className="h-9 w-auto object-contain" />
			</button>
			
			<div className="relative z-10">
				<LoginModal
					isOpen={showLogin}
					onClose={handleClose}
					onSwitchToSignUp={switchToSignUp}
					onLoginSuccess={handleLoginSuccess}
				/>

				{/* sign up modal */}
				<SignUpModal
					isOpen={showSignUp}
					onClose={handleClose}
					onSwitchToLogin={switchToLogin}
					onSignUpSuccess={handleSignUpSuccess}
				/>
			</div>
		</div>
    )
}

export default Auth

