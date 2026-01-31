// components/ProtectedRoute.jsx

// protected route component that checks authentication and setup completion before allowing access.

// imports.
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

// ----------- helper function -----------

// function to check if user has completed setup.
function checkSetupCompleted() {
	try {
		const userData = localStorage.getItem('user')
		if (!userData) return false
		
		const user = JSON.parse(userData)
		const userId = user?.id
		
		if (!userId) return false
		
		return localStorage.getItem(`setupCompleted_${userId}`) === 'true'
	} catch (error) {
		return false
	}
}

// ----------- main component -----------

function ProtectedRoute({ children, requireSetup = false }) {
	const [isAuthenticated, setIsAuthenticated] = useState(null) // null = checking, true = authenticated, false = not authenticated
	const [setupCompleted, setSetupCompleted] = useState(null) // null = checking, true = completed, false = not completed
	const location = useLocation()

	// check authentication and setup completion on mount.
	useEffect(() => {
		// check if token exists in localStorage.
		const token = localStorage.getItem('token')
		const user = localStorage.getItem('user')

		// if both token and user exist, user is authenticated.
		if (token && user) {
			setIsAuthenticated(true)
			
			// if this route requires setup completion, check it.
			if (requireSetup) {
				setSetupCompleted(checkSetupCompleted())
			} else {
				setSetupCompleted(true) // don't care about setup for routes that don't require it
			}
		} else {
			setIsAuthenticated(false)
			setSetupCompleted(false)
		}
	}, [requireSetup, location.pathname])

	// while checking, show loading spinner.
	if (isAuthenticated === null || (requireSetup && setupCompleted === null)) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-cream">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink mx-auto mb-4"></div>
					<p className="text-gray-600">Loading...</p>
				</div>
			</div>
		)
	}

	// if not authenticated, redirect to auth page.
	if (!isAuthenticated) {
		return <Navigate to="/auth" replace />
	}

	// if authenticated but setup is required and not completed, redirect to setup.
	if (requireSetup && !setupCompleted) {
		return <Navigate to="/setup" replace />
	}

	// if authenticated (and setup completed if required), render the protected component.
	return children
}

// export.
export default ProtectedRoute

