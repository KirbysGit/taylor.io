// components/ProtectedRoute.jsx

import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getCurrentUser } from '@/api/services/auth'

function LoadingGate() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-cream">
			<div className="text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink mx-auto mb-4"></div>
				<p className="text-gray-600">Loading...</p>
			</div>
		</div>
	)
}

function ProtectedRoute({ children, requireSetup = false }) {
	const [state, setState] = useState({ status: 'checking', user: null })
	const location = useLocation()

	useEffect(() => {
		let cancelled = false
		;(async () => {
			try {
				const response = await getCurrentUser()
				const user = response.data || response
				if (cancelled) return
				localStorage.setItem('user', JSON.stringify(user))
				setState({ status: 'authenticated', user })
			} catch (error) {
				if (cancelled) return
				setState({
					status: error?.response?.status === 403 ? 'unverified' : 'unauthenticated',
					user: null,
				})
			}
		})()
		return () => {
			cancelled = true
		}
	}, [location.pathname])

	if (state.status === 'checking') return <LoadingGate />
	if (state.status === 'unverified') return <Navigate to="/auth?mode=login&unverified=1" replace />
	if (state.status === 'unauthenticated') return <Navigate to="/auth?mode=login" replace />
	if (requireSetup && !state.user?.setup_completed) return <Navigate to="/setup" replace />
	return children
}

export default ProtectedRoute
