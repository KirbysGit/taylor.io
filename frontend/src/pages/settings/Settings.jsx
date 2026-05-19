import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowRight,
	faFileAlt,
	faLayerGroup,
	faRightFromBracket,
	faUser,
} from '@fortawesome/free-solid-svg-icons'
import DashboardShell from '@/components/DashboardShell'

function SettingsCard({ className = '', children }) {
	return (
		<section
			className={`rounded-[1.35rem] border border-brand-pink/20 bg-white shadow-[0_18px_42px_-26px_rgba(80,42,42,0.46)] ring-1 ring-white ${className}`}
		>
			{children}
		</section>
	)
}

function SettingsLinkRow({ icon, label, description, onClick }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex w-full items-center gap-3 rounded-2xl border border-gray-200/90 bg-white px-4 py-3.5 text-left shadow-[0_12px_34px_-28px_rgba(45,30,38,0.34)] transition hover:-translate-y-0.5 hover:border-brand-pink/40 hover:shadow-[0_18px_42px_-28px_rgba(214,86,86,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
		>
			<span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-pink/[0.08] text-brand-pink-dark transition group-hover:bg-brand-pink group-hover:text-white">
				<FontAwesomeIcon icon={icon} className="size-4" />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block font-black text-gray-950">{label}</span>
				<span className="mt-0.5 block text-sm text-gray-600">{description}</span>
			</span>
			<FontAwesomeIcon
				icon={faArrowRight}
				className="size-3.5 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-brand-pink-dark"
			/>
		</button>
	)
}

export default function Settings() {
	const navigate = useNavigate()

	const user = useMemo(() => {
		try {
			const raw = localStorage.getItem('user')
			return raw ? JSON.parse(raw) : null
		} catch {
			return null
		}
	}, [])

	const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Your account'
	const email = user?.email?.trim() || '—'

	const handleLogout = () => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}

	return (
		<DashboardShell onLogout={handleLogout}>
			<div className="mx-auto max-w-3xl">
				<header className="mb-7">
					<p className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink-dark">Settings</p>
					<h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">Your account</h1>
					<p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600">
						Manage how you use Taylor. Career details live on your profile — this page is for account and navigation.
					</p>
				</header>

				<div className="space-y-5">
					<SettingsCard className="p-6">
						<h2 className="text-lg font-black tracking-tight text-gray-950">Account</h2>
						<p className="mt-1 text-sm text-gray-500">Signed in as</p>
						<div className="mt-4 rounded-2xl border border-brand-pink/14 bg-brand-pink/[0.04] px-4 py-3.5">
							<p className="font-black text-gray-950">{displayName}</p>
							<p className="mt-1 text-sm text-gray-600">{email}</p>
						</div>
						<p className="mt-4 text-xs leading-relaxed text-gray-500">
							Name and password changes are coming soon. Update your résumé content anytime from Profile.
						</p>
					</SettingsCard>

					<SettingsCard className="p-6">
						<h2 className="text-lg font-black tracking-tight text-gray-950">Quick links</h2>
						<p className="mt-1 text-sm text-gray-500">Jump to the main areas of your workspace.</p>
						<div className="mt-4 space-y-3">
							<SettingsLinkRow
								icon={faUser}
								label="Profile"
								description="Experience, education, skills, and contact info"
								onClick={() => navigate('/info')}
							/>
							<SettingsLinkRow
								icon={faFileAlt}
								label="Resumes"
								description="Saved versions and build options"
								onClick={() => navigate('/resumes')}
							/>
							<SettingsLinkRow
								icon={faLayerGroup}
								label="Templates"
								description="Layout and style presets"
								onClick={() => navigate('/templates')}
							/>
						</div>
					</SettingsCard>

					<SettingsCard className="p-6">
						<h2 className="text-lg font-black tracking-tight text-gray-950">Session</h2>
						<p className="mt-1 text-sm text-gray-500">Sign out on this device.</p>
						<button
							type="button"
							onClick={handleLogout}
							className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-pink/20 bg-white px-4 py-3 text-sm font-black text-brand-pink-dark shadow-sm transition hover:border-brand-pink/35 hover:bg-brand-pink/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 sm:w-auto"
						>
							<FontAwesomeIcon icon={faRightFromBracket} className="size-4" />
							Log out
						</button>
					</SettingsCard>
				</div>
			</div>
		</DashboardShell>
	)
}
