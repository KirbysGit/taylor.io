import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'

const ProfileSectionCard = ({
	title,
	description,
	children,
	/** Renders top-right in the header (e.g. + Add education). Replaces Auto-saves when set. */
	headerAction = null,
	showAutoSaveBadge = true,
	/** Hide “Profile section” eyebrow for a cleaner section header (e.g. Education mock). */
	hideEyebrow = false,
}) => {
	const showBadge = showAutoSaveBadge && !headerAction

	return (
		<section className="relative overflow-hidden rounded-[1.35rem] border border-brand-pink/18 bg-white p-5 shadow-[0_18px_42px_-26px_rgba(80,42,42,0.46)] ring-1 ring-white sm:p-6">
			<div
				className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_12%_0%,rgba(250,205,205,0.34),transparent_42%),linear-gradient(180deg,rgba(255,248,239,0.8),transparent)]"
				aria-hidden
			/>
			<div className="relative z-[1] mb-5 flex flex-col gap-4 border-b border-brand-pink/10 pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
				<div className="min-w-0 flex-1">
					{!hideEyebrow ? (
						<p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-brand-pink-dark">
							Profile section
						</p>
					) : null}
					<h2
						className={`font-bold tracking-tight text-slate-900 ${hideEyebrow ? 'text-2xl' : 'mt-1 text-xl font-black text-gray-950'}`}
					>
						{title}
					</h2>
					{description ? (
						<p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
					) : null}
				</div>
				{(headerAction || showBadge) && (
					<div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
						{headerAction}
						{showBadge ? (
							<span className="inline-flex self-end rounded-full bg-gradient-to-r from-brand-pink/45 via-brand-pink-lighter to-brand-pink/18 p-px">
								<span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-pink-dark">
									<FontAwesomeIcon icon={faCheck} className="size-3 opacity-90" aria-hidden />
									Auto-saves
								</span>
							</span>
						) : null}
					</div>
				)}
			</div>
			<div className="relative z-[1]">{children}</div>
		</section>
	)
}

export default ProfileSectionCard
