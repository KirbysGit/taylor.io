// Style-it step mock — mirrors ResumeStyling.jsx ideas (template, accent, margins, justification, fonts) in one phone-sized card; decorative only.

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

function Rail(props) {
	const { demoActive = false, delayMs = 0, className = '' } = props
	return (
		<span
			aria-hidden
			className={[
				'block h-0.5 shrink-0 rounded-full bg-neutral-400/[0.42] motion-safe:origin-left motion-safe:transition-[opacity,transform] motion-safe:duration-[600ms] motion-safe:ease-[cubic-bezier(0.34,1,0.64,1)]',
				demoActive
					? 'opacity-[0.95] motion-safe:scale-x-100'
					: 'opacity-[0.38] motion-safe:scale-x-[0.68] motion-reduce:scale-x-100 motion-reduce:opacity-[0.95]',
				className,
			].join(' ')}
			style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
		/>
	)
}

/** Sidebar + main — dense rails like a real preview; height comes from line count, not stretched gaps. */
function LayoutThumbSidebar(props) {
	const { demoActive = false } = props
	let d = 0
	const rail = () => {
		const delayMs = demoActive ? d : 0
		d += 45
		return delayMs
	}
	const border = 'border border-neutral-200/95 bg-white/95 shadow-sm shadow-neutral-200/20'
	return (
		<div
			className={`flex min-h-[5.35rem] min-w-0 flex-1 flex-row gap-0.5 rounded-lg px-1 py-1 ${border}`}
			aria-hidden
		>
			<div className="flex w-[24%] shrink-0 flex-col items-center gap-0.5 rounded border border-violet-200/55 bg-[#eef0ff]/90 px-0.5 py-1">
				<span className="size-2 shrink-0 rounded-[3px] bg-violet-300/90 ring-1 ring-white/80" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[70%]" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[85%]" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[60%]" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[78%]" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[55%]" />
			</div>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5 py-px pl-0.5">
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[88%]" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-full" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[92%]" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[76%]" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[96%]" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[84%]" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[70%]" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[90%]" />
			</div>
		</div>
	)
}

/** Single-column flow — selected state uses brand rails; body reads as one tight paragraph block. */
function LayoutThumbRegular(props) {
	const { selected, demoActive = false } = props
	const border = selected
		? 'border-2 border-brand-pink shadow-sm shadow-brand-pink/15'
		: 'border border-neutral-200/95 bg-neutral-50/90'
	let d = 520
	const rail = () => {
		const delayMs = demoActive ? d : 0
		d += 48
		return delayMs
	}
	return (
		<div
			className={[
				`flex min-h-[5.35rem] min-w-0 flex-1 flex-col gap-0.5 rounded-lg px-1.5 py-1 ${border}`,
				selected ? 'bg-white' : '',
				'motion-safe:transition-[box-shadow,transform] motion-safe:duration-500 motion-safe:ease-out',
				demoActive && selected ? 'motion-safe:shadow-md motion-safe:shadow-brand-pink/18 motion-safe:scale-[1.02]' : '',
			].join(' ')}
			aria-hidden
		>
			<span className="mb-0.5 block h-0.5 w-[72%] shrink-0 rounded-full bg-brand-pink" />
			<div className="flex flex-col gap-0.5">
				<div className="flex items-center gap-0.5">
					<span className="size-[3px] shrink-0 rounded-full bg-brand-pink" />
					<span className="h-0.5 min-w-0 flex-1 rounded-full bg-brand-pink/55" />
				</div>
				<div className="flex items-center gap-0.5">
					<span className="size-[3px] shrink-0 rounded-full bg-brand-pink" />
					<span className="h-0.5 min-w-0 flex-1 rounded-full bg-brand-pink/48" />
				</div>
				<div className="flex items-center gap-0.5">
					<span className="size-[3px] shrink-0 rounded-full bg-brand-pink" />
					<span className="h-0.5 w-[62%] rounded-full bg-brand-pink/42" />
				</div>
			</div>
			<div className="mt-0.5 flex flex-col gap-0.5 border-t border-neutral-200/55 pt-0.5">
				<Rail demoActive={demoActive} delayMs={rail()} className="w-full" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[94%]" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[88%]" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-full" />
				<Rail demoActive={demoActive} delayMs={rail()} className="w-[72%]" />
			</div>
		</div>
	)
}

