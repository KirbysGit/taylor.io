import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faCheck, faFileLines, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'

const CompleteScreen = ({ formData, handleComplete }) => {
	const [isSaving, setIsSaving] = useState(false)
	const counts = [
		{ label: 'Education', value: formData?.education?.length || 0 },
		{ label: 'Experience', value: formData?.experiences?.length || 0 },
		{ label: 'Projects', value: formData?.projects?.length || 0 },
		{ label: 'Skills', value: formData?.skills?.length || 0 },
	]

	const onFinish = async () => {
		setIsSaving(true)
		try {
			await handleComplete()
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<div className="w-full overflow-hidden rounded-[1.35rem] border border-brand-pink/14 bg-gradient-to-b from-white to-brand-pink/[0.035] p-2">
			<div className="relative overflow-hidden rounded-[1.15rem] px-6 py-8 text-center">
				<div className="pointer-events-none absolute left-1/2 top-0 size-56 -translate-x-1/2 rounded-full bg-brand-pink/[0.12] blur-3xl" aria-hidden />
				<div className="relative z-[1]">
					<span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-pink text-white shadow-[0_18px_36px_-24px_rgba(214,86,86,0.9)]">
						<FontAwesomeIcon icon={faWandMagicSparkles} className="size-7" />
					</span>
					<p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-brand-pink-dark">Profile ready</p>
					<h2 className="mx-auto mt-2 max-w-md text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
						Ready to tailor your first resume?
					</h2>
					<p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-gray-600">
						We will save your profile now. Then you can choose a template, paste a job description, and start building a sharper draft.
					</p>

					<div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
						{counts.map((item) => (
							<div key={item.label} className="rounded-2xl border border-brand-pink/12 bg-white/82 px-3 py-3 shadow-sm">
								<p className="text-xl font-black text-gray-950">{item.value}</p>
								<p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">{item.label}</p>
							</div>
						))}
					</div>

					<div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
						<FontAwesomeIcon icon={faCheck} className="size-4" />
						Your details stay editable from Profile.
					</div>

					<button
						onClick={onFinish}
						disabled={isSaving}
						className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-brand-pink px-8 py-4 text-lg font-black text-white shadow-[0_18px_36px_-24px_rgba(214,86,86,0.9)] transition hover:bg-brand-pink-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
					>
						<FontAwesomeIcon icon={faFileLines} className="size-5" />
						{isSaving ? 'Saving profile...' : 'Start tailoring'}
						<FontAwesomeIcon icon={faArrowRight} className="size-4" />
					</button>
				</div>
			</div>
		</div>
	)
}

export default CompleteScreen
