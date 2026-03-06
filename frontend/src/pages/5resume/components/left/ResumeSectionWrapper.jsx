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
	children,
}) {
	const [isExpanded, setIsExpanded] = useState(true)

	return (
		<div className="flex flex-col mb-4 border-[2px] border-brand-pink-light rounded-md p-4">
			<div
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center gap-3 w-full transition-colors cursor-pointer"
			>
				{onVisibilityChange && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onVisibilityChange(!isVisible)
						}}
						className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
						aria-label={isVisible ? `Hide ${sectionLabel || defaultLabel} in preview` : `Show ${sectionLabel || defaultLabel} in preview`}
						title={isVisible ? 'Hide from preview' : 'Show in preview'}
					>
						<FontAwesomeIcon icon={isVisible ? faEye : faEyeSlash} className="w-4 h-4 text-gray-600" />
					</button>
				)}
				<SectionTitleEditor
					sectionKey={sectionKey}
					currentLabel={sectionLabel}
					onLabelChange={onSectionLabelChange}
					defaultLabel={defaultLabel}
				/>
				<div className="flex-1 h-[3px] rounded bg-gray-300" />
				<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
					{isExpanded ? (
						<ChevronUp className="w-4 h-4 text-gray-600" />
					) : (
						<ChevronDown className="w-4 h-4 text-gray-600" />
					)}
				</div>
			</div>
			{isExpanded && (
				<div className="mt-4">
					{description && (
						<p className="text-[0.875rem] text-gray-500 mb-4">{description}</p>
					)}
					{children}
				</div>
			)}
		</div>
	)
}

export default ResumeSectionWrapper
