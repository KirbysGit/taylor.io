import React from 'react'

const ProfileSectionCard = ({ title, description, children }) => {
	return (
		<section className="relative overflow-hidden rounded-[1.35rem] border border-brand-pink/18 bg-white p-5 shadow-[0_18px_42px_-26px_rgba(80,42,42,0.46)] ring-1 ring-white sm:p-6">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_12%_0%,rgba(250,205,205,0.34),transparent_42%),linear-gradient(180deg,rgba(255,248,239,0.8),transparent)]" aria-hidden />
			<div className="relative z-[1] mb-5 flex flex-col gap-3 border-b border-brand-pink/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-brand-pink-dark">
						Profile section
					</p>
					<h2 className="mt-1 text-xl font-black tracking-tight text-gray-950">{title}</h2>
					<p className="mt-1 text-sm leading-relaxed text-gray-500">{description}</p>
				</div>
				<span className="hidden rounded-full bg-gradient-to-r from-brand-pink/45 via-brand-pink-lighter to-brand-pink/18 p-px sm:inline-flex">
					<span className="rounded-full bg-white px-3 py-1 text-xs font-black text-brand-pink-dark">
						Auto-saves
					</span>
				</span>
			</div>
			<div className="relative z-[1]">{children}</div>
		</section>
	)
}

export default ProfileSectionCard
