// pages/Auth.jsx

// authentication page containing login and signup modals.

// add background features that show on the side.
// still need to brainstorm, maybe like user reviews, demo videos, etc.

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

	// close modal and navigate to home.
    const handleClose = () => {
      	navigate('/')
    }

	// switches to sign up modal.
    const switchToSignUp = () => {
		setShowLogin(false)
		setShowSignUp(true)
    }

	// switches to login modal.
    const switchToLogin = () => {
		setShowSignUp(false)
		setShowLogin(true)
    }

	// handles if sign up is successful.
    const handleSignUpSuccess = (user) => {
		console.log(user)
		navigate('/setup')
    }

	// handles if login is successful.
    const handleLoginSuccess = (user) => {
		console.log(user)
		navigate('/home')
    }

    return (
		<div className="min-h-screen flex items-center justify-center bg-cream">
			{/* login modal */}
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
    )
}

// export.
export default Auth

