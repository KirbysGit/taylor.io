import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import WorkIcon from '@mui/icons-material/Work'

const growthEvents = [
	{
		label: 'Promotion',
		subtitle: 'You grew.',
		iconType: 'mui',
		icon: ShowChartIcon,
		tone: 'text-brand-pink-dark border-brand-pink/45',
		well: 'bg-brand-pink-lighter/45',
		desktopPos: 'left-[72px] top-0',
	},
	{
		label: 'New Role',
		subtitle: 'You leveled up.',
		iconType: 'mui',
		icon: WorkIcon,
		tone: 'text-violet-600 border-violet-300/65',
		well: 'bg-violet-100/70',
		desktopPos: 'left-[156px] top-[104px]',
	},
	{
		label: 'New Project',
		subtitle: 'You delivered.',
		iconType: 'mui',
		icon: FolderSpecialIcon,
		tone: 'text-teal-600 border-teal-300/60',
		well: 'bg-teal-100/70',
		desktopPos: 'left-[54px] top-[208px]',
	},
	{
		label: 'New Skill',
		subtitle: 'You expanded.',
		iconType: 'fa',
		icon: faStar,
		tone: 'text-sky-600 border-sky-300/65',
		well: 'bg-sky-100/75',
		desktopPos: 'left-[118px] top-[312px]',
	},
]

const resumeVersions = [
	{
		title: 'Résumé v1',
		subtitle: 'Earlier version',
		border: 'border-brand-pink/35',
		accent: 'bg-brand-pink',
		accentSoft: 'bg-brand-pink-lighter/35',
		layer: 'z-10 left-0 top-[92px] rotate-[-1.5deg]',
		label: 'left-0',
		stage: 'rough',
	},
	{
		title: 'Résumé v2',
		subtitle: 'More experience',
		border: 'border-violet-300/70',
		accent: 'bg-violet-500',
		accentSoft: 'bg-violet-100/75',
		layer: 'z-20 left-[150px] top-[46px] rotate-[0.5deg]',
		label: 'left-[150px]',
		stage: 'cleaner',
	},
	{
		title: 'Résumé v3',
		subtitle: 'Latest and strongest',
		border: 'border-sky-300/80',
		accent: 'bg-teal-500',
		accentSoft: 'bg-sky-100/80',
		layer: 'z-30 left-[300px] top-0 rotate-[1.5deg]',
		label: 'left-[300px]',
		stage: 'polished',
	},
]

function GrowthIcon({ event, className = '' }) {
	const Icon = event.icon
	return (
		<div
			className={`inline-flex size-20 shrink-0 items-center justify-center rounded-full border bg-white/72 shadow-[0_16px_34px_-24px_rgba(17,24,39,0.45)] ring-1 ring-white/80 backdrop-blur-[5px] ${event.tone} ${className}`}
		>
			<div className={`inline-flex size-12 items-center justify-center rounded-2xl ${event.well}`}>
				{event.iconType === 'mui' ? (
					<Icon className="size-8" fontSize="large" />
				) : (
					<FontAwesomeIcon icon={event.icon} className="size-7" aria-hidden />
				)}
			</div>
		</div>
	)
}

function GrowthBubble({ event, index }) {
	return (
		<div
			className={`absolute ${event.desktopPos} flex items-center gap-4`}
			style={{
				animation: `grow-bubble-float ${7 + index * 0.55}s ease-in-out infinite`,
				animationDelay: `${index * -0.55}s`,
			}}
		>
			<GrowthIcon event={event} />
			<div className="min-w-[8rem]">
				<p className="text-[1rem] font-bold leading-tight tracking-tight text-gray-900">{event.label}</p>
				<p className="mt-1 text-[13px] font-medium leading-snug text-gray-500">{event.subtitle}</p>
			</div>
		</div>
	)
}

function MobileGrowthEvents() {
	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
			{growthEvents.map((event) => (
				<div key={`${event.label}-mobile`} className="flex flex-col items-center text-center">
					<GrowthIcon event={event} className="size-16" />
					<p className="mt-2 text-[13px] font-bold leading-tight text-gray-900">{event.label}</p>
					<p className="mt-0.5 text-[12px] font-medium text-gray-500">{event.subtitle}</p>
				</div>
			))}
		</div>
	)
}