/** Two equal columns — same line rhythm as a print layout; no vertical stretching between lines. */
function LayoutThumbTwoColumn(props) {
	const { demoActive = false } = props
	let d = 280
	const rail = () => {
		const delayMs = demoActive ? d : 0
		d += 44
		return delayMs
	}
	const border = 'border border-neutral-200/95 bg-white/95 shadow-sm shadow-neutral-200/20'
	return (
		<div
			className={`flex min-h-[5.35rem] min-w-0 flex-1 flex-col gap-0.5 rounded-lg px-1 py-1 ${border}`}
			aria-hidden
		>
			<Rail demoActive={demoActive} delayMs={rail()} className="mx-auto w-[68%]" />
			<div className="flex min-h-0 flex-1 gap-0.5">
				<div className="flex min-w-0 flex-1 flex-col gap-0.5 border-r border-neutral-300/45 pr-0.5">
					<Rail demoActive={demoActive} delayMs={rail()} className="w-full" />
					<Rail demoActive={demoActive} delayMs={rail()} className="w-[90%]" />
					<Rail demoActive={demoActive} delayMs={rail()} className="w-full" />
					<Rail demoActive={demoActive} delayMs={rail()} className="w-[76%]" />
					<Rail demoActive={demoActive} delayMs={rail()} className="w-[88%]" />
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5 pl-0.5">
					<Rail demoActive={demoActive} delayMs={rail()} className="w-full" />
					<Rail demoActive={demoActive} delayMs={rail()} className="w-[86%]" />
					<Rail demoActive={demoActive} delayMs={rail()} className="w-[94%]" />
					<Rail demoActive={demoActive} delayMs={rail()} className="w-[80%]" />
					<Rail demoActive={demoActive} delayMs={rail()} className="w-full" />
				</div>
			</div>
		</div>
	)
}

/** Same three-way choice as `MARGIN_OPTIONS` in ResumeStyling.jsx — decorative segmented strip. */
function MarginsStrip(props) {
	const { demoActive = false } = props
	const opts = [
		{ id: 'balanced', label: 'Balanced', active: true },
		{ id: 'tight', label: 'Tight', active: false },
		{ id: 'spacious', label: 'Spacious', active: false },
	]
	return (
		<div className="mt-2 border-t border-slate-200/65 pt-2" aria-hidden>
			<p className="text-[9px] font-semibold tracking-tight text-slate-600">Page margins</p>
			<div className="mt-1 flex w-full gap-0.5 rounded-[9px] bg-slate-100/95 p-0.5 ring-1 ring-inset ring-slate-200/55">
				{opts.map((o) => {
					const on = demoActive && o.active
					return (
					<span
						key={o.id}
						className={`min-w-0 flex-1 rounded-md px-0.5 py-1 text-center text-[7.5px] font-semibold leading-none motion-safe:transition-colors motion-safe:duration-300 ${
							on
								? 'bg-white text-brand-pink-dark shadow-sm shadow-slate-300/20 ring-1 ring-slate-200/85'
								: 'text-slate-500'
						}`}
					>
						{o.label}
					</span>
					)
				})}
			</div>
		</div>
	)
}

