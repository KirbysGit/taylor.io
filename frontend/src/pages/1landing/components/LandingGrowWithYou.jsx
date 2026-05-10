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
		desktopPos: 'left-[72px] top-[24px]',
	},
	{
		label: 'New Role',
		subtitle: 'You leveled up.',
		iconType: 'mui',
		icon: WorkIcon,
		tone: 'text-violet-600 border-violet-300/65',
		well: 'bg-violet-100/70',
		desktopPos: 'left-[156px] top-[128px]',
	},
	{
		label: 'New Project',
		subtitle: 'You delivered.',
		iconType: 'mui',
		icon: FolderSpecialIcon,
		tone: 'text-teal-600 border-teal-300/60',
		well: 'bg-teal-100/70',
		desktopPos: 'left-[54px] top-[232px]',
	},
	{
		label: 'New Skill',
		subtitle: 'You expanded.',
		iconType: 'fa',
		icon: faStar,
		tone: 'text-sky-600 border-sky-300/65',
		well: 'bg-sky-100/75',
		desktopPos: 'left-[118px] top-[336px]',
	},
]

const resumeVersions = [
	{
		title: 'Résumé v1',
		subtitle: 'Fresh grad foundation',
		border: 'border-brand-pink/35',
		accent: 'bg-brand-pink',
		accentSoft: 'bg-brand-pink-lighter/35',
		layer: 'z-10 left-0 top-[92px]',
		label: 'left-0',
		stage: 'rough',
	},
	{
		title: 'Résumé v2',
		subtitle: 'Growing with real wins',
		border: 'border-violet-300/70',
		accent: 'bg-violet-500',
		accentSoft: 'bg-violet-100/75',
		layer: 'z-20 left-[150px] top-[46px]',
		label: 'left-[150px]',
		stage: 'cleaner',
	},
	{
		title: 'Résumé v3',
		subtitle: 'Clear, focused story',
		border: 'border-sky-300/80',
		accent: 'bg-teal-500',
		accentSoft: 'bg-sky-100/80',
		layer: 'z-30 left-[300px] top-0',
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
			className="pointer-events-none hidden h-full min-h-[430px] items-stretch justify-center lg:flex"
		>
			<div className="w-px bg-gradient-to-b from-gray-200/10 via-gray-300 to-gray-200/10" />
		</div>
	)
}

function VisualLabel({ children, tone = 'pink', className = '' }) {
	const lineTone = tone === 'sky' ? 'bg-sky-300/[0.72]' : 'bg-brand-pink/[0.38]'
	const textTone = tone === 'sky' ? 'text-sky-700/80' : 'text-brand-pink'
	return (
		<div className={`flex w-full items-center gap-3 ${className}`}>
			<div className={`h-px min-w-8 flex-1 ${lineTone}`} aria-hidden />
			<p className={`shrink-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.16em] ${textTone}`}>{children}</p>
			<div className={`h-px min-w-8 flex-1 ${lineTone}`} aria-hidden />
		</div>
	)
}

function GrowthEventsStage() {
	return (
		<div className="relative lg:min-h-[470px]">
			<MobileGrowthEvents />
			<div className="relative hidden h-[430px] w-[360px] lg:block">
				{growthEvents.map((event, index) => (
					<GrowthBubble key={event.label} event={event} index={index} />
				))}
			</div>
		</div>
	)
}

