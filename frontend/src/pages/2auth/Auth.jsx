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
		navigate('/auth?mode=signup', { replace: true })
    }

    const switchToLogin = () => {
		setShowSignUp(false)
		setShowLogin(true)
		navigate('/auth?mode=login', { replace: true })
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
