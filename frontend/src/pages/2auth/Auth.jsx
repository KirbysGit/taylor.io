// pages/Auth.jsx

// authentication page containing login and signup modals.

// imports.
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// components.
import LoginModal from './components/LoginModal'
import SignUpModal from './components/SignUpModal'


// ----------- main component -----------
function Auth() {

	// navigate hook.
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const mode = searchParams.get('mode') || 'login'
    
	// states.
    const [showLogin, setShowLogin] = useState(mode === 'login')			// state for showing login modal.
    const [showSignUp, setShowSignUp] = useState(mode === 'signup')			// state for showing sign up modal.

	// effect to change modal based on set mode.
    useEffect(() => {
		if (mode === 'signup') {
				setShowLogin(false)
				setShowSignUp(true)
		} else {
				setShowLogin(true)
				setShowSignUp(false)
		}
    }, [mode])

	// ------------------ functions ------------------

	// function to close modal and navigate to home.
    const handleClose = () => {
      navigate('/')
    }

	// function to switch to sign up modal.
    const switchToSignUp = () => {
      setShowLogin(false)
      setShowSignUp(true)
    }

	// function to switch to login modal.
    const switchToLogin = () => {
      setShowSignUp(false)
      setShowLogin(true)
    }

    const handleSignUpSuccess = (user) => {
		console.log('Sign up successful:', user)
		// redirect to account setup page after successful signup.
		navigate('/setup')
    }

    const handleLoginSuccess = (user) => {
		console.log('Login successful:', user)
		// redirect to homepage after successful login.
		navigate('/home')
    }

    return (
		<div className="min-h-screen flex items-center justify-center bg-cream">
			<div className="text-center">
				<h1 className="text-4xl font-bold text-brand-pink mb-4">taylor.io</h1>
				<p className="text-gray-600 mb-8">Welcome to your portfolio</p>
			</div>

			<LoginModal
				isOpen={showLogin}
				onClose={handleClose}
				onSwitchToSignUp={switchToSignUp}
				onLoginSuccess={handleLoginSuccess}
			/>

			<SignUpModal
				isOpen={showSignUp}
				onClose={handleClose}
				onSwitchToLogin={switchToLogin}
				onSignUpSuccess={handleSignUpSuccess}
			/>
		</div>
    )
}

// export.
export default Auth

