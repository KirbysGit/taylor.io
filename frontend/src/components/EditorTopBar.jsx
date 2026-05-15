import { useNavigate } from 'react-router-dom'
import { ChevronLeft, NavLogout } from '@/components/icons'
import { appLogoClasses } from '@/components/DashboardShell'
import { BRAND_NAME, resolveLogo } from '@/utils/logoMap'

export default function EditorTopBar({ tailorIntent, onLogout }) {
	const navigate = useNavigate()

	return (
		<header className="relative z-[5] shrink-0 border-b border-brand-pink/12 bg-white/88 shadow-[0_10px_30px_-28px_rgba(80,42,42,0.45)] backdrop-blur-xl">
			<div className="mx-auto w-full px-3 py-2 sm:px-4 lg:px-5">
				<div className="flex min-h-[3.1rem] items-center justify-between gap-3">
					<button
						type="button"
						onClick={() => navigate('/resumes')}
						className="flex shrink-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
						aria-label={`${BRAND_NAME} resumes`}
					>
						<img
							src={resolveLogo('navbar')}
							alt={BRAND_NAME}
							decoding="async"
							fetchPriority="high"
							className={appLogoClasses.editor}
						/>
					</button>

					<div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
						<span className="h-6 w-px bg-brand-pink/14" aria-hidden />
						<button
							type="button"
							onClick={() => navigate('/resumes')}
							className="rounded-lg px-2 py-1 text-sm font-bold text-gray-500 transition hover:bg-brand-pink/[0.06] hover:text-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
						>
							Resumes
						</button>
						<span className="text-gray-300" aria-hidden>
							/
						</span>
						<span className="truncate rounded-lg bg-brand-pink/[0.08] px-2 py-1 text-sm font-black text-brand-pink-dark">
							Editor
						</span>
						{tailorIntent ? (
							<span className="ml-1 hidden truncate rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-200 xl:inline-flex">
								Tailoring for {tailorIntent.jobTitle || 'target role'}
							</span>
						) : null}
					</div>

					<div className="flex min-w-0 shrink items-center justify-end gap-1.5 sm:gap-2">
						<button
							type="button"
							onClick={() => navigate('/resume/create')}
							className="inline-flex max-w-[min(48vw,12rem)] shrink-0 items-center gap-1.5 rounded-xl border border-brand-pink/16 bg-white px-3 py-2 text-xs font-black text-brand-pink-dark shadow-sm transition hover:-translate-y-0.5 hover:border-brand-pink/30 hover:bg-brand-pink/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							title="Choose from profile, Taylor.io Assist, or start fresh"
						>
							<ChevronLeft className="size-4 shrink-0 opacity-80" aria-hidden />
							<span className="truncate sm:hidden">Setup</span>
							<span className="hidden truncate sm:inline">Build options</span>
						</button>
						<button
							type="button"
							onClick={() => navigate('/resumes')}
							className="hidden shrink-0 items-center rounded-xl border border-brand-pink/16 bg-white px-3 py-2 text-xs font-black text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-pink/30 hover:bg-brand-pink/[0.045] hover:text-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 sm:inline-flex"
						>
							Resumes
						</button>
						<button
							type="button"
							onClick={onLogout}
							aria-label="Log out"
							className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brand-pink/12 bg-white px-3 py-2 text-xs font-black text-gray-500 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-pink/24 hover:bg-brand-pink/[0.045] hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
						>
							<NavLogout className="size-4 shrink-0" />
							<span className="hidden sm:inline">Log out</span>
						</button>
					</div>
				</div>
			</div>
		</header>
	)
}
