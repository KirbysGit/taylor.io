// components / 5resume / components / ResumeStyling.jsx

import { useState } from 'react'
import { ChevronDown, ChevronUp } from '@/components/icons'
import SectionOrdering from './SectionOrdering'

// Resume Styling Component - Collapsible container for styling customization features
const ResumeStyling = ({ 
	sectionOrder, 
	onSectionOrderChange,
	template,
	onTemplateChange,
	availableTemplates,
	isLoadingTemplates,
	onScrollToSection
}) => {
	const [isExpanded, setIsExpanded] = useState(true)

	return (
		<div>
			<div className="flex flex-col mb-4 border-[2px] border-brand-pink-light rounded-md p-4">
				{/* Collapsible Header - Matching ResumeHeader style */}
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="flex items-center gap-3 w-full transition-colors"
				>
					{/* title */}
					<h1 className="text-[1.375rem] font-semibold text-gray-900">Styling & Template</h1>
					
					{/* divider */}
					<div className="flex-1 h-[3px] rounded bg-gray-300"></div>
					
					{/* chevron in circle */}
					<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
						{isExpanded ? (
							<ChevronUp className="w-4 h-4 text-gray-600" />
						) : (
							<ChevronDown className="w-4 h-4 text-gray-600" />
						)}
					</div>
				</button>

				{/* Collapsible Content */}
				{isExpanded && (
					<div>
						<p className="text-[0.875rem] text-gray-500 mb-4">Customize your resume appearance and section order.</p>
					
					{/* Two-column layout: Section Ordering (half) and Template (half) */}
					<div className="grid grid-cols-2 gap-4">
						{/* Section Ordering - Left Half */}
						<div className="w-full">
							<SectionOrdering 
								sectionOrder={sectionOrder}
								onOrderChange={onSectionOrderChange}
								onScrollToSection={onScrollToSection}
							/>
						</div>

						{/* Template Selector - Right Half */}
						<div className="w-full">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Template
							</label>
							<select
								value={template}
								onChange={(e) => onTemplateChange(e.target.value)}
								disabled={isLoadingTemplates}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent bg-white"
							>
								{availableTemplates.map((t) => (
									<option key={t} value={t}>
										{t}
									</option>
								))}
							</select>
						</div>
					</div>
					
						{/* Future styling features can be added here */}
						{/* Example: Font selection, color themes, spacing, etc. */}
					</div>
				)}
			</div>
		</div>
	)
}

export default ResumeStyling
