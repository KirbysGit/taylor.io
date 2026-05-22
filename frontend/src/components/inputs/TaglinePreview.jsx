import React from 'react'
import { parseTaglineRuns } from '@/utils/taglineMarkup'

/**
 * Live preview of tagline markup (matches resume tagline rendering closely).
 */
const TaglinePreview = ({ value, className = '' }) => {
	const runs = parseTaglineRuns(value || '')
	const empty = !(value || '').trim()

	return (
		<div
			className={`flex min-h-[4.5rem] flex-col justify-center rounded-xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 text-center ${className}`}
			aria-live="polite"
		>
			{empty ? (
				<p className="m-0 text-sm italic text-slate-400">Your formatted line will show up here.</p>
			) : (
				<p
					className="m-0 max-w-full break-words text-sm leading-snug text-slate-900"
					style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
				>
					{runs.map(([text, bold, italic, underline], i) => {
						let el = text
						if (italic) el = <em className="italic">{el}</em>
						if (bold) el = <strong className="font-bold">{el}</strong>
						if (underline) el = <u className="underline underline-offset-2 decoration-1">{el}</u>
						return (
							<span key={i} className="inline">
								{el}
							</span>
						)
					})}
				</p>
			)}
		</div>
	)
}

export default TaglinePreview
