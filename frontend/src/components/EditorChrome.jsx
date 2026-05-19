import { useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { BRAND_NAME, resolveLogo } from '@/utils/logoMap'

/** Slim red strip at top of left panel — logo + back to build flow. */
export default function EditorChrome() {
	const navigate = useNavigate()
	const location = useLocation()
	const isTailorPreview = location.pathname === '/resume/preview' && location.state?.createMode === 'tailor'

	const handleBack = () => {
		if (isTailorPreview) {
			navigate('/resume/create/tailor', {
				state: {
					fromPreview: true,
					tailorIntent: location.state?.tailorIntent || null,
				},
			})
			return
		}

		navigate('/resume/create')
	}

	return (
		<div className="-ml-8 -mr-4 -mt-8 mb-4 flex min-h-[2.35rem] items-center justify-between gap-3 border-b border-black/10 bg-[#9f3a40] px-8 py-1.5 shadow-[0_8px_20px_-16px_rgba(60,12,18,0.55)]">
			<button
				type="button"
				onClick={() => navigate('/home')}
				className="flex shrink-0 items-center rounded-md bg-[#9f3a40] px-1.5 py-0.5 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#9f3a40]"
				aria-label={`${BRAND_NAME} home`}
			>
				<img
					src={resolveLogo('navbar')}
					alt=""
					decoding="async"
					className="h-6 w-auto max-w-[5.75rem] object-contain object-left brightness-0 invert"
				/>
			</button>

			<button
				type="button"
				onClick={handleBack}
				className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[0.7rem] font-bold text-white/90 transition hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#9f3a40]"
			>
				<FontAwesomeIcon icon={faArrowLeft} className="size-2.5 opacity-85" aria-hidden />
				{isTailorPreview ? 'Tailor setup' : 'Build options'}
			</button>
		</div>
	)
}
