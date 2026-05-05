import { useNavigate } from 'react-router-dom'

export default function LandingFooter() {
	const navigate = useNavigate()
	return (
		<footer className="border-t border-gray-800 bg-gray-950 py-12 text-white">
			<div className="mx-auto max-w-6xl px-5 md:px-8">
				<div className="flex flex-col items-center justify-between gap-6 md:flex-row">
					<div className="text-center md:text-left">
						<p className="text-lg font-semibold tracking-tight">taylor.io</p>
						<p className="mt-1 text-sm text-white/60">Professional documents, tailored to how you work.</p>
					</div>
					<button
						type="button"
						onClick={() => navigate('/auth')}
						className="text-sm font-medium text-brand-pink-light transition hover:text-white"
					>
						Get started →
					</button>
				</div>
				<div className="mt-10 border-t border-white/10 pt-8 text-center text-xs text-white/45 md:text-left">
					© 2026 taylor.io. All rights reserved.
				</div>
			</div>
		</footer>
	)
}