function DividerRule() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute right-[-44px] top-0 hidden h-[430px] items-center lg:flex"
		>
			<div className="h-[82%] w-px bg-gradient-to-b from-transparent via-gray-300/70 to-transparent" />
		</div>
	)
}

function VisualLabel({ children, tone = 'pink', className = '' }) {
	return (
		<div className={`flex h-8 items-center gap-2 ${className}`}>
			<p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${tone === 'sky' ? 'text-sky-700/80' : 'text-brand-pink'}`}>
				{children}
			</p>
			<div className={`h-px w-14 ${tone === 'sky' ? 'bg-sky-200/80' : 'bg-brand-pink/25'}`} aria-hidden />
		</div>
	)
}

function GrowthEventsStage() {
	return (
		<div className="relative lg:min-h-[470px]">
			<MobileGrowthEvents />
			<div className="relative hidden h-[470px] w-[360px] lg:block">
				<VisualLabel className="absolute left-12 top-0">You add updates</VisualLabel>
				<div className="absolute inset-x-0 top-12 h-[430px]">
					{growthEvents.map((event, index) => (
						<GrowthBubble key={event.label} event={event} index={index} />
					))}
					<DividerRule />
				</div>
			</div>
		</div>
	)
}

function MiniLine({ width = '100%', className = '' }) {
	return <span className={`block h-1.5 rounded-full bg-gray-300/68 ${className}`} style={{ width }} aria-hidden />
}

function MiniBullet({ width = '90%', accent = 'bg-gray-400/80', muted = false }) {
	return (
		<div className="flex min-w-0 items-center gap-2">
			<span className={`size-1.5 shrink-0 rounded-full ${muted ? 'bg-gray-300/80' : accent}`} aria-hidden />
			<MiniLine width={width} className={muted ? 'bg-gray-300/52' : ''} />
		</div>
	)
}

function MiniSection({ titleWidth = '3.25rem', rows = [], accent }) {
	return (
		<div>
			<div className={`mb-1.5 h-1.5 rounded-full ${accent}`} style={{ width: titleWidth }} />
			<div className="space-y-1.5">
				{rows.map((row, index) => (
					<MiniBullet key={`${row}-${index}`} width={row} accent={accent} muted={index > 0} />
				))}
			</div>
		</div>
	)
}

function MiniSkills({ version }) {
	const rows =
		version.stage === 'rough'
			? [
					['32%', '15%', '24%', '11%'],
					['18%', '27%', '13%', '22%'],
				]
			: version.stage === 'cleaner'
				? [
						['26%', '18%', '28%', '15%'],
						['20%', '30%', '17%', '18%'],
					]
				: [
						['24%', '18%', '22%', '16%', '10%'],
						['18%', '26%', '16%', '22%'],
					]

	return (
		<div>
			<div className={`mb-1.5 h-1.5 w-12 rounded-full ${version.accent}`} />
			<div className="space-y-1.5">
				{rows.map((parts) => (
					<div key={parts.join('-')} className="flex min-w-0 items-center gap-1.5">
						{parts.map((width, index) => (
							<MiniLine key={`${width}-${index}`} width={width} className="shrink-0 bg-gray-300/58" />
						))}
					</div>
				))}
			</div>
		</div>
	)
}

function RoughResumeBody({ version }) {
	return (
		<div className="space-y-2.5">
			<div className="flex items-start gap-2.5">
				<div className={`size-8 rounded-full ${version.accent} opacity-75`} />
				<div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
					<MiniLine width="72%" className={version.accent} />
					<MiniLine width="94%" className="bg-gray-300/54" />
					<MiniLine width="58%" className="bg-gray-300/42" />
				</div>
			</div>
			<div className={`rounded-xl p-2 ${version.accentSoft}`}>
				<svg viewBox="0 0 132 48" className="h-9 w-full">
					<polyline points="3,36 18,15 34,31 51,13 70,34 89,19 108,24 129,10" fill="none" stroke="#d65656" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
					<line x1="3" y1="42" x2="129" y2="42" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.5" />
				</svg>
			</div>
			<MiniSection accent={version.accent} titleWidth="3rem" rows={['100%', '54%', '92%']} />
			<MiniSection accent={version.accent} titleWidth="3.6rem" rows={['82%', '48%', '88%']} />
			<MiniSkills version={version} />
		</div>
	)
}

function CleanerResumeBody({ version }) {
	return (
		<div className="space-y-2.5">
			<div className="flex items-start gap-2.5">
				<div className={`size-8 rounded-full ${version.accent}`} />
				<div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
					<MiniLine width="78%" className={version.accent} />
					<MiniLine width="92%" className="bg-gray-300/62" />
					<MiniLine width="70%" className="bg-gray-300/48" />
				</div>
			</div>
			<div className={`rounded-xl p-2.5 ${version.accentSoft}`}>
				<div className="space-y-1.5">
					<MiniLine width="62%" className="bg-white/92" />
					<MiniLine width="91%" className="bg-white/78" />
					<MiniLine width="74%" className="bg-white/66" />
				</div>
			</div>
			<MiniSection accent={version.accent} titleWidth="3.4rem" rows={['94%', '82%', '72%']} />
			<MiniSection accent={version.accent} titleWidth="3rem" rows={['88%', '76%']} />
			<MiniSection accent={version.accent} titleWidth="3.25rem" rows={['84%', '68%']} />
			<MiniSkills version={version} />
		</div>
	)
}

function PolishedResumeBody({ version }) {
	return (
		<div className="space-y-2.5">
			<div className="flex items-start gap-2.5">
				<div className={`size-8 rounded-full ${version.accent}`} />
				<div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
					<MiniLine width="84%" className={version.accent} />
					<MiniLine width="96%" className="bg-gray-300/70" />
					<MiniLine width="66%" className="bg-gray-300/54" />
				</div>
			</div>
			<div className={`rounded-xl p-2.5 ${version.accentSoft}`}>
				<div className="space-y-1.5">
					<MiniLine width="58%" className="bg-white/95" />
					<MiniLine width="94%" className="bg-white/82" />
					<MiniLine width="82%" className="bg-white/72" />
				</div>
			</div>
			<MiniSection accent="bg-teal-500" titleWidth="3.5rem" rows={['96%', '88%', '78%']} />
			<MiniSection accent="bg-sky-500" titleWidth="3.15rem" rows={['90%', '82%', '72%']} />
			<MiniSection accent="bg-violet-500" titleWidth="3.25rem" rows={['84%', '76%']} />
			<MiniSkills version={version} />
		</div>
	)
}

function ResumeCard({ version }) {
	return (
		<div
			className={`absolute h-[300px] w-[216px] overflow-hidden rounded-[1.35rem] border bg-white px-4 py-3.5 shadow-[0_22px_52px_-32px_rgba(17,24,39,0.5)] ring-1 ring-white/85 ${version.border} ${version.layer}`}
		>
			<div className={`mb-3 h-1.5 w-24 rounded-full ${version.accent}`} />
			{version.stage === 'rough' ? (
				<RoughResumeBody version={version} />
			) : version.stage === 'cleaner' ? (
				<CleanerResumeBody version={version} />
			) : (
				<PolishedResumeBody version={version} />
			)}
		</div>
	)
}

function ResumeStack() {
	return (
		<div className="min-w-0 lg:translate-x-8 xl:translate-x-12">
			<VisualLabel tone="sky" className="mb-5 hidden lg:flex">Taylor.io keeps versions current</VisualLabel>
			<div className="relative h-[315px] w-full max-w-[540px] overflow-visible min-[430px]:h-[372px] sm:mx-auto sm:h-[410px]">
				<div className="absolute -right-8 -top-10 h-64 w-64 rounded-full bg-sky-100/60 blur-3xl" aria-hidden />
				<div className="absolute left-0 top-12 h-72 w-72 rounded-full bg-brand-pink-lighter/28 blur-3xl" aria-hidden />
				<div className="relative h-[410px] w-[540px] origin-top-left scale-[0.63] min-[430px]:scale-[0.78] sm:scale-100">
					{resumeVersions.map((version) => (
						<ResumeCard key={version.title} version={version} />
					))}
				</div>
			</div>

			<div className="relative mt-3 hidden h-[72px] max-w-[540px] sm:mx-auto sm:block">
				<div className="absolute left-0 right-0 top-3 border-t border-dashed border-gray-300/90" aria-hidden />
				{resumeVersions.map((version) => (
					<div key={`${version.title}-label`} className={`absolute top-0 w-[216px] text-center ${version.label}`}>
						<div className={`mx-auto size-4 rounded-full border-4 border-cream ${version.accent}`} />
						<p className="mt-4 text-[0.98rem] font-bold tracking-tight text-gray-900">{version.title}</p>
						<p className="mt-0.5 text-[13px] leading-relaxed text-gray-600">{version.subtitle}</p>
					</div>
				))}
			</div>
		</div>
	)
}

export default function LandingGrowWithYou() {
	return (
		<section
			id="grow-with-you"
			aria-labelledby="grow-with-you-heading"
			className="relative overflow-hidden border-b border-gray-200/70 border-t border-brand-pink/20 bg-gradient-to-b from-brand-pink-lighter/45 via-section-wash to-cream py-20 md:py-24 lg:py-28"
		>
			<div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/55 to-transparent" aria-hidden />
			<div className="pointer-events-none absolute bottom-10 left-8 hidden h-px w-[46rem] rotate-[-3deg] border-t border-dashed border-gray-300/70 lg:block" aria-hidden />
			<div className="pointer-events-none absolute bottom-12 left-24 hidden text-brand-pink-light/75 lg:block" aria-hidden>+</div>
			<div className="pointer-events-none absolute bottom-16 left-[25rem] hidden text-violet-300/80 lg:block" aria-hidden>+</div>
			<div className="pointer-events-none absolute bottom-20 left-[43rem] hidden text-sky-300/90 lg:block" aria-hidden>+</div>

			<div className="relative mx-auto max-w-[min(1420px,94vw)] px-3 sm:px-4 md:px-5">
				<div className="grid items-center gap-12 lg:grid-cols-[minmax(330px,0.82fr)_minmax(280px,0.72fr)_minmax(500px,1.12fr)] lg:gap-8 xl:gap-12">
					<div className="max-w-xl self-center">
						<p className="text-[12px] font-bold uppercase tracking-[0.18em] text-brand-pink">Built for long-term growth</p>
						<h2
							id="grow-with-you-heading"
							className="mt-4 text-pretty text-[2.45rem] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-[3rem] lg:text-[3.25rem]"
						>
							Your résumé should not start over every time.
						</h2>
						<p className="mt-5 max-w-[42ch] text-[1.02rem] leading-relaxed text-gray-600 md:text-[1.1rem]">
							As your experience evolves, Taylor.io keeps every version moving forward with you. Add new wins once,
							then refresh each résumé path in seconds.
						</p>
						<div className="mt-8 inline-flex max-w-full items-center gap-2 rounded-full border border-brand-pink/25 bg-brand-pink-lighter/40 px-3.5 py-2 text-[14px] font-semibold text-brand-pink-dark shadow-[0_12px_26px_-22px_rgba(214,86,86,0.65)]">
							<AutoAwesomeRoundedIcon className="size-5 shrink-0 text-brand-pink" fontSize="small" />
							<span>A career workspace, not a one-off generator.</span>
						</div>
					</div>

					<GrowthEventsStage />

					<ResumeStack />
				</div>
			</div>

			<style>{`
				@keyframes grow-bubble-float {
					0%, 100% { transform: translate3d(0, 0, 0); }
					38% { transform: translate3d(0, -7px, 0); }
					70% { transform: translate3d(0, 3px, 0); }
				}

				@media (prefers-reduced-motion: reduce) {
					#grow-with-you [style*="grow-bubble-float"] {
						animation: none !important;
					}
				}
			`}</style>
		</section>
	)
}