function MiniLine({ width = '100%', className = '' }) {
	// Use bracket opacity so Tailwind always generates the class (e.g. /68 isn’t a default step).
	return <span className={`block h-1.5 rounded-full bg-gray-300/[0.68] ${className}`} style={{ width }} aria-hidden />
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
							<MiniLine key={`${width}-${index}`} width={width} className="shrink-0 bg-gray-300/[0.58]" />
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
					<MiniLine width="104%" className={version.accent} />
					<MiniLine width="96%" className="bg-gray-300/[0.58]" />
					<MiniLine width="84%" className="bg-gray-300/[0.48]" />
				</div>
			</div>
			<div className={`rounded-xl p-2 ${version.accentSoft}`}>
				<svg viewBox="0 0 132 48" className="h-9 w-full">
					<polyline points="3,36 18,15 34,31 51,13 70,34 89,19 108,24 129,10" fill="none" stroke="#d65656" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
					<line x1="3" y1="42" x2="129" y2="42" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.5" />
				</svg>
			</div>
			{/* Messy: fewer “organized” sections, but lines still span most of the width. */}
			<MiniSection accent={version.accent} titleWidth="3rem" rows={['98%', '92%', '86%']} />
			<MiniSection accent={version.accent} titleWidth="3.6rem" rows={['94%', '88%', '82%']} />
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
					<MiniLine width="90%" className={version.accent} />
					<MiniLine width="97%" className="bg-gray-300/66" />
					<MiniLine width="82%" className="bg-gray-300/[0.54]" />
				</div>
			</div>
			{/* Cleaner: more structure + a small “progress” chart block. */}
			<div className={`rounded-xl p-2.5 ${version.accentSoft}`}>
				<div className="space-y-1.5">
					<MiniLine width="78%" className="bg-white/92" />
					
				</div>
				<div className="mt-2.5 rounded-lg bg-white/65 p-2">
					<div className="flex items-end justify-between gap-1.5">
						{[6, 10, 8, 14, 11, 16].map((h, idx) => (
							<span
								key={`${h}-${idx}`}
								aria-hidden
								className="w-[14%] rounded-[6px] bg-violet-500/70"
								style={{ height: `${h}px` }}
							/>
						))}
					</div>
				</div>
			</div>
			<MiniSection accent={version.accent} titleWidth="3.4rem" rows={['96%', '88%', '80%']} />
			<MiniSection accent={version.accent} titleWidth="3.2rem" rows={['94%', '86%', '74%']} />
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
					<MiniLine width="92%" className={version.accent} />
					<MiniLine width="98%" className="bg-gray-300/74" />
					<MiniLine width="86%" className="bg-gray-300/[0.58]" />
				</div>
			</div>
			<div className={`rounded-xl p-2.5 ${version.accentSoft}`}>
				<div className="space-y-1.5">
					<MiniLine width="74%" className="bg-white/95" />
					<MiniLine width="97%" className="bg-white/82" />
					<MiniLine width="90%" className="bg-white/72" />
				</div>
			</div>
			<MiniSection accent="bg-teal-500" titleWidth="3.5rem" rows={['96%', '88%', '78%']} />
			<MiniSection accent="bg-sky-500" titleWidth="3.15rem" rows={['90%', '82%', '72%']} />
			<MiniSection accent="bg-violet-500" titleWidth="3.25rem" rows={['88%', '80%', '74%']} />
			<MiniSection accent={version.accent} titleWidth="3.1rem" rows={['92%', '84%']} />
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
		<div className="ml-4 min-w-0">
			<div className="relative h-[315px] w-full max-w-[540px] overflow-visible min-[430px]:h-[372px] sm:mx-auto sm:h-[410px]">
				<div className="absolute -right-8 -top-10 h-64 w-64 rounded-full bg-sky-100/60 blur-3xl" aria-hidden />
				<div className="absolute left-0 top-12 h-72 w-72 rounded-full bg-brand-pink-lighter/28 blur-3xl" aria-hidden />
				<div className="relative h-[410px] w-[540px] origin-top-left scale-[0.63] min-[430px]:scale-[0.78] sm:scale-100">
					{resumeVersions.map((version) => (
						<ResumeCard key={version.title} version={version} />
					))}
				</div>
			</div>

			<div className="relative mt-1 hidden h-[96px] max-w-[540px] sm:mx-auto sm:block">
				<div className=" border-2 border-grey-600  absolute left-[90px] right-[90px] top-[16px] h-3.5px" aria-hidden />
				{resumeVersions.map((version) => (
					<div key={`${version.title}-label`} className={`absolute top-0 w-[216px] text-center ${version.label}`}>
						<div className="mx-auto flex h-9 w-12 items-center justify-center">
							<div className={`h-2 w-9 rounded-full ${version.accent}`} />
						</div>
						<div className="mx-auto w-fit min-w-[8.75rem] px-3 py-2">
							<p className="text-[0.95rem] font-bold tracking-tight text-gray-900">{version.title}</p>
							<p className="mt-0.5 text-[12px] font-medium leading-snug text-gray-500">{version.subtitle}</p>
						</div>
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

			<div className="relative mx-auto max-w-[min(1420px,94vw)] px-3 sm:px-4 md:px-5">
				<div className="grid items-center gap-12 lg:grid-cols-[minmax(330px,0.82fr)_minmax(0,1.84fr)] lg:gap-10 xl:gap-14">
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

					<div className="min-w-0">
						<div className="mb-5 hidden grid-cols-[360px_1px_minmax(500px,540px)] items-center gap-x-8 lg:grid xl:gap-x-10">
							<VisualLabel>You add updates</VisualLabel>
							<div aria-hidden />
							<VisualLabel tone="sky">Taylor.io keeps versions current</VisualLabel>
						</div>

						<div className="grid min-w-0 items-start gap-12 lg:grid-cols-[360px_1px_minmax(500px,540px)] lg:gap-x-8 xl:gap-x-10">
							<GrowthEventsStage />
							<DividerRule />
							<ResumeStack />
						</div>
					</div>
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
