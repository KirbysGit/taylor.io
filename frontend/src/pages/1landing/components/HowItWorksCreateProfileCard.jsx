// Create-profile step mock — pipeline icon colors; flat rows, no nested cards (decorative only)

import { faBriefcase, faCode, faGraduationCap, faPhone, faStar, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const tones = {
	violet: { box: 'bg-[#f3e8ff]', icon: 'text-[#7c3aed]' },
	cyan: { box: 'bg-[#cffafe]', icon: 'text-[#0e7490]' },
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

function IconShell(props) {
	const t = tones[props.tone]
	const sz = props.size === 'lg' ? 'size-10' : 'size-9'
	const ico = props.size === 'lg' ? 'size-5' : 'size-4'
	return (
		<span className={`flex shrink-0 items-center justify-center rounded-[9px] ${sz} ${t.box}`} aria-hidden>
			<FontAwesomeIcon icon={props.icon} className={`${ico} ${t.icon}`} aria-hidden />
		</span>
	)
}

function SubRow(props) {
	return (
		<div className="flex min-w-0 items-start gap-3.5">
			<IconShell tone={props.tone} icon={props.icon} />
			{/* Label + rails share one column so lines line up under the title, top-aligned with the icon. */}
			<div className="min-w-0 flex-1 space-y-1.5 pt-px">
				<span className="block text-[11px] font-semibold leading-none tracking-tight text-neutral-900">{props.label}</span>
				<div className="space-y-2 pt-0.5">
					<PhLine className="w-[95%]" />
					<PhLine className="w-[65%]" />
				</div>
			</div>
		</div>
	)
}

export default function HowItWorksCreateProfileCard() {
	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden text-left" aria-hidden="true">
			{/* Header — fixed block; subsection list flexes and spreads in the remaining height. */}
			<div className="shrink-0 border-b border-neutral-300/90 pb-4">
				<div className="flex items-start gap-3">
					<IconShell tone="violet" icon={faUser} size="lg" />
					<div className="min-w-0 flex-1 pt-0">
						<p className="pt-0.5 text-xs font-bold leading-tight tracking-tight text-neutral-950">You, at a glance</p>
						<div className="mt-3 space-y-2">
							<PhLine className="w-full" />
							<PhLine className="w-[76%]" />
						</div>
					</div>
				</div>
			</div>

			<div className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden pt-4">
				<SubRow tone="cyan" icon={faPhone} label="Contact" />
				<SubRow tone="teal" icon={faGraduationCap} label="Education" />
				<SubRow tone="sky" icon={faBriefcase} label="Experience" />
				<SubRow tone="slate" icon={faCode} label="Projects" />
				<SubRow tone="amber" icon={faStar} label="Skills" />
			</div>
		</div>
	)
}
