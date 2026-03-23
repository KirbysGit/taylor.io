// components / left / ResumeStyling.jsx

// Slim styling block: template picker + optional styling (coming soon)

const ResumeStyling = ({
	template,
	onTemplateChange,
	availableTemplates,
	isLoadingTemplates,
}) => {
	return (
		<div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow">
			<h2 className="text-sm font-semibold text-gray-800 mb-3">Template</h2>
			{isLoadingTemplates ? (
				<p className="text-sm text-gray-500 py-4">Loading templates...</p>
			) : (
				<div className="grid grid-cols-1 gap-2 max-h-[280px] overflow-y-auto pr-1">
					{availableTemplates.map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => onTemplateChange(t)}
							className={`px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
								template === t
									? 'border border-brand-pink bg-brand-pink/10 text-brand-pink font-medium'
									: 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
							}`}
						>
							{t}
						</button>
					))}
				</div>
			)}
			<p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
				Fonts & margins — coming soon
			</p>
		</div>
	)
}

export default ResumeStyling
