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
			className={`rounded-lg border border-gray-200 bg-white px-3 py-2.5 flex flex-col justify-center text-center shadow-inner min-h-[5rem] ${className}`}
			aria-live="polite"
		>
			{empty ? (
				<p className="text-sm text-gray-400 italic m-0">Live preview</p>
			) : (
				<p
					className="text-sm text-gray-900 m-0 leading-snug max-w-full break-words"
					style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
				>
					{runs.map(([text, bold, italic, underline], i) => {
						let el = text
						if (italic) el = <em className="italic">{el}</em>
						if (bold) el = <strong className="font-bold">{el}</strong>
						if (underline) el = <u className="underline underline-offset-2 decoration-1">{el}</u>
						return <span key={i} className="inline">{el}</span>
					})}
				</p>
			)}
		</div>
	)
}

export default TaglinePreview
