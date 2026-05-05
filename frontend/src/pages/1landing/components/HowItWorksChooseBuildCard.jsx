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
	return (
		<span
			aria-hidden
			className={`block h-1 shrink-0 rounded-full bg-neutral-500/[0.38] ${props.className ?? ''}`}
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
	return (
		<div className="flex items-center justify-between gap-2 rounded-md border border-neutral-200/90 bg-white px-2 py-1.5 shadow-sm">
			<div className="flex min-w-0 items-center gap-1.5">
				<SmallIcon tone={props.tone} icon={props.icon} />
				<span className="truncate text-[10.5px] font-semibold tracking-tight text-neutral-900">{props.label}</span>
			</div>
			<span
				className="flex size-3.5 shrink-0 items-center justify-center rounded-sm bg-brand-pink text-white shadow-sm"
				aria-hidden
			>
				<FontAwesomeIcon icon={faCheck} className="size-2" aria-hidden />
			</span>
		</div>
	)
}

function MiniToggle() {
	return (
		<span
			className="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full bg-brand-pink shadow-sm"
			aria-hidden
		>
			<span className="absolute right-0.5 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-white shadow-sm" />
		</span>
	)
}

function PrefRow(props) {
	return (
		<div className="flex items-center justify-between gap-2 rounded-md border border-neutral-200/90 bg-white px-2 py-2 shadow-sm">
			<span className="text-[10.5px] font-semibold leading-tight tracking-tight text-neutral-900">{props.label}</span>
			<MiniToggle />
		</div>
	)
}

/** Full-bleed rule inside the phone shell (parent uses p-4 → -mx-4). */
function FullBleedRule() {
	return <div className="-mx-4 h-px shrink-0 bg-neutral-200/95" aria-hidden />
}

export default function HowItWorksChooseBuildCard() {
	return (
		<div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden text-left" aria-hidden="true">
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
									<PhLine className="min-w-0 flex-1" />
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			<div className="flex shrink-0 flex-col gap-1.5">
				<p className="shrink-0 text-[11px] font-bold leading-tight tracking-tight text-neutral-950">Use from your profile</p>
				<div className="flex flex-col gap-1.5">
					<CheckedRow tone="violet" icon={faUser} label="Experience" />
					<CheckedRow tone="teal" icon={faGraduationCap} label="Education" />
					<CheckedRow tone="slate" icon={faCode} label="Projects" />
					<CheckedRow tone="amber" icon={faStar} label="Skills" />
				</div>
			</div>


			<div className="shrink-0 space-y-1.5">
				<p className="text-[11px] font-bold leading-tight tracking-tight text-neutral-950">Build preferences</p>
				<PrefRow label="Focus on achievements" />
				<PrefRow label="Optimize for ATS" />
			</div>
		</div>
	)
}
