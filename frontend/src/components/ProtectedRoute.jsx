// components/ProtectedRoute.jsx

// protected route component that checks authentication before allowing access.

// imports.
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

// ----------- main component -----------

function ProtectedRoute({ children }) {
	const [isAuthenticated, setIsAuthenticated] = useState(null) // null = checking, true = authenticated, false = not authenticated

	// check authentication on mount.
	useEffect(() => {
		// check if token exists in localStorage.
		const token = localStorage.getItem('token')
		const user = localStorage.getItem('user')

		// if both token and user exist, user is authenticated.
		if (token && user) {
			setIsAuthenticated(true)
		} else {
			setIsAuthenticated(false)
		}
	}, [])

	// while checking, show nothing (or a loading spinner).
	if (isAuthenticated === null) {
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

	// if authenticated, render the protected component.
	return children
}

// export.
export default ProtectedRoute

