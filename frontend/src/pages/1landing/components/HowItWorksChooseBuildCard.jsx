// Choose-build step mock — job context → profile picks → prefs; compact, no scroll (decorative only)

import {
	faBriefcase,
	faCheck,
	faCode,
	faGraduationCap,
	faStar,
	faUser,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const tones = {
	violet: { box: 'bg-[#f3e8ff]', icon: 'text-[#7c3aed]' },
	sky: { box: 'bg-[#e0f2fe]', icon: 'text-[#0284c7]' },
	slate: { box: 'bg-[#f1f5f9]', icon: 'text-[#64748b]' },
	amber: { box: 'bg-[#fef3c7]', icon: 'text-[#c2410c]' },
	teal: { box: 'bg-[#d1fae5]', icon: 'text-[#047857]' },
}

function PhLine(props) {
	const { demoActive = false, delayMs = 0, className = '' } = props
	return (
		<span
			aria-hidden
			className={[
				'block h-1 shrink-0 rounded-full bg-neutral-500/[0.38] motion-safe:origin-left motion-safe:transition-[opacity,transform] motion-safe:duration-[650ms]',
				demoActive
					? 'opacity-95 motion-safe:ease-[cubic-bezier(0.34,1,0.64,1)] motion-safe:scale-x-100'
					: 'opacity-[0.28] motion-safe:scale-x-[0.62] motion-safe:ease-out motion-reduce:scale-x-100 motion-reduce:opacity-95',
				className,
			].join(' ')}
			style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
		/>
	)
}

function SmallIcon(props) {
	const t = tones[props.tone]
	return (
		<span
			className={`flex size-6 shrink-0 items-center justify-center rounded-md ${t.box}`}
			aria-hidden
		>
			<FontAwesomeIcon icon={props.icon} className={`size-2.5 ${t.icon}`} aria-hidden />
		</span>
	)
}

/** One profile source — tight row card like create-profile subrows. */
function CheckedRow(props) {
	const { filled, toggleDelayMs = 0 } = props
	return (
		<div className="flex items-center justify-between gap-2 rounded-md border border-neutral-200/90 bg-white px-2 py-1.5 shadow-sm">
			<div className="flex min-w-0 items-center gap-1.5">
				<SmallIcon tone={props.tone} icon={props.icon} />
				<span className="truncate text-[10.5px] font-semibold tracking-tight text-neutral-900">{props.label}</span>
			</div>
			<span
				className={[
					'flex size-3.5 shrink-0 items-center justify-center rounded-sm motion-safe:transition-[background-color,transform,opacity] motion-safe:duration-[400ms] motion-safe:ease-out',
					filled
						? 'bg-brand-pink text-white shadow-sm motion-safe:scale-100'
						: 'border border-neutral-300/90 bg-white motion-safe:scale-90 motion-reduce:border-brand-pink motion-reduce:bg-brand-pink motion-reduce:text-white',
				].join(' ')}
				style={toggleDelayMs ? { transitionDelay: `${toggleDelayMs}ms` } : undefined}
				aria-hidden
			>
				<FontAwesomeIcon
					icon={faCheck}
					className={[
						'size-2 motion-safe:transition-opacity motion-safe:duration-300',
						filled ? 'opacity-100' : 'opacity-0 motion-reduce:opacity-100',
					].join(' ')}
					aria-hidden
				/>
			</span>
		</div>
	)
}

function MiniToggle(props) {
	const on = props.on === true
	const delayMs = props.delayMs ?? 0
	return (
		<span
			className={[
				'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full shadow-sm motion-safe:transition-colors motion-safe:duration-[400ms] motion-safe:ease-out',
				on ? 'bg-brand-pink' : 'bg-neutral-300/95',
			].join(' ')}
			style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
			aria-hidden
		>
			<span
				className={[
					'absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-white shadow-sm motion-safe:transition-[left,transform] motion-safe:duration-[400ms] motion-safe:ease-[cubic-bezier(0.34,1,0.64,1)]',
					on ? 'left-[calc(100%-14px)]' : 'left-0.5',
				].join(' ')}
				style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
			/>
		</span>
	)
}

function PrefRow(props) {
	return (
		<div className="flex items-center justify-between gap-2 rounded-md border border-neutral-200/90 bg-white px-2 py-2 shadow-sm">
			<span className="text-[10.5px] font-semibold leading-tight tracking-tight text-neutral-900">{props.label}</span>
			<MiniToggle on={props.toggleOn} delayMs={props.toggleDelayMs} />
		</div>
	)
}

export default function HowItWorksChooseBuildCard(props) {
	const demoActive = props.demoActive !== false
	return (
		<div className="flex h-full min-h-0 w-full flex-col gap-2.5 overflow-hidden text-left" aria-hidden="true">
			{/* Job context — short block so nothing clips at 400px. */}
			{/* Border instead of ring — parent overflow-hidden clips ring (box-shadow), which looks like corners only. */}
			<div className="shrink-0 rounded-lg border border-violet-200/90 bg-[#f3f0ff] px-2 py-3">
				<div className="flex items-start gap-2">
					<SmallIcon tone="violet" icon={faBriefcase} />
					<div className="min-w-0 flex-1">
						<p className="text-[11px] font-bold leading-tight tracking-tight text-neutral-950">Job description</p>
						<div className="mt-1 space-y-1.5">
							{[0, 1, 2].map((k) => (
								<div key={k} className="flex items-center gap-1">
									<span className="size-1 shrink-0 rounded-full bg-[#7c3aed]" aria-hidden />
									<PhLine demoActive={demoActive} delayMs={k * 95} className="min-w-0 flex-1" />
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			<div className="flex shrink-0 flex-col gap-1.5">
				<p className="shrink-0 text-[11px] font-bold leading-tight tracking-tight text-neutral-950">Use from your profile</p>
				<div className="flex flex-col gap-1">
					<CheckedRow
						tone="violet"
						icon={faUser}
						label="Experience"
						filled={demoActive}
						toggleDelayMs={demoActive ? 420 : 0}
					/>
					<CheckedRow
						tone="teal"
						icon={faGraduationCap}
						label="Education"
						filled={demoActive}
						toggleDelayMs={demoActive ? 540 : 0}
					/>
					<CheckedRow tone="slate" icon={faCode} label="Projects" filled={demoActive} toggleDelayMs={demoActive ? 660 : 0} />
				</div>
			</div>


			<div className="shrink-0 space-y-1.5">
				<p className="text-[11px] font-bold leading-tight tracking-tight text-neutral-950">Build preferences</p>
				<PrefRow label="Focus on achievements" toggleOn={demoActive} toggleDelayMs={demoActive ? 840 : 0} />
				<PrefRow label="Optimize for ATS" toggleOn={demoActive} toggleDelayMs={demoActive ? 980 : 0} />
				<PrefRow label="Keep to one page" toggleOn={demoActive} toggleDelayMs={demoActive ? 1120 : 0} />
			</div>
		</div>
	)
}
