// Generate-resume step mock — résumé preview + ATS-ready stamp (decorative only; matches reference energy)

import { faRobot, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

function PhLine(props) {
	const { demoActive = false, delayMs = 0, className = '' } = props
	return (
		<span
			aria-hidden
			className={[
				'block h-1 shrink-0 rounded-full bg-neutral-400/[0.35] motion-safe:origin-left motion-safe:transition-[opacity,transform] motion-safe:duration-[680ms]',
				demoActive
					? 'opacity-[0.97] motion-safe:ease-[cubic-bezier(0.34,1,0.64,1)] motion-safe:scale-x-100'
					: 'opacity-[0.26] motion-safe:scale-x-[0.58] motion-safe:ease-out motion-reduce:scale-x-100 motion-reduce:opacity-[0.97]',
				className,
			].join(' ')}
			style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
		/>
	)
}

function SectionLabel(props) {
	return (
		<p className="text-[9px] font-bold uppercase tracking-[0.12em] text-brand-pink">{props.children}</p>
	)
}

function BulletLine(props) {
	const { demoActive = false, delayMs = 0 } = props
	const dotMuted = (
		<span
			className={[
				'size-1 shrink-0 rounded-full motion-safe:transition-[background-color,opacity] motion-safe:duration-500',
				demoActive ? 'bg-neutral-400/90' : 'bg-neutral-300',
			].join(' ')}
			style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
			aria-hidden
		/>
	)
	const dotAccent =
		props.accent === true ? (
			<span
				className={[
					'size-1.5 shrink-0 rounded-full motion-safe:transition-[background-color,transform,opacity] motion-safe:duration-500 motion-safe:ease-out',
					demoActive
						? 'scale-100 bg-brand-pink'
						: 'scale-[0.82] bg-neutral-400/95 motion-reduce:scale-100 motion-reduce:bg-brand-pink',
				].join(' ')}
				style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
				aria-hidden
			/>
		) : (
			dotMuted
		)
	const lineClass = props.lineClass ?? 'w-full'
	return (
		<div className="flex min-w-0 items-center gap-2">
			{dotAccent}
			<PhLine demoActive={demoActive} delayMs={delayMs} className={`min-w-0 ${lineClass}`} />
		</div>
	)
}

/** Two ragged “skill chip” rows from short rails — reads as keywords without literal pills. */
function SkillPlaceholderRows(props) {
	const { demoActive } = props
	const base = 1360
	return (
		<div className="mt-1.5 space-y-2">
			<div className="flex min-w-0 items-center gap-2">
				<PhLine demoActive={demoActive} delayMs={base} className="w-[30%] shrink-0" />
				<PhLine demoActive={demoActive} delayMs={base + 70} className="w-[15%] shrink-0" />
				<PhLine demoActive={demoActive} delayMs={base + 140} className="w-[25%] shrink-0" />
				<PhLine demoActive={demoActive} delayMs={base + 210} className="w-[10%] shrink-0" />
			</div>
			<div className="flex min-w-0 items-center gap-2">
				<PhLine demoActive={demoActive} delayMs={base + 300} className="w-[12%] shrink-0" />
				<PhLine demoActive={demoActive} delayMs={base + 370} className="w-[28%] shrink-0" />
				<PhLine demoActive={demoActive} delayMs={base + 440} className="w-[18%] shrink-0" />
				<PhLine demoActive={demoActive} delayMs={base + 510} className="w-[22%] shrink-0" />
				<PhLine demoActive={demoActive} delayMs={base + 580} className="w-[8%] shrink-0" />
			</div>
		</div>
	)
}

export default function HowItWorksGenerateResumeCard(props) {
	const demoActive = props.demoActive !== false
	return (
		<div className="relative flex h-full min-h-0 w-full flex-col overflow-visible text-left" aria-hidden="true">
			{/* Soft outer cushion + pink glow so this step reads as “output” vs the flat profile/build mocks. */}
			<div className="relative flex min-h-0 flex-1 flex-col overflow-visible rounded-xl bg-brand-pink-lighter/35 p-0.5 shadow-[inset_0_0_0_1px_rgba(214,86,86,0.12)]">

				<div className="relative flex min-h-0 flex-1 flex-col overflow-visible rounded-lg border border-brand-pink/15 bg-[#fdfcfa] px-3.5 pb-4 pt-2 shadow-[0_10px_28px_-8px_rgba(214,86,86,0.28)]">
					{/* TR + BL glints past the paper edge — same soft gold treatment as the hero résumé, with light per-star tilt. */}
					<div className="pointer-events-none absolute -inset-5 z-[4] overflow-visible" aria-hidden>
						<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--medium resume-shine-tight-tr1 -rotate-[7deg]" />
						<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--small resume-shine-tight-tr2 rotate-[11deg]" />
						<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--small resume-shine-tight-tr3 -rotate-[5deg]" />
						<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--medium resume-shine-tight-bl1 rotate-[8deg]" />
						<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--small resume-shine-tight-bl2 -rotate-[10deg]" />
						<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--small resume-shine-tight-bl3 rotate-[6deg]" />
					</div>

					{/* Corner “sticker” — anchored on the paper vertex so half the tag floats outside the border (still readable as a stamp, not inset padding). */}
					<span
						className={[
							'pointer-events-none absolute left-0 top-0 z-30 inline-flex origin-center -translate-x-[10%] -translate-y-[38%] items-center gap-1.5 rounded-full border border-emerald-400/60 bg-emerald-50/98 px-2 py-1 shadow-[0_3px_10px_rgba(15,118,110,0.22)] ring-[2px] ring-white/95 motion-safe:transition-[transform,opacity] motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.34,1,0.64,1)]',
							demoActive ? 'motion-safe:scale-100 opacity-100' : 'motion-safe:scale-[0.93] opacity-85 motion-reduce:scale-100 motion-reduce:opacity-100',
						].join(' ')}
						aria-hidden
					>
						<FontAwesomeIcon icon={faRobot} className="size-5 shrink-0 text-emerald-800" />
						<span className="text-[10px] font-extrabold uppercase leading-none tracking-wide text-emerald-950">
							ATS-ready
						</span>
					</span>

					{/* Header — who + role, then intro rails (obvious labels vs pure lorem). */}
					<div className="relative z-10 flex shrink-0 items-start gap-3.5 pt-4">
						<span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-pink/15 text-brand-pink">
							<FontAwesomeIcon icon={faUser} className="size-[1.5rem]" />
						</span>
						<div className="min-w-0 flex-1 pt-0.5">
							<p className="text-sm font-black tracking-wide leading-tight text-neutral-900">Colin Kirby</p>
							<p className="mt-1 text-[12px] font-black tracking-wide leading-snug text-brand-pink">Software Developer</p>
							<div className="mt-2 space-y-2">
								<PhLine demoActive={demoActive} delayMs={0} className="w-full" />
								<PhLine demoActive={demoActive} delayMs={110} className="w-[72%]" />
							</div>
						</div>
					</div>

					<div className="relative z-10 mt-2 flex min-h-0 flex-1 flex-col space-y-2 overflow-hidden">
						<div>
							<SectionLabel>Summary</SectionLabel>
							<div className="mt-1.5 space-y-2">
								<PhLine demoActive={demoActive} delayMs={240} className="w-full" />
								<PhLine demoActive={demoActive} delayMs={360} className="w-[92%]" />
								<PhLine demoActive={demoActive} delayMs={470} className="w-[78%]" />
							</div>
						</div>

						<div>
							<SectionLabel>Experience</SectionLabel>
							<div className="mt-1.5 space-y-2">
								<BulletLine demoActive={demoActive} accent lineClass="w-full" delayMs={600} />
								<BulletLine demoActive={demoActive} lineClass="w-[88%]" delayMs={740} />
								<BulletLine demoActive={demoActive} lineClass="w-[80%]" delayMs={880} />
							</div>
						</div>

						<div>
							<SectionLabel>Education</SectionLabel>
							<div className="mt-1.5">
								<BulletLine demoActive={demoActive} accent lineClass="w-[90%]" delayMs={1020} />
							</div>
						</div>

						<div>
							<SectionLabel>Projects</SectionLabel>
							<div className="mt-1.5 space-y-2">
								<BulletLine demoActive={demoActive} accent lineClass="w-[86%]" delayMs={1140} />
								<BulletLine demoActive={demoActive} lineClass="w-[82%]" delayMs={1260} />
								<BulletLine demoActive={demoActive} lineClass="w-[82%]" delayMs={1380} />
							</div>
						</div>

						<div>
							<SectionLabel>Skills</SectionLabel>
							<SkillPlaceholderRows demoActive={demoActive} />
						</div>
					</div>

				</div>
			</div>
		</div>
	)
}
