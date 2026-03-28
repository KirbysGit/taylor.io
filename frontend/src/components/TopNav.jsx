import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function TopNav({ user, onLogout, onBeforeNavigate }) {
	const navigate = useNavigate()
	const location = useLocation()

	const links = [
		{ label: 'Home', to: '/home' },
		{ label: 'Templates', to: '/templates' },
		{ label: 'Info', to: '/info' },
		{ label: 'Preview', to: '/resume/preview' },
	]

	const isActive = (to) => location.pathname === to

	const handleNav = async (to) => {
		try {
			await onBeforeNavigate?.()
		} catch (err) {
			console.error('Before navigate failed:', err)
		}
		navigate(to)
	}

	return (
		<header className="bg-brand-pink text-white py-4 shadow-md">
			<div className="max-w-6xl mx-auto px-8 flex justify-between items-center gap-6">
				<div className="flex items-center gap-4">
					<h1 className="text-2xl font-bold cursor-pointer" onClick={() => handleNav('/home')}>
						taylor.io
					</h1>
					<nav className="flex items-center gap-2">
						{links.map((link) => (
							<button
								key={link.to}
								onClick={() => handleNav(link.to)}
								className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${
									isActive(link.to) ? 'bg-white text-brand-pink' : 'bg-white/20 hover:bg-white/30'
								}`}
							>
								{link.label}
							</button>
						))}
					</nav>
				</div>
				<div className="flex items-center gap-4">
					{user && <span className="text-sm opacity-90">{user.email}</span>}
					<button
						onClick={onLogout}
						className="px-4 py-2 bg-white-bright text-brand-pink font-semibold rounded-lg hover:opacity-90 transition-all"
					>
						Logout
					</button>
				</div>
			</div>
		</header>
	)
}

export default TopNav


