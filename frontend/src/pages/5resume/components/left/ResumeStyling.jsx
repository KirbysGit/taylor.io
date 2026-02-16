// components / left / ResumeStyling.jsx

import { useState } from 'react'
import SectionOrdering from './SectionOrdering'

// Resume Styling Component - Fixed box with tabs for styling customization
const ResumeStyling = ({ 
	sectionOrder, 
	onSectionOrderChange,
	template,
	onTemplateChange,
	availableTemplates,
	isLoadingTemplates,
	onScrollToSection
}) => {
	const [activeTab, setActiveTab] = useState('ordering')

	const tabs = [
		{ id: 'ordering', label: 'Ordering & Alignment' },
		{ id: 'styling', label: 'Styling' },
		{ id: 'templates', label: 'Templates' },
	]

	return (
		<div className="mb-4 border-[2px] border-brand-pink-light rounded-md p-4">
			{/* Title */}
			<h1 className="text-[1.375rem] font-semibold text-gray-900 mb-4">Styling & Template</h1>
			
			{/* Tabs */}
			<div className="flex border-b border-gray-200 mb-4">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => setActiveTab(tab.id)}
						className={`px-4 py-2 text-sm font-medium transition-colors ${
							activeTab === tab.id
								? 'text-brand-pink border-b-2 border-brand-pink'
								: 'text-gray-600 hover:text-gray-900'
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Tab Content */}
			<div className="min-h-[300px]">
				{activeTab === 'ordering' && (
					<div>
						<p className="text-[0.875rem] text-gray-500 mb-4">
							Reorder and align your resume sections.
						</p>
						<SectionOrdering 
							sectionOrder={sectionOrder}
							onOrderChange={onSectionOrderChange}
							onScrollToSection={onScrollToSection}
						/>
					</div>
				)}

				{activeTab === 'styling' && (
					<div>
						<p className="text-[0.875rem] text-gray-500 mb-4">
							Customize fonts, margins, and other styling options.
						</p>
						{/* Placeholder for styling options */}
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Font Family
								</label>
								<select
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent bg-white"
									disabled
								>
									<option>Coming soon...</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Font Size
								</label>
								<select
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent bg-white"
									disabled
								>
									<option>Coming soon...</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Margins
								</label>
								<select
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent bg-white"
									disabled
								>
									<option>Coming soon...</option>
								</select>
							</div>
						</div>
					</div>
				)}

				{activeTab === 'templates' && (
					<div>
						<p className="text-[0.875rem] text-gray-500 mb-4">
							Choose a template for your resume.
						</p>
						{/* Scrollable template grid */}
						<div className="max-h-[400px] overflow-y-auto pr-2">
							{isLoadingTemplates ? (
								<div className="flex items-center justify-center py-8">
									<p className="text-gray-500">Loading templates...</p>
								</div>
							) : (
								<div className="grid grid-cols-1 gap-3">
									{availableTemplates.map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => onTemplateChange(t)}
											className={`p-4 border-2 rounded-lg text-left transition-all ${
												template === t
													? 'border-brand-pink bg-brand-pink/5'
													: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
											}`}
										>
											<div className="flex items-center justify-between">
												<span className="font-medium text-gray-900">{t}</span>
												{template === t && (
													<span className="text-brand-pink text-sm font-semibold">Selected</span>
												)}
											</div>
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export default ResumeStyling
