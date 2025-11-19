// pages/Auth.jsx

// authentication page containing login and signup modals.

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import LoginModal from './components/LoginModal'
import SignUpModal from './components/SignUpModal'

function Auth() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') || 'login'
  
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
      />

      <SignUpModal
        isOpen={showSignUp}
        onClose={handleClose}
        onSwitchToLogin={switchToLogin}
      />
    </div>
  )
}

export default Auth

