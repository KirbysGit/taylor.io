// pages/5resume/ResumeCreate.jsx
// Choose how to build a new resume.

import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowLeft,
	faArrowRight,
	faFileAlt,
	faPenToSquare,
	faPlus,
	faUser,
	faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import DashboardShell from '@/components/DashboardShell'
import { logoutUser } from '@/api/services/auth'

const buildOptions = [
	{
		title: 'Tailor to a role',
		subtitle: 'Best for applications',
		description: 'Paste a job description, set your target role, and generate a focused draft from your profile.',
		icon: faWandMagicSparkles,
		tone: 'brand',
		to: '/resume/create/tailor',
		primary: true,
	},
	{
		title: 'Choose from profile',
		subtitle: 'Best for control',
		description: 'Pick the specific education, experience, and projects you want in this version.',
		icon: faUser,
		tone: 'sky',
		to: '/resume/create/choose',
	},
	{
		title: 'Start fresh',
		subtitle: 'Best for a blank canvas',
		description: 'Open the editor with an empty resume and build the version manually.',
		icon: faPlus,
		tone: 'violet',
		to: '/resume/preview',
		state: { createMode: 'startFresh' },
	},
]

const toneClasses = {
	brand: {
		card: 'bg-brand-pink/[0.08] border-brand-pink/20',
		icon: 'bg-brand-pink text-white',
		chip: 'bg-white/82 text-brand-pink-dark ring-brand-pink/12',
	},
	sky: {
		card: 'bg-white/82 border-brand-pink/13',
		icon: 'bg-sky-100 text-sky-700',
		chip: 'bg-sky-50 text-sky-700 ring-sky-200',
	},
	violet: {
		card: 'bg-white/82 border-brand-pink/13',
		icon: 'bg-violet-100 text-violet-700',
		chip: 'bg-violet-50 text-violet-700 ring-violet-200',
	},
}

function BuildOptionCard({ option, onSelect }) {
	const tone = toneClasses[option.tone] || toneClasses.brand

	return (
		<button
			type="button"
			onClick={onSelect}
			className={`group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border p-6 text-left shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)] ring-1 ring-white/80 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-brand-pink/30 hover:shadow-[0_24px_54px_-34px_rgba(214,86,86,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 ${tone.card}`}
		>
			{option.primary ? (
				<span className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-brand-pink/[0.12] blur-2xl" aria-hidden />
			) : null}
			<div className="relative z-[1] flex items-start justify-between gap-4">
				<span className={`flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ${tone.icon}`}>
					<FontAwesomeIcon icon={option.icon} className="size-6" />
				</span>
				<span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ring-1 ${tone.chip}`}>
					{option.subtitle}
				</span>
			</div>
			<h2 className="relative z-[1] mt-5 text-2xl font-black tracking-tight text-gray-950">{option.title}</h2>
			<p className="relative z-[1] mt-3 flex-1 text-sm leading-relaxed text-gray-600">{option.description}</p>
			<span className="relative z-[1] mt-6 inline-flex items-center gap-2 text-sm font-black text-brand-pink-dark">
				Continue
				<FontAwesomeIcon icon={faArrowRight} className="size-3.5 transition group-hover:translate-x-0.5" />
			</span>
		</button>
	)
}

export default function ResumeCreate() {
	const navigate = useNavigate()

	const handleLogout = async () => {
		await logoutUser()
		navigate('/')
	}

	return (
		<DashboardShell onLogout={handleLogout}>
			<div className="mx-auto max-w-7xl">
				<header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<button
							type="button"
							onClick={() => navigate('/resumes')}
							className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-brand-pink-dark focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
						>
							<FontAwesomeIcon icon={faArrowLeft} className="size-3.5" />
							Back to resumes
						</button>
						<p className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink-dark">Create resume</p>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">How do you want to build it?</h1>
						<p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600">
							Start from the path that matches your goal. You can still edit everything in preview before exporting.
						</p>
					</div>
					<div className="hidden size-14 items-center justify-center rounded-2xl bg-brand-pink/[0.1] text-brand-pink-dark sm:flex">
						<FontAwesomeIcon icon={faFileAlt} className="size-6" />
					</div>
				</header>

				<section className="grid gap-5 lg:grid-cols-3">
					{buildOptions.map((option) => (
						<BuildOptionCard
							key={option.title}
							option={option}
							onSelect={() => navigate(option.to, option.state ? { state: option.state } : undefined)}
						/>
					))}
				</section>
			</div>
		</DashboardShell>
	)
}
