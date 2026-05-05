// Style-it step mock — mirrors the “Resume styling” ideas in ResumeStyling.jsx (template, accent, rules, fonts)
// as a single scannable card; decorative only (no tab state / no real controls).

import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

/** Tiny 4-point glint — brand pink + violet like the reference, not the hero résumé gold stars. */
function CornerSparkle(props) {
	const base =
		'pointer-events-none absolute block shadow-sm ring-1 ring-white/70 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]'
	return <span className={`${base} ${props.className}`} aria-hidden />
}

function SectionTitle(props) {
	return (
		<p className="text-[10px] font-bold uppercase tracking-wide text-neutral-900">{props.children}</p>
	)
}

/** Abstract résumé column + lines — middle column matches “selected layout” in the mock. */
function LayoutThumb(props) {
	const { selected, variant } = props
	const border = selected ? 'border-2 border-brand-pink shadow-sm shadow-brand-pink/15' : 'border border-neutral-200/95 bg-neutral-50/90'
	return (
		<div
			className={`flex min-w-0 flex-1 flex-col rounded-md px-1 py-1.5 ${border}`}
			aria-hidden
		>
			{variant === 'bullets' ? (
				<>
					<span className="mx-auto block h-0.5 w-[72%] shrink-0 rounded-full bg-brand-pink/85" />
					<div className="mt-1 space-y-0.5">
						<div className="flex items-center gap-0.5">
							<span className="size-0.5 shrink-0 rounded-full bg-brand-pink" />
							<span className="h-0.5 min-w-0 flex-1 rounded-full bg-brand-pink/55" />
						</div>
						<div className="flex items-center gap-0.5">
							<span className="size-0.5 shrink-0 rounded-full bg-brand-pink" />
							<span className="h-0.5 min-w-0 flex-1 rounded-full bg-brand-pink/45" />
						</div>
						<div className="flex items-center gap-0.5">
							<span className="size-0.5 shrink-0 rounded-full bg-brand-pink" />
							<span className="h-0.5 w-[55%] rounded-full bg-brand-pink/40" />
						</div>
					</div>
				</>
			) : (
				<>
					<span className="mx-auto block h-0.5 w-[78%] shrink-0 rounded-full bg-neutral-400/55" />
					<div className="mt-1 flex flex-1 gap-0.5">
						<div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
							<span className="h-0.5 w-full rounded-full bg-neutral-400/35" />
							<span className="h-0.5 w-[88%] rounded-full bg-neutral-400/35" />
							<span className="h-0.5 w-[70%] rounded-full bg-neutral-400/35" />
						</div>
						<div className="flex min-w-0 flex-1 flex-col justify-between border-l border-neutral-300/50 py-0.5 pl-0.5">
							<span className="h-0.5 w-full rounded-full bg-neutral-400/35" />
							<span className="h-0.5 w-[92%] rounded-full bg-neutral-400/35" />
							<span className="h-0.5 w-[75%] rounded-full bg-neutral-400/35" />
						</div>
					</div>
				</>
			)}
		</div>
	)
}

const accentSwatches = [
	{ key: 'brand', className: 'bg-gradient-to-br from-brand-pink to-brand-pink-dark', selected: true },
	{ key: 'violet', className: 'bg-violet-500', selected: false },
	{ key: 'sky', className: 'bg-sky-500', selected: false },
	{ key: 'teal', className: 'bg-teal-500', selected: false },
	{ key: 'slate', className: 'bg-slate-400', selected: false },
]

export default function HowItWorksStyleCard() {
	return (
		<div className="relative flex h-full min-h-0 flex-col overflow-hidden text-left" aria-hidden="true">
			{/* Sparkles sit in the chrome like the reference; stay out of the control hit area (still non-interactive). */}
			<CornerSparkle className="right-1 top-0.5 size-2.5 -rotate-[18deg] bg-gradient-to-br from-brand-pink to-brand-pink-dark" />
			<CornerSparkle className="right-0 top-3 size-2 rotate-[14deg] bg-violet-500" />

			<div className="flex min-h-0 flex-1 flex-col gap-3.5 pr-5 pt-0.5">
				<div>
					<SectionTitle>Layouts</SectionTitle>
					<div className="mt-2 flex gap-1.5">
						<LayoutThumb variant="columns" selected={false} />
						<LayoutThumb variant="bullets" selected />
						<LayoutThumb variant="columns" selected={false} />
					</div>
				</div>

				<div>
					<SectionTitle>Accent color</SectionTitle>
					<div className="mt-2 flex items-center justify-between gap-1.5 pr-0.5">
						{accentSwatches.map((s) => (
							<span
								key={s.key}
								className={`relative flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.06] ${s.className} ${
									s.selected ? 'ring-2 ring-brand-pink ring-offset-1 ring-offset-white' : ''
								}`}
								aria-hidden
							>
								{s.selected ? (
									<FontAwesomeIcon icon={faCheck} className="size-2.5 text-white drop-shadow-sm" aria-hidden />
								) : null}
							</span>
						))}
					</div>
				</div>

				<div>
					<SectionTitle>Section style</SectionTitle>
					<div className="mt-2 flex gap-1.5">
						<div
							className="flex min-h-[2.25rem] min-w-0 flex-1 flex-col items-stretch justify-center rounded-md border-2 border-brand-pink bg-white px-1.5 py-1 shadow-sm shadow-brand-pink/10"
							aria-hidden
						>
							<span className="block h-1 rounded-full bg-brand-pink" />
						</div>
						<div
							className="flex min-h-[2.25rem] min-w-0 flex-1 flex-col items-stretch justify-center rounded-md border border-neutral-200/95 bg-neutral-50/90 px-1.5 py-1"
							aria-hidden
						>
							<div className="mx-auto h-0 w-full max-w-[2.75rem] border-t-2 border-dashed border-neutral-400/75" />
						</div>
						<div
							className="flex min-h-[2.25rem] min-w-0 flex-1 flex-col items-stretch justify-center rounded-md border border-neutral-200/95 bg-neutral-50/90 px-1.5 py-1"
							aria-hidden
						>
							<div className="mx-auto h-0 w-full max-w-[2.75rem] border-t-2 border-dotted border-neutral-400/75" />
						</div>
					</div>
				</div>

				<div>
					<SectionTitle>Font</SectionTitle>
					<div className="mt-2 flex gap-1.5">
						<div
							className="flex min-h-[2.25rem] min-w-0 flex-1 flex-col items-center justify-center rounded-md border-2 border-brand-pink bg-white px-1 py-1 shadow-sm shadow-brand-pink/10"
							aria-hidden
						>
							<span className="text-[11px] font-black leading-none tracking-tight text-neutral-900">Aa</span>
						</div>
						<div
							className="flex min-h-[2.25rem] min-w-0 flex-1 flex-col items-center justify-center rounded-md border border-neutral-200/95 bg-neutral-50/90 px-1 py-1"
							aria-hidden
						>
							<span className="font-serif text-[11px] font-normal leading-none text-neutral-400">Aa</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
