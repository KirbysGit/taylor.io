import React from 'react'

function EducationTab({
	educationFields,
	educationVisibility,
	onEducationFieldChange,
	onToggleEducationVisibility,
	onSaveEducation,
	isSavingEducation,
}) {
	return (
		<div className="space-y-6">
			<div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-semibold text-gray-900">Education</h3>
					<span className="text-xs text-gray-500">Primary entry</span>
				</div>

				<div className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<label className="text-sm text-gray-700 mb-1">School</label>
							<input
								type="text"
								value={educationFields.school}
								onChange={(e) => onEducationFieldChange('school', e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
							/>
						</div>
						<div className="flex flex-col">
							<label className="text-sm text-gray-700 mb-1">Location</label>
							<input
								type="text"
								value={educationFields.location}
								onChange={(e) => onEducationFieldChange('location', e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<label className="text-sm text-gray-700 mb-1">Degree</label>
							<input
								type="text"
								value={educationFields.degree}
								onChange={(e) => onEducationFieldChange('degree', e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
							/>
						</div>
						<div className="flex flex-col">
							<label className="text-sm text-gray-700 mb-1">Field</label>
							<input
								type="text"
								value={educationFields.field}
								onChange={(e) => onEducationFieldChange('field', e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
							/>
						</div>
					</div>

					<div className="flex flex-col">
						<label className="text-sm text-gray-700 mb-1 flex items-center gap-2">
							Minor
							<span
								onClick={() => onToggleEducationVisibility('minor')}
								className={`h-3 w-3 rounded-full cursor-pointer transition ${
									educationVisibility.minor ? 'bg-brand-pink' : 'bg-gray-300'
								}`}
							/>
						</label>
						<input
							type="text"
							value={educationFields.minor}
							onChange={(e) => onEducationFieldChange('minor', e.target.value)}
							placeholder="Statistics"
							disabled={!educationVisibility.minor}
							className={`px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink ${
								educationVisibility.minor ? '' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
							}`}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<label className="text-sm text-gray-700 mb-1 flex items-center gap-2">
								Date range
								<span
									onClick={() => onToggleEducationVisibility('date')}
									className={`h-3 w-3 rounded-full cursor-pointer transition ${
										educationVisibility.date ? 'bg-brand-pink' : 'bg-gray-300'
									}`}
								/>
							</label>
							<input
								type="text"
								value={educationFields.date}
								onChange={(e) => onEducationFieldChange('date', e.target.value)}
								placeholder="Aug 2021 – May 2025"
								disabled={!educationVisibility.date}
								className={`px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink ${
									educationVisibility.date ? '' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
								}`}
							/>
						</div>
						<div className="flex flex-col">
							<label className="text-sm text-gray-700 mb-1 flex items-center gap-2">
								GPA
								<span
									onClick={() => onToggleEducationVisibility('gpa')}
									className={`h-3 w-3 rounded-full cursor-pointer transition ${
										educationVisibility.gpa ? 'bg-brand-pink' : 'bg-gray-300'
									}`}
								/>
							</label>
							<input
								type="text"
								value={educationFields.gpa}
								onChange={(e) => onEducationFieldChange('gpa', e.target.value)}
								placeholder="3.8 / 4.0"
								disabled={!educationVisibility.gpa}
								className={`px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink ${
									educationVisibility.gpa ? '' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
								}`}
							/>
						</div>
					</div>

					<div className="flex flex-col">
						<label className="text-sm text-gray-700 mb-1 flex items-center gap-2">
							Honors & Awards
							<span
								onClick={() => onToggleEducationVisibility('honors')}
								className={`h-3 w-3 rounded-full cursor-pointer transition ${
									educationVisibility.honors ? 'bg-brand-pink' : 'bg-gray-300'
								}`}
							/>
						</label>
						<textarea
							value={educationFields.honors}
							onChange={(e) => onEducationFieldChange('honors', e.target.value)}
							rows={2}
							disabled={!educationVisibility.honors}
							className={`px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink ${
								educationVisibility.honors ? '' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
							}`}
						/>
					</div>

					<div className="flex flex-col">
						<label className="text-sm text-gray-700 mb-1 flex items-center gap-2">
							Clubs & Extracurriculars
							<span
								onClick={() => onToggleEducationVisibility('clubs')}
								className={`h-3 w-3 rounded-full cursor-pointer transition ${
									educationVisibility.clubs ? 'bg-brand-pink' : 'bg-gray-300'
								}`}
							/>
						</label>
						<textarea
							value={educationFields.clubs}
							onChange={(e) => onEducationFieldChange('clubs', e.target.value)}
							rows={2}
							disabled={!educationVisibility.clubs}
							className={`px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink ${
								educationVisibility.clubs ? '' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
							}`}
						/>
					</div>

					<div className="flex flex-col">
						<label className="text-sm text-gray-700 mb-1 flex items-center gap-2">
							Relevant Coursework
							<span
								onClick={() => onToggleEducationVisibility('coursework')}
								className={`h-3 w-3 rounded-full cursor-pointer transition ${
									educationVisibility.coursework ? 'bg-brand-pink' : 'bg-gray-300'
								}`}
							/>
						</label>
						<textarea
							value={educationFields.coursework}
							onChange={(e) => onEducationFieldChange('coursework', e.target.value)}
							rows={2}
							disabled={!educationVisibility.coursework}
							className={`px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink ${
								educationVisibility.coursework ? '' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
							}`}
						/>
					</div>
				</div>
				<div className="mt-4 flex justify-end">
					<button
						type="button"
						onClick={onSaveEducation}
						disabled={isSavingEducation}
						className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isSavingEducation ? 'Saving...' : 'Apply to preview'}
					</button>
				</div>
			</div>
		</div>
	)
}

export default EducationTab


