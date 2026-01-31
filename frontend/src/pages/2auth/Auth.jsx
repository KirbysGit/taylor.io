// pages/Auth.jsx

// authentication page containing login and signup modals.

// add background features that show on the side.
// still need to brainstorm, maybe like user reviews, demo videos, etc.

// google sign in
// sign in with linkedin

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
		// switch to login modal after successful signup.
		setShowSignUp(false)
		setShowLogin(true)
		navigate('/auth?mode=login')
    }

	// handles if login is successful.
    const handleLoginSuccess = (user) => {
		// navigate to home - ProtectedRoute will handle setup completion check and redirect if needed.
		navigate('/home')
    }

    return (
		<div 
			className="min-h-screen flex items-center justify-center bg-cream relative"
			style={{
				backgroundImage: 'url(/auth-background.jpg)', // add your image to public folder
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				backgroundRepeat: 'no-repeat',
			}}
		>
			{/* cream overlay for better contrast */}
			<div className="absolute inset-0 bg-cream/80"></div>
			
			{/* modals container */}
			<div className="relative z-10">
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
		</div>
    )
}

// export.
export default Auth

