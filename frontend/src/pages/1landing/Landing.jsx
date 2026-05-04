// landing/Landing.jsx — marketing landing (cream + brand-pink, Inter)

import { useNavigate } from 'react-router-dom'
import { BRAND_NAME, resolveLogo } from '@/utils/logoMap'

/** Small monochrome icons — sized for chunky tile / sidebar affordances */
function IcoUser(props) {
	return (
		<svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
			<path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
		</svg>
	)
}
function IcoBriefcase(props) {
	return (
		<svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
			<path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255V18a2 2 0 01-2 2H5a2 2 0 01-2-2v-4.745M21 13.255V11a2 2 0 00-2-2h-5M3 13.255V11a2 2 0 012-2h5m0 0V7a2 2 0 012-2h2a2 2 0 012 2v2m-6 4h6" />
		</svg>
	)
}
function IcoGrad(props) {
	return (
		<svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
			<path strokeLinecap="round" strokeLinejoin="round" d="M2 13l10-7 10 7-10 7-10-7z M12 9v13" />
		</svg>
	)
}
function IcoCode(props) {
	return (
		<svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
			<path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
		</svg>
	)
}
function IcoCube(props) {
	return (
		<svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
			<path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
		</svg>
	)
}
function IcoStar(props) {
	return (
		<svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
			<path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
		</svg>
	)
}
function IcoCheck(props) {
	return (
		<svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
			<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
		</svg>
	)
}

/** Decorative only — reinforces “scatter → funnel → one résumé” without implying backend detail */
function PipelineSparkle(props) {
	return (
		<svg
			className={`landing-pipeline-sparkle overflow-visible fill-current opacity-95 ${props.className ?? ''}`}
			viewBox="0 0 40 40"
			aria-hidden
		>
			<path
				fill="currentColor"
				opacity={0.94}
				d="M20 6l2.2 6.8h7l-5.6 4.2 2.2 7-6-4.4L14 23l2.2-7-5.6-4.2h7z"
			/>
		</svg>
	)
}

/** Placeholder “text” rails — charcoal on glass so lines read as copy, not noise */
function PhCapsule(props) {
	const weight = props.weight ?? 'solid'
	const tint =
		weight === 'solid'
			? 'bg-[rgb(38_36_35/0.94)]'
			: weight === 'muted'
				? 'bg-[rgb(62_58_56/0.9)]'
				: weight === 'faint'
					? 'bg-[rgb(88_82_79/0.84)]'
					: weight === 'chip'
						? 'bg-[rgb(48_44_43/0.92)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]'
						: 'bg-[rgb(38_36_35/0.94)]'
	return (
		<span
			aria-hidden
			style={props.style}
			className={`block shrink-0 rounded-full ${tint} ${props.h ?? 'h-[6px]'} ${props.className ?? ''}`}
		/>
	)
}

/** Same-size chroma-square beside abstract rails inside each bubble */
function IcoBadge(props) {
	const tones = {
		violet: 'bg-[#f3e8ff] text-[#7c3aed]',
		sky: 'bg-[#e0f2fe] text-[#0284c7]',
		teal: 'bg-[#ccfbf1] text-[#0f766e]',
		amber: 'bg-[#fef3c7] text-[#c2410c]',
		slate: 'bg-[#f1f5f9] text-[#64748b]',
		rose: 'bg-[#ffe4e6] text-brand-pink',
	}
	return (
		<span
			className={`landing-pipeline-ico-badge flex size-11 shrink-0 items-center justify-center rounded-[11px] ${tones[props.tone ?? 'slate']} ${props.className ?? ''}`}
			aria-hidden
		>
			{props.children}
		</span>
	)
}

