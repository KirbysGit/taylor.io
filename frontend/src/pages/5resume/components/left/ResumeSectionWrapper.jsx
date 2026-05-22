// ResumeSectionWrapper.jsx
// Shared wrapper for resume sections: visibility toggle, section label editor, collapsible content.
// Used to wrap the shared Input components (SkillsInput, EducationInput, etc.) with resume-specific chrome.

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { ChevronDown, ChevronUp } from '@/components/icons'
import SectionTitleEditor from './SectionTitleEditor'

function ResumeSectionWrapper({
	sectionKey,
	sectionLabel,
	onSectionLabelChange,
	defaultLabel,
	isVisible = true,
	onVisibilityChange,
	description,
	/** Top-right action when expanded (e.g. + Add education), aligned with description. */
	headerAction = null,
	children,
}) {
	const [isExpanded, setIsExpanded] = useState(true)

	return (
		<div className="mb-4 flex flex-col rounded-md border-2 border-brand-pink-light p-4">
			<div
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex w-full cursor-pointer items-center gap-3 transition-colors"
			>
				<SectionTitleEditor
					sectionKey={sectionKey}
					currentLabel={sectionLabel}
					onLabelChange={onSectionLabelChange}
					defaultLabel={defaultLabel}
				/>
				<div className="h-[3px] flex-1 rounded bg-gray-300" />
				{onVisibilityChange && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onVisibilityChange(!isVisible)
						}}
						className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
						aria-label={
							isVisible
								? `Hide ${sectionLabel || defaultLabel} in preview`
								: `Show ${sectionLabel || defaultLabel} in preview`
						}
						title={isVisible ? 'Hide from preview' : 'Show in preview'}
					>
						<FontAwesomeIcon icon={isVisible ? faEye : faEyeSlash} className="size-4 text-gray-600" />
					</button>
				)}
				<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200">
					{isExpanded ? (
						<ChevronUp className="size-4 text-gray-600" />
					) : (
						<ChevronDown className="size-4 text-gray-600" />
					)}
				</div>
			</div>
			{isExpanded && (
				<div className="mt-4">
					{(description || headerAction) && (
						<div className="mb-5 flex flex-col gap-4 border-b border-brand-pink/10 pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
							{description ? (
								<p className="max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
							) : (
								<div className="flex-1" />
							)}
							{headerAction ? <div className="shrink-0">{headerAction}</div> : null}
						</div>
					)}
					{children}
				</div>
			)}
		</div>
	)
}

export default ResumeSectionWrapper
