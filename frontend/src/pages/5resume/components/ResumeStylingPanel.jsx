import React from 'react'

const FONT_OPTIONS = ['Calibri', 'Arial', 'Times New Roman', 'Georgia', 'Garamond']

function ResumeStylingPanel({
	template,
	availableTemplates,
	onTemplateChange,
	headerAlignment,
	onHeaderAlignmentChange,
	marginPreset,
	onMarginPresetChange,
	marginCustom,
	onMarginCustomChange,
	fontFamily,
	onFontFamilyChange,
}) {
	return (
		<>
			{/* Template Selection */}
			<div className="mb-6">
				<label className="block text-sm font-medium text-gray-700 mb-3">Template</label>
				<select
					value={template}
					onChange={(e) => onTemplateChange(e.target.value)}
					className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
				>
					{availableTemplates.map((t) => (
						<option key={t} value={t}>
							{t.charAt(0).toUpperCase() + t.slice(1)}
						</option>
					))}
				</select>
			</div>

			{/* Font family */}
			<div className="mb-6">
				<label className="block text-sm font-medium text-gray-700 mb-3">Font</label>
				<select
					value={fontFamily}
					onChange={(e) => onFontFamilyChange(e.target.value)}
					className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
				>
					{FONT_OPTIONS.map((f) => (
						<option key={f} value={f}>
							{f}
						</option>
					))}
				</select>
			</div>

			{/* Header alignment */}
			<div className="mb-6">
				<label className="block text-sm font-medium text-gray-700 mb-3">Header alignment</label>
				<div className="grid grid-cols-3 gap-2 text-sm">
					{['left', 'center', 'right'].map((opt) => (
						<button
							type="button"
							key={opt}
							onClick={() => onHeaderAlignmentChange(opt)}
							className={`px-3 py-2 rounded-lg border ${
								headerAlignment === opt
									? 'bg-brand-pink text-white border-brand-pink'
									: 'bg-white text-gray-700 border-gray-300 hover:border-brand-pink'
							}`}
						>
							{opt.charAt(0).toUpperCase() + opt.slice(1)}
						</button>
					))}
				</div>
			</div>

			{/* Margin controls */}
			<div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-semibold text-gray-900">Margins</h3>
					<select
						value={marginPreset}
						onChange={(e) => onMarginPresetChange(e.target.value)}
						className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-pink"
					>
						<option value="extraNarrow">Extra narrow (≈0.25")</option>
						<option value="narrow">Narrow (≈0.35")</option>
						<option value="normal">Normal (≈0.5")</option>
						<option value="wide">Wide (≈0.65")</option>
						<option value="custom">Custom</option>
					</select>
				</div>
				{marginPreset === 'custom' && (
					<div className="grid grid-cols-2 gap-3 text-sm">
						{[
							{ key: 'top', label: 'Top' },
							{ key: 'bottom', label: 'Bottom' },
							{ key: 'left', label: 'Left' },
							{ key: 'right', label: 'Right' },
						].map((m) => (
							<div key={m.key} className="flex flex-col">
								<label className="text-gray-700 mb-1">{m.label} (inches)</label>
								<input
									type="number"
									step="0.1"
									min="0"
									value={marginCustom[m.key]}
									onChange={(e) => onMarginCustomChange({ ...marginCustom, [m.key]: e.target.value })}
									className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink"
								/>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	)
}

export default ResumeStylingPanel