/** Left / center / right — decorative; pairs visually with the margins strip above. */
function JustificationStrip(props) {
	const { demoActive = false } = props
	const opts = [
		{ id: 'left', label: 'Left', active: true },
		{ id: 'center', label: 'Center', active: false },
		{ id: 'right', label: 'Right', active: false },
	]
	return (
		<div className="mt-2 border-t border-slate-200/65 pt-2" aria-hidden>
			<p className="text-[9px] font-semibold tracking-tight text-slate-600">Justification</p>
			<div className="mt-1 flex w-full gap-0.5 rounded-[9px] bg-slate-100/95 p-0.5 ring-1 ring-inset ring-slate-200/55">
				{opts.map((o) => {
					const on = demoActive && o.active
					return (
					<span
						key={o.id}
						className={`min-w-0 flex-1 rounded-md px-0.5 py-1 text-center text-[7.5px] font-semibold leading-none motion-safe:transition-colors motion-safe:duration-300 ${
							on
								? 'bg-white text-brand-pink-dark shadow-sm shadow-slate-300/20 ring-1 ring-slate-200/85'
								: 'text-slate-500'
						}`}
					>
						{o.label}
					</span>
					)
				})}
			</div>
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

export default function HowItWorksStyleCard(props) {
	const demoActive = props.demoActive !== false
	return (
		<div className="relative flex h-full min-h-0 w-full flex-1 flex-col text-left" aria-hidden="true">
			<CornerSparkle
				className={[
					'right-1 top-0.5 size-2.5 -rotate-[18deg] bg-gradient-to-br from-brand-pink to-brand-pink-dark motion-safe:transition-opacity motion-safe:duration-500',
					demoActive ? 'opacity-100' : 'opacity-45 motion-reduce:opacity-100',
				].join(' ')}
			/>
			<CornerSparkle
				className={[
					'right-0 top-3 size-2 rotate-[14deg] bg-violet-500 motion-safe:transition-opacity motion-safe:duration-500 motion-safe:delay-75',
					demoActive ? 'opacity-100' : 'opacity-40 motion-reduce:opacity-100',
				].join(' ')}
			/>

			{/* Phone column is a fixed height — scroll so every section stays reachable; min-h-0 lets the flex child shrink. */}
			<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
				<div className="flex flex-col gap-3 px-2 pb-0.5 pt-0">
					<div>
						<SectionTitle>Layouts</SectionTitle>
						<div
							className={[
								'mt-1.5 rounded-xl border border-slate-200/75 bg-gradient-to-b from-white via-white to-slate-50/60 p-1.5 shadow-sm shadow-slate-200/30 ring-1 ring-black/[0.02] motion-safe:transition-[box-shadow,opacity] motion-safe:duration-500 motion-safe:ease-out',
								demoActive ? 'opacity-100 motion-safe:shadow-md motion-safe:shadow-brand-pink/12' : 'opacity-[0.88] motion-reduce:opacity-100',
							].join(' ')}
						>
							<div className="flex gap-1.5">
								<LayoutThumbSidebar demoActive={demoActive} />
								<LayoutThumbRegular selected demoActive={demoActive} />
								<LayoutThumbTwoColumn demoActive={demoActive} />
							</div>
							<MarginsStrip demoActive={demoActive} />
							<JustificationStrip demoActive={demoActive} />
						</div>
					</div>

					<div>
						<SectionTitle>Accent color</SectionTitle>
						<div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-7 gap-y-1.5">
							{accentSwatches.map((s) => (
								<span
									key={s.key}
									className={[
										`relative flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.06] motion-safe:transition-[transform,box-shadow] motion-safe:duration-500 motion-safe:ease-out ${s.className}`,
										/* ring-offset drew outside the clip box next to overflow-x-hidden; inset selection reads the same without side bleed. */
										s.selected ? 'ring-2 ring-brand-pink ring-offset-0 ring-inset' : '',
										demoActive && s.selected ? 'motion-safe:scale-110 motion-safe:shadow-sm' : 'motion-safe:scale-100 motion-reduce:scale-110',
									].join(' ')}
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
						<SectionTitle>Font</SectionTitle>
						<div className="mt-1.5 flex gap-1.5">
							<div
								className={[
									'flex min-h-[2.1rem] min-w-0 flex-1 flex-col items-center justify-center rounded-md border-2 border-brand-pink bg-white px-1 py-0.5 shadow-sm shadow-brand-pink/10 motion-safe:transition-[transform,box-shadow] motion-safe:duration-500',
									demoActive ? 'motion-safe:scale-[1.04]' : 'motion-safe:scale-100',
								].join(' ')}
							>
								<span className="text-[10px] font-black leading-none tracking-tight text-neutral-900">Aa</span>
							</div>
							<div className="flex min-h-[2.1rem] min-w-0 flex-1 flex-col items-center justify-center rounded-md border border-neutral-200/95 bg-neutral-50/90 px-1 py-0.5">
								<span className="font-serif text-[10px] font-normal leading-none text-neutral-400">Aa</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
