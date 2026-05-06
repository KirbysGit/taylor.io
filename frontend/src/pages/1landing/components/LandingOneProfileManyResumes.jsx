// One profile, many resumes — scaffolding the left-side layout first

import { faBriefcase, faCode, faGraduationCap, faStar, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const pinkWell = {
	box: 'bg-brand-pink-lighter/55 ring-1 ring-brand-pink/15',
	icon: 'text-brand-pink-dark',
}

function SavedProfileMock() {
	const rows = [
		{ label: 'Experience', icon: faBriefcase },
		{ label: 'Education', icon: faGraduationCap },
		{ label: 'Projects', icon: faCode },
		{ label: 'Skills', icon: faStar },
	]

	return (
		<div
			aria-hidden
			className="w-full max-w-[520px] rounded-[28px] border border-gray-200/80 bg-white-bright p-6 shadow-[0_0_0_1px_rgba(214,86,86,0.06),0_22px_64px_-28px_rgba(214,86,86,0.24)] sm:p-7"
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex min-w-0 items-start gap-3">
					<span className={`mt-0.5 inline-flex size-10 items-center justify-center rounded-2xl ${pinkWell.box}`}>
						<FontAwesomeIcon icon={faUser} className={`size-4 ${pinkWell.icon}`} aria-hidden />
					</span>
					<div className="min-w-0">
						<div className="text-sm font-semibold text-brand-pink">Your saved profile</div>
						<div className="mt-1.5 inline-flex items-center gap-2 rounded-full border border-brand-pink/20 bg-brand-pink-lighter/30 px-2.5 py-0.5 text-[11px] font-semibold text-brand-pink-dark">
							<span className="size-1.5 rounded-full bg-brand-pink" aria-hidden />
							Single source of truth
						</div>
					</div>
				</div>
				<div className="mt-1 h-8 w-16 rounded-2xl bg-gray-900/5" />
			</div>

			<div className="mt-6 space-y-4">
				{rows.map((r) => (
					<div key={r.label} className="rounded-2xl border border-gray-200/60 bg-white/60 px-4 py-3">
						<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
							<div className="min-w-0">
								<div className="h-2 w-28 rounded-full bg-gray-900/10" />
								<div className="mt-2 h-2 w-20 rounded-full bg-gray-900/10" />
							</div>

							{/* Icon sits visually “in the middle” of the row, like the mock. */}
							<span className={`inline-flex size-10 items-center justify-center rounded-2xl ${pinkWell.box}`}>
								<FontAwesomeIcon icon={r.icon} className={`size-4 ${pinkWell.icon}`} aria-hidden />
							</span>

							<div className="min-w-0 text-right">
								<div className="text-[13px] font-semibold tracking-tight text-gray-900/80">{r.label}</div>
								<div className="mt-2 h-2 w-[86%] rounded-full bg-gray-200/70 ml-auto" />
								<div className="mt-2 h-2 w-[62%] rounded-full bg-gray-200/55 ml-auto" />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

export default function LandingOneProfileManyResumes() {
	return (
		<section
			id="one-profile-many-resumes"
			aria-labelledby="one-profile-many-resumes-heading"
			className="border-t border-gray-200/65 bg-cream py-16 md:py-20"
		>
			<div className="mx-auto max-w-[min(1280px,94vw)] px-3 sm:px-4 md:px-5">
				{/* Layout scaffold (desktop): left content in cols 1-5; right illustration in cols 6-12. */}
				<div className="border border-red-500 items-start gap-10">
					{/* Left scaffold uses “thirds”: 3 columns × 3 rows on desktop. */}
					<div className="grid border border-blue-500 grid-cols-3 gap-8 lg:grid-cols-3 lg:grid-rows-3 lg:gap-3">
						<div className=" border border-green-500 lg:col-span-2 lg:row-span-1">
							<h2
								id="one-profile-many-resumes-heading"
								className="text-pretty text-[2.5rem] font-bold leading-[1.06] tracking-tight text-gray-900 sm:text-[2.5rem] md:text-[2.9rem]"
							>
								You are more than one résumé.
							</h2>
							<div className="lg:col-span-2 lg:row-span-2">
							<p className="max-w-xl pt-3 text-[1.02rem] leading-relaxed text-gray-600 md:text-[1.06rem]">
								Different opportunities need different versions of your experience. <br />
								Keep your career data organized once,
								then let Tailor shape the right details for each role.
							</p>
						</div>
						</div>

						<div className=" border border-green-500 lg:col-span-1 lg:col-start-1 lg:row-span-2 lg:row-start-2 lg:self-start">
							<div className="lg:pt-1">
								<SavedProfileMock />
							</div>
						</div>
					</div>

				</div>
			</div>
		</section>
	)
}