function HeroPipelineIllustration() {
	return (
		<div
			className="landing-preview-float relative mx-auto w-full max-w-[min(760px,calc(100vw-11rem))] shrink-0 select-none"
			aria-hidden="true"
		>
			<div className="flex min-h-[308px] w-full flex-nowrap items-center gap-8 xl:gap-11">
				{/* Left column — stacked “raw data” bubbles; straight‑edge with light glass + tiny vertical drift */}
				<div className="flex w-[min(17.25rem,100%)] shrink-0 flex-col gap-[0.65rem]" aria-hidden>
					<div className="landing-pipeline-bubble landing-pipeline-bubble-ease-d1 flex w-full items-start gap-[0.72rem] rounded-2xl px-[0.92rem] py-[0.75rem]">
						<IcoBadge tone="violet">
							<IcoUser />
						</IcoBadge>
						<div className="flex min-w-0 flex-1 flex-col gap-[0.42rem]">
							<span className="flex items-center gap-[7px]" aria-hidden>
								<PhCapsule weight="muted" className="w-[33%]" h="h-[6px]" />
								<PhCapsule className="max-w-none flex-1" h="h-[12px]" />
							</span>
							<PhCapsule className="max-w-none w-full" />
							<PhCapsule weight="muted" className="max-w-none w-[96%]" h="h-[5px]" />
							<PhCapsule weight="faint" className="max-w-none w-[81%]" h="h-[4px]" />
							<span className="flex flex-wrap items-center gap-[5px] pt-0.5" aria-hidden>
								<PhCapsule weight="chip" className="h-[12px] w-[3.125rem]" />
								<PhCapsule weight="chip" className="h-[12px] w-[2.25rem]" />
								<PhCapsule weight="chip" className="h-[12px] w-[3.5rem]" />
								<PhCapsule weight="muted" className="h-[10px] w-8" />
							</span>
							<span className="flex items-center gap-2 pt-0.5" aria-hidden>
								<PhCapsule weight="muted" className="max-w-none w-[71%]" h="h-[5px]" />
								<PhCapsule className="max-w-none flex-1" h="h-[4px]" />
							</span>
							<div className="flex flex-col gap-1 border-l-[2px] border-[rgb(38_36_35/0.26)] pl-2 pt-0.5" aria-hidden>
								<PhCapsule className="max-w-none w-full" h="h-[5px]" />
								<PhCapsule weight="muted" className="max-w-none w-[92%]" h="h-[4px]" />
								<PhCapsule weight="faint" className="max-w-none w-[67%]" h="h-[4px]" />
							</div>
						</div>
					</div>
					<div className="landing-pipeline-bubble landing-pipeline-bubble-wash landing-pipeline-bubble-ease-d2 flex w-full items-start gap-[0.72rem] rounded-[1.05rem] px-[1rem] py-[0.78rem]">
						<IcoBadge tone="sky">
							<IcoBriefcase />
						</IcoBadge>
						<div className="flex min-w-0 flex-1 flex-col gap-[0.38rem]">
							<span className="flex items-start gap-2" aria-hidden>
								<span className="mt-[4px] h-[10px] w-[10px] shrink-0 rounded-[3px] bg-[rgb(38_36_35/0.9)]" aria-hidden />
								<div className="flex min-w-0 flex-1 flex-col gap-[6px]">
									<PhCapsule className="max-w-none w-full" h="h-[7px]" />
									<PhCapsule weight="muted" className="max-w-none w-[88%]" h="h-[5px]" />
									<PhCapsule weight="faint" className="max-w-none w-[72%]" h="h-[4px]" />
								</div>
							</span>
							<span className="flex items-start gap-2 pl-0.5 pt-0.5" aria-hidden>
								<span className="mt-[4px] h-[10px] w-[10px] shrink-0 rounded-[3px] bg-[rgb(62_58_56/0.88)]" aria-hidden />
								<div className="flex min-w-0 flex-1 flex-col gap-[5px]">
									<PhCapsule className="max-w-none w-[98%]" h="h-[6px]" />
									<PhCapsule weight="muted" className="max-w-none w-full" h="h-[5px]" />
									<PhCapsule weight="faint" className="max-w-none w-[58%]" h="h-[4px]" />
								</div>
							</span>
							<div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 pl-1 pt-0.5" aria-hidden>
								{[52, 44, 36, 30, 24].map((w) => (
									<PhCapsule
										key={w}
										weight="chip"
										style={{ width: `${w}px` }}
										h="h-[10px]"
										className="max-w-none"
									/>
								))}
							</div>
							<div className="flex items-center gap-2 pt-1" aria-hidden>
								<PhCapsule className="max-w-none flex-1" h="h-[5px]" />
								<PhCapsule weight="muted" className="max-w-none w-[28%]" h="h-[4px]" />
							</div>
							<PhCapsule weight="muted" className="max-w-none w-[90%]" h="h-[4px]" />
						</div>
					</div>
					<div className="landing-pipeline-bubble landing-pipeline-bubble-ease-d3 flex w-full items-start gap-[0.72rem] rounded-2xl px-[0.88rem] py-[0.74rem] shadow-[inset_0_1px_0_rgb(255_255_255/0.5)]">
						<IcoBadge tone="teal">
							<IcoGrad />
						</IcoBadge>
						<div className="flex min-w-0 flex-1 flex-col gap-[6px]">
							<span className="flex items-center gap-[7px]" aria-hidden>
								<span className="h-[11px] w-[11px] shrink-0 rounded-full bg-[rgb(38_36_35/0.88)] ring-2 ring-[rgb(255_255_255/0.22)]" aria-hidden />
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<PhCapsule className="max-w-none w-full" h="h-[6px]" />
									<PhCapsule weight="muted" className="max-w-none w-[58%]" h="h-[4px]" />
								</div>
							</span>
							<PhCapsule className="max-w-none w-full" h="h-[7px]" />
							<PhCapsule weight="muted" className="max-w-none w-[94%]" h="h-[5px]" />
							<div className="flex flex-wrap items-center gap-1.5" aria-hidden>
								<PhCapsule weight="chip" className="h-[10px] w-[2.25rem]" />
								<PhCapsule weight="chip" className="h-[10px] w-[1.875rem]" />
								<PhCapsule weight="muted" className="h-[9px] w-[1.5rem]" />
							</div>
							<PhCapsule weight="faint" className="max-w-none w-[76%]" h="h-[4px]" />
							<span className="flex items-center gap-1 pl-px pt-0.5" aria-hidden>
								<PhCapsule weight="faint" className="max-w-none w-[11%]" h="h-[3px]" />
								<PhCapsule weight="muted" className="max-w-none flex-1" h="h-[4px]" />
								<PhCapsule weight="faint" className="max-w-none w-[18%]" h="h-[3px]" />
							</span>
							<div className="ml-1.5 flex flex-col gap-1 border-l border-[rgb(38_36_35/0.22)] pl-2" aria-hidden>
								<PhCapsule className="max-w-none w-full" h="h-[5px]" />
								<PhCapsule weight="muted" className="max-w-none w-[84%]" h="h-[4px]" />
								<PhCapsule weight="faint" className="max-w-none w-[47%]" h="h-[3px]" />
							</div>
						</div>
					</div>
					<div className="landing-pipeline-bubble landing-pipeline-bubble-wash-deep landing-pipeline-bubble-ease-d4 flex w-full items-start gap-[0.72rem] rounded-[14px] px-[0.92rem] py-[0.76rem]">
						<IcoBadge tone="amber">
							<IcoCube />
						</IcoBadge>
						<div className="flex min-w-0 flex-1 flex-col gap-[0.38rem]">
							<PhCapsule className="max-w-none w-[92%]" h="h-[8px]" />
							<PhCapsule weight="muted" className="max-w-none w-[64%]" h="h-[5px]" />
							<span className="flex items-start gap-2 pt-0.5" aria-hidden>
								<span className="h-[2.25rem] w-[14px] shrink-0 rounded-md bg-[rgb(38_36_35/0.38)]" aria-hidden />
								<div className="flex min-w-0 flex-1 flex-col gap-[5px]">
									<PhCapsule className="max-w-none w-full" />
									<PhCapsule weight="muted" className="max-w-none w-[95%]" h="h-[5px]" />
									<PhCapsule weight="muted" className="max-w-none w-[78%]" h="h-[5px]" />
									<PhCapsule weight="faint" className="max-w-none w-[66%]" h="h-[4px]" />
									<PhCapsule weight="faint" className="max-w-none w-[52%]" h="h-[4px]" />
								</div>
							</span>
							<div className="flex flex-wrap items-center gap-1.5 pt-0.5" aria-hidden>
								<PhCapsule weight="chip" className="h-[10px] w-[3.25rem]" />
								<PhCapsule weight="chip" className="h-[10px] w-[2.125rem]" />
								<PhCapsule weight="muted" className="h-[9px] w-[2.5rem]" />
							</div>
							<span className="flex flex-col gap-1 pt-0.5" aria-hidden>
								<PhCapsule weight="muted" className="max-w-none w-full" h="h-[4px]" />
								<span className="flex items-center gap-2">
									<PhCapsule weight="faint" className="max-w-none w-[22%]" h="h-[4px]" />
									<PhCapsule weight="muted" className="max-w-none flex-1" h="h-[4px]" />
									<PhCapsule weight="faint" className="max-w-none w-[14%]" h="h-[3px]" />
								</span>
							</span>
						</div>
					</div>
					<div className="landing-pipeline-bubble landing-pipeline-bubble-ease-d5 flex w-full items-start gap-[0.65rem] rounded-[1.06rem] py-[0.65rem] pl-[0.82rem] pr-[0.75rem]">
						<IcoBadge tone="slate">
							<IcoCode />
						</IcoBadge>
						<div className="flex min-w-0 flex-1 flex-col gap-[7px]">
							<span className="flex flex-wrap items-center gap-x-1 gap-y-1.5" aria-hidden>
								<PhCapsule weight="chip" className="h-[11px] w-[2.125rem]" />
								<PhCapsule weight="chip" className="h-[11px] w-[1.75rem]" />
								<PhCapsule weight="chip" className="h-[11px] w-[2.375rem]" />
								<PhCapsule weight="chip" className="h-[11px] w-[1.5rem]" />
								<PhCapsule weight="muted" className="h-[10px] w-3" />
								<PhCapsule weight="chip" className="h-[11px] w-[1.875rem]" />
								<PhCapsule weight="chip" className="h-[11px] w-7" />
							</span>
							<PhCapsule className="max-w-none w-full" h="h-[7px]" />
							<PhCapsule weight="muted" className="max-w-none w-[96%]" h="h-[5px]" />
							<span className="flex items-start gap-2" aria-hidden>
								<span className="mt-[7px] h-[2.5rem] w-[8px] shrink-0 rounded-sm bg-[rgb(38_36_35/0.58)]" aria-hidden />
								<div className="flex min-w-0 flex-1 flex-col gap-[5px] pt-px">
									<PhCapsule className="max-w-none w-full" h="h-[5px]" />
									<PhCapsule weight="muted" className="max-w-none w-[97%]" h="h-[5px]" />
									<PhCapsule weight="muted" className="max-w-none w-[82%]" h="h-[4px]" />
									<PhCapsule weight="faint" className="max-w-none w-[69%]" h="h-[4px]" />
									<PhCapsule weight="faint" className="max-w-none w-[54%]" h="h-[4px]" />
								</div>
							</span>
							<span className="flex items-start gap-[7px] pl-4" aria-hidden>
								<span className="mt-[6px] h-[13px] w-[7px] shrink-0 rounded-sm bg-[rgb(38_36_35/0.78)]" aria-hidden />
								<div className="flex min-w-0 flex-1 flex-col gap-1 pt-px">
									<PhCapsule className="max-w-none w-[93%]" h="h-[4px]" />
									<PhCapsule weight="muted" className="max-w-none w-[76%]" h="h-[4px]" />
									<PhCapsule weight="faint" className="max-w-none w-[62%]" h="h-[3px]" />
								</div>
							</span>
						</div>
						<span className="flex size-[1.575rem] shrink-0 items-center justify-center rounded-lg bg-[rgb(254_251_239/0.95)] shadow-[inset_0_0_0_1px_rgb(254_230_169/0.55)] ring-4 ring-transparent">
							<IcoStar className="size-[13px] text-[#eab308]" aria-hidden />
						</span>
					</div>
				</div>

				<div className="relative flex shrink-0 items-center justify-center" style={{ width: 'clamp(3.625rem,6.5vw,5.125rem)' }}>
					<svg className="h-[min(310px,44vh)] w-full text-white" viewBox="0 0 88 324" preserveAspectRatio="xMidYMid meet" aria-hidden>
						<path
							className="landing-pipeline-swoosh"
							d="M12 54 C52 126 76 154 74 214"
							fill="none"
							stroke="currentColor"
							strokeWidth={2.75}
							strokeLinecap="round"
						/>
						<path
							className="landing-pipeline-swoosh-reverse"
							d="M12 274 C54 218 74 174 74 134"
							fill="none"
							stroke="currentColor"
							strokeWidth={2.5}
							strokeLinecap="round"
						/>
						<path
							className="landing-pipeline-dot-trail"
							d="M28 154 C54 154 74 154 74 154"
							fill="none"
							stroke="rgba(255,255,255,0.5)"
							strokeWidth={1.25}
							strokeLinecap="round"
							opacity={0.95}
						/>
						<path
							className="landing-pipeline-dash"
							strokeLinecap="round"
							d="M20 154 L74 154"
							stroke="rgba(254,246,239,0.88)"
							strokeWidth={2}
						/>
						<polygon fill="rgba(254,246,239,0.98)" stroke="rgba(255,255,255,0.42)" strokeWidth={1} points="58,154 74,146 74,162" />
						<polygon fill="rgb(214,86,86)" opacity={0.92} points="60,154 74,148 74,160" />
					</svg>
				</div>

				<div className="relative min-w-[268px] flex-[1.15] xl:min-w-[300px]">
					<div className="landing-pipeline-output-glow pointer-events-none absolute inset-[-10%] rounded-[26px]" aria-hidden />
					<PipelineSparkle className="landing-pipeline-spark-a pointer-events-none absolute -right-0.5 top-[5%] z-30 size-[1.9rem]" />
					<PipelineSparkle className="landing-pipeline-spark-b pointer-events-none absolute -right-[2px] top-[41%] z-30 size-[1.375rem] text-purple-400/95" />
					<PipelineSparkle className="landing-pipeline-spark-c pointer-events-none absolute bottom-[17%] right-4 z-30 size-5 text-brand-pink" />
					<div className="relative z-[1] overflow-hidden rounded-[18px] border border-neutral-200/85 bg-[#fdfcfa] shadow-[0_8px_32px_-6px_rgb(24_24_27_/_0.08)]">
						<div className="absolute right-8 top-[1.35rem] z-30 flex size-10 items-center justify-center rounded-full border border-neutral-100/90 bg-[#fdfcfb] shadow-sm">
							<IcoCheck className="size-[1.0625rem] stroke-[3] text-brand-pink" aria-hidden />
						</div>
						<div className="flex min-h-[290px]">
							<div className="flex w-20 shrink-0 flex-col border-r border-neutral-200/85 bg-neutral-50/60 py-9 lg:w-[5.125rem]" aria-hidden>
								<span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-[#ede9fe] text-[#7c3aed] ring-[3px] ring-white">
									<IcoUser className="size-[1.45rem]" />
								</span>
								<div className="mt-14 flex flex-col items-center gap-[1.625rem]">
									<span className="landing-pipeline-sb-chip flex size-[2.475rem] items-center justify-center rounded-[10px] bg-[#ccfbf1]">
										<IcoGrad className="size-[1.085rem] text-[#0f766e]" />
									</span>
									<span className="landing-pipeline-sb-chip flex size-[2.475rem] items-center justify-center rounded-[10px] bg-[#e0f2fe]">
										<IcoBriefcase className="size-[1.085rem] text-[#0369a1]" />
									</span>
									<span className="landing-pipeline-sb-chip flex size-[2.475rem] items-center justify-center rounded-[10px] bg-[#f1f5f9]">
										<IcoCode className="size-[1.085rem] text-[#475569]" />
									</span>
									<span className="landing-pipeline-sb-chip flex size-[2.475rem] items-center justify-center rounded-[10px] bg-[#ffe4e6]">
										<IcoStar className="size-[1.085rem] text-brand-pink" />
									</span>
								</div>
							</div>
							<div className="min-w-0 flex-1 space-y-5 pb-14 pl-[1.5rem] pr-12 pt-11 lg:pl-[1.75rem] lg:pr-[3.5rem]" aria-hidden>
								<div className="space-y-[0.55rem]">
									<span className="block h-2 w-[46%] max-w-[10.5rem] rounded-md bg-neutral-900/[0.74]" aria-hidden />
									<span className="block h-[5px] w-[88%] max-w-[17rem] rounded-full bg-neutral-200/92" aria-hidden />
									<span className="block h-[5px] w-[58%] max-w-[13rem] rounded-full bg-neutral-100" aria-hidden />
								</div>
								<div className="h-px rounded-full bg-neutral-200/85" aria-hidden />
								<section className="space-y-4" aria-hidden>
									<span className="flex max-w-[6.125rem]" aria-hidden>
										<span className="block h-[7px] w-full rounded-[4px] bg-brand-pink/65" aria-hidden />
									</span>
									<div className="space-y-[10px] border-l-[2.75px] border-brand-pink/18 pl-[0.975rem]">
										<span className="flex items-start gap-2 pt-px">
											<span className="relative top-[3px] block size-[5px] shrink-0 rounded-full bg-neutral-300" aria-hidden />
											<span className="block h-[4px] w-full max-w-[17rem] rounded-full bg-neutral-200/94" aria-hidden />
										</span>
										<span className="flex items-start gap-2">
											<span className="relative top-[3px] block size-[5px] shrink-0 rounded-full bg-neutral-300" aria-hidden />
											<span className="block h-[4px] w-[93%] max-w-[17rem] rounded-full bg-neutral-100" aria-hidden />
										</span>
										<span className="flex items-start gap-2">
											<span className="relative top-[3px] block size-[5px] shrink-0 rounded-full bg-neutral-300" aria-hidden />
											<span className="block h-[4px] w-[71%] max-w-[17rem] rounded-full bg-neutral-100" aria-hidden />
										</span>
									</div>
								</section>
								<section className="space-y-4" aria-hidden>
									<span className="flex max-w-[7.375rem]" aria-hidden>
										<span className="block h-[6px] w-full rounded-[4px] bg-brand-pink/38" aria-hidden />
									</span>
									<div className="space-y-[10px] border-l-[2.75px] border-brand-pink/[0.09] pl-[0.975rem]">
										<span className="flex items-start gap-2 pt-px">
											<span className="relative top-[3px] block size-[5px] shrink-0 rounded-full bg-neutral-300" aria-hidden />
											<span className="block h-[4px] w-full max-w-[17rem] rounded-full bg-neutral-200/90" aria-hidden />
										</span>
										<span className="flex items-start gap-2">
											<span className="relative top-[3px] block size-[5px] shrink-0 rounded-full bg-neutral-300" aria-hidden />
											<span className="block h-[4px] w-[84%] max-w-[17rem] rounded-full bg-neutral-100" aria-hidden />
										</span>
									</div>
								</section>
								<section className="space-y-4" aria-hidden>
									<span className="flex max-w-[5.25rem]" aria-hidden>
										<span className="block h-[6px] w-full rounded-[4px] bg-brand-pink/[0.22]" aria-hidden />
									</span>
									<div className="space-y-[10px] border-l-[2.75px] border-brand-pink/[0.09] pl-[0.975rem]">
										<span className="flex items-start gap-2 pt-px">
											<span className="relative top-[3px] block size-[5px] shrink-0 rounded-full bg-neutral-300" aria-hidden />
											<span className="block h-[4px] w-full max-w-[17rem] rounded-full bg-neutral-200/90" aria-hidden />
										</span>
										<span className="flex items-start gap-2">
											<span className="relative top-[3px] block size-[5px] shrink-0 rounded-full bg-neutral-300" aria-hidden />
											<span className="block h-[4px] w-[92%] max-w-[17rem] rounded-full bg-neutral-100" aria-hidden />
										</span>
										<span className="flex items-start gap-2">
											<span className="relative top-[3px] block size-[5px] shrink-0 rounded-full bg-neutral-300" aria-hidden />
											<span className="block h-[4px] w-[76%] max-w-[17rem] rounded-full bg-neutral-100" aria-hidden />
										</span>
									</div>
								</section>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function Landing() {
	const navigate = useNavigate()
	return (
		<div
			className="landing-scrollbar min-h-screen overflow-y-auto bg-cream"
			style={{ height: '100vh', overflowY: 'auto' }}
		>
			{/* One full viewport of brand + hero before cream sections — avoids a stripe of bg-cream on first paint */}
			<div className="flex min-h-[100dvh] flex-col">
				{/* Slim product bar — solid brand tint (no hero mesh) so it reads calm next to SaaS-heavy pages */}
				<header className="sticky top-0 z-50 shrink-0 border-b border-black/[0.06] bg-brand-pink text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]">
					<div className="mx-auto flex max-w-[min(1280px,96vw)] items-center justify-between gap-4 px-4 py-2.5 md:px-6 md:py-3 xl:px-10">
						<button
							type="button"
							onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
							className="shrink-0 rounded-lg px-0.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-pink"
							aria-label={`${BRAND_NAME} — top of page`}
						>
							<img
								src={resolveLogo('navbar')}
								alt={BRAND_NAME}
								className="h-8 w-auto max-w-[10.5rem] object-contain object-left opacity-[0.98] md:h-[2.35rem]"
								decoding="async"
								fetchPriority="high"
							/>
						</button>
						<nav className="flex items-center gap-2 sm:gap-2.5" aria-label="Account">
							<button
								type="button"
								onClick={() => navigate('/auth')}
								className="rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white/92 transition hover:bg-white/[0.1] hover:text-white sm:text-[13px] sm:normal-case sm:tracking-normal sm:font-medium"
							>
								Sign in
							</button>
							<button
								type="button"
								onClick={() => navigate('/auth')}
								className="rounded-full border border-white/25 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand-pink shadow-sm transition hover:border-white/45 hover:bg-cream hover:shadow md:text-[13px] md:normal-case md:tracking-normal"
							>
								Get started
							</button>
						</nav>
					</div>
				</header>

				<section className="landing-hero-mesh relative flex min-h-0 flex-1 flex-col overflow-hidden text-white">
					<div className="landing-hero-orb pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
					<div className="landing-hero-orb-delayed pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
					<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.02),transparent_35%,rgba(0,0,0,0.06))]" />

					<div className="relative mx-auto flex min-h-0 w-full max-w-[min(1280px,96vw)] flex-1 flex-col justify-center px-4 py-10 md:px-6 md:py-14 xl:px-10">
						<div className="grid gap-14 lg:grid-cols-[minmax(0,0.72fr)_minmax(440px,1.52fr)] lg:items-center lg:gap-16 xl:gap-[5.75rem]">
							<div className="animate-fade-in min-w-0 max-w-xl text-center lg:max-w-[22.5rem] lg:text-left xl:max-w-[23.5rem]">
								<p className="mb-4 inline-flex items-center rounded-full border border-white/22 bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/92 backdrop-blur-[2px] md:text-xs md:tracking-[0.16em]">
									Your experience, framed for the role
								</p>
								<h1 className="mb-5 text-[2.75rem] font-bold leading-[1.07] tracking-tight sm:text-5xl md:text-6xl lg:text-[3.5rem]">
									Tell your story right.
								</h1>
								<p className="mx-auto mb-8 max-w-xl text-lg font-normal leading-relaxed text-white/[0.93] md:text-xl lg:mx-0 lg:max-w-none">
									Turn real roles and wins into a clear narrative — then ship a résumé and exports that stay true to it,
									layout included.
								</p>
								<div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
									<button
										type="button"
										onClick={() => navigate('/auth')}
										className="w-full rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-brand-pink shadow-lg transition hover:-translate-y-0.5 hover:bg-cream hover:shadow-xl sm:w-auto"
									>
										Start free
									</button>
									<button
										type="button"
										onClick={() =>
											document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
										}
										className="w-full rounded-xl border border-white/40 bg-white/5 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 sm:w-auto"
									>
										See what&apos;s inside
									</button>
								</div>
								<dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-8 text-center text-sm sm:text-base lg:text-left">
									<div>
										<dt className="text-white/60">Templates</dt>
										<dd className="mt-1 font-semibold tabular-nums">Curated</dd>
									</div>
									<div>
										<dt className="text-white/60">Exports</dt>
										<dd className="mt-1 font-semibold">PDF &amp; Word</dd>
									</div>
									<div>
										<dt className="text-white/60">Edge</dt>
										<dd className="mt-1 font-semibold">ATS-aware</dd>
									</div>
								</dl>
							</div>

							<div className="relative flex min-w-0 justify-center lg:justify-end xl:-mr-[1%]">
								<HeroPipelineIllustration />
							</div>
						</div>
					</div>
				</section>
			</div>

			<main className="bg-cream">
				<section
					id="features"
					className="border-b border-gray-200/60 py-20 md:py-28"
				>
					<div className="mx-auto max-w-6xl px-5 md:px-8">
						<div className="mx-auto mb-14 max-w-2xl text-center md:mb-20">
							<h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
								Everything you need, nothing you don&apos;t
							</h2>
							<p className="mt-4 text-lg text-gray-600">
								A calm editor, consistent typography, and exports that match what you preview.
							</p>
						</div>

						<div className="grid gap-5 md:grid-cols-12 md:gap-6">
							<div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm transition duration-300 hover:border-brand-pink/25 hover:shadow-md md:col-span-7 md:p-10">
								<div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-pink/[0.06] transition group-hover:bg-brand-pink/[0.09]" />
								<div className="relative">
									<div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
										<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
									</div>
									<h3 className="text-xl font-bold text-gray-900 md:text-2xl">Resumes that read clean</h3>
									<p className="mt-3 max-w-md text-gray-600 leading-relaxed">
										Tight hierarchy, sensible spacing, and structure recruiters scan in seconds — not a wall of text.
									</p>
								</div>
							</div>

							<div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm transition duration-300 hover:border-brand-pink/25 hover:shadow-md md:col-span-5 md:p-10">
								<div className="absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-brand-pink/[0.05]" />
								<div className="relative">
									<div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
										<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
										</svg>
									</div>
									<h3 className="text-xl font-bold text-gray-900 md:text-2xl">WYSIWYG, actually</h3>
									<p className="mt-3 text-gray-600 leading-relaxed">
										What you refine in the builder is what you ship — fewer surprises after export.
									</p>
								</div>
							</div>

							<div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white to-cream-darker/40 p-8 shadow-sm transition duration-300 hover:border-brand-pink/25 hover:shadow-md md:col-span-5 md:p-10">
								<div className="relative">
									<div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
										<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
										</svg>
									</div>
									<h3 className="text-xl font-bold text-gray-900 md:text-2xl">Portfolio, organized</h3>
									<p className="mt-3 text-gray-600 leading-relaxed">
										Projects, education, and highlights in a single narrative — easy to reorder and tune.
									</p>
								</div>
							</div>

							<div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm transition duration-300 hover:border-brand-pink/25 hover:shadow-md md:col-span-7 md:p-10">
								<div className="relative flex flex-col md:flex-row md:items-center md:gap-10">
									<div className="flex-1">
										<div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
											<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
											</svg>
										</div>
										<h3 className="text-xl font-bold text-gray-900 md:text-2xl">On-brand, under control</h3>
										<p className="mt-3 max-w-lg text-gray-600 leading-relaxed">
											Tokens and templates keep fonts, spacing, and accents cohesive — polish without a design degree.
										</p>
									</div>
									<div className="mt-8 flex shrink-0 flex-wrap gap-2 md:mt-0 md:justify-end">
										{['Spacing', 'Type', 'Accent'].map((label) => (
											<span
												key={label}
												className="rounded-lg border border-gray-200 bg-cream/80 px-3 py-1.5 text-xs font-medium text-gray-700"
											>
												{label}
											</span>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section className="py-20 md:py-28">
					<div className="mx-auto max-w-6xl px-5 md:px-8">
						<div className="rounded-3xl border border-gray-200/80 bg-white px-8 py-14 shadow-sm md:px-14 md:py-16">
							<div className="mx-auto mb-12 max-w-xl text-center">
								<h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
									Three steps to shipped
								</h2>
								<p className="mt-3 text-gray-600">
									No blank-page paralysis — move straight from outline to export.
								</p>
							</div>

							<ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
								<div className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent md:block" aria-hidden="true" />
								{[
									{ step: '01', title: 'Account', body: 'Sign in and pick a layout that fits your field.' },
									{ step: '02', title: 'Compose', body: 'Drop in experience, projects, and proof — we handle the rhythm.' },
									{ step: '03', title: 'Export', body: 'Download PDF or Word when it feels right. Iterate anytime.' },
								].map(({ step, title, body }) => (
									<li key={step} className="relative text-center md:text-left">
										<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-pink to-brand-pink-dark text-lg font-bold text-white shadow-md ring-4 ring-cream md:mx-0">
											{step}
										</div>
										<h3 className="text-lg font-bold text-gray-900">{title}</h3>
										<p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">{body}</p>
									</li>
								))}
							</ol>
						</div>
					</div>
				</section>

				<section className="landing-hero-mesh relative overflow-hidden py-20 text-white md:py-24">
					<div className="pointer-events-none absolute inset-0 bg-black/10" />
					<div className="relative mx-auto max-w-3xl px-5 text-center md:px-8">
						<h2 className="text-3xl font-bold tracking-tight md:text-4xl">
							Ready when you are
						</h2>
						<p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
							Build something you&apos;re happy to attach — crisp, current, and unmistakably yours.
						</p>
						<button
							type="button"
							onClick={() => navigate('/auth')}
							className="mt-10 rounded-xl bg-white px-10 py-4 text-base font-semibold text-brand-pink shadow-lg transition hover:-translate-y-0.5 hover:bg-cream hover:shadow-xl"
						>
							Create your workspace
						</button>
					</div>
				</section>
			</main>

			<footer className="border-t border-gray-800 bg-gray-950 py-12 text-white">
				<div className="mx-auto max-w-6xl px-5 md:px-8">
					<div className="flex flex-col items-center justify-between gap-6 md:flex-row">
						<div className="text-center md:text-left">
							<p className="text-lg font-semibold tracking-tight">taylor.io</p>
							<p className="mt-1 text-sm text-white/60">
								Professional documents, tailored to how you work.
							</p>
						</div>
						<button
							type="button"
							onClick={() => navigate('/auth')}
							className="text-sm font-medium text-brand-pink-light transition hover:text-white"
						>
							Get started →
						</button>
					</div>
					<div className="mt-10 border-t border-white/10 pt-8 text-center text-xs text-white/45 md:text-left">
						© 2026 taylor.io. All rights reserved.
					</div>
				</div>
			</footer>
		</div>
	)
}

export default Landing
