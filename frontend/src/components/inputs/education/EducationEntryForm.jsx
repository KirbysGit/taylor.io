import MonthYearPicker from '../MonthYearPicker'
import FormSection from './FormSection'

function Field({ label, optional, children, compact }) {
	return (
		<div className="min-w-0">
			<label className={compact ? 'mb-1.5 block text-xs font-semibold text-slate-600' : 'label'}>
				{label}
				{optional ? <span className="font-normal text-slate-400"> (optional)</span> : null}
			</label>
			{children}
		</div>
	)
}

function EducationEntryForm({ edu, entryId, index, onFieldChange, compact = false }) {
	const current = edu?.current || false

	return (
		<div className="space-y-6">
			<FormSection title="Basics">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<Field label="School / University" compact={compact}>
						<input
							id={`education-school-${entryId}`}
							type="text"
							value={edu?.school || ''}
							onChange={(e) => onFieldChange(index, 'school', e.target.value)}
							className="input"
							placeholder="University name"
							autoComplete="organization"
						/>
					</Field>
					<Field label="Degree" compact={compact}>
						<input
							type="text"
							value={edu?.degree || ''}
							onChange={(e) => onFieldChange(index, 'degree', e.target.value)}
							className="input"
							placeholder="e.g. Bachelor of Science"
						/>
					</Field>
					<Field label="Field of study" compact={compact}>
						<input
							type="text"
							value={edu?.discipline || edu?.field || ''}
							onChange={(e) => onFieldChange(index, 'discipline', e.target.value)}
							className="input"
							placeholder="e.g. Computer Science"
						/>
					</Field>
				</div>
			</FormSection>

			<FormSection title="Details">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<Field label="Minor" optional compact={compact}>
						<input
							type="text"
							value={edu?.minor || ''}
							onChange={(e) => onFieldChange(index, 'minor', e.target.value)}
							className="input"
							placeholder="Optional"
						/>
					</Field>
					<Field label="Location" compact={compact}>
						<input
							type="text"
							value={edu?.location || ''}
							onChange={(e) => onFieldChange(index, 'location', e.target.value)}
							className="input"
							placeholder="City, State"
						/>
					</Field>
					<Field label="GPA" optional compact={compact}>
						<input
							type="text"
							value={edu?.gpa || ''}
							onChange={(e) => onFieldChange(index, 'gpa', e.target.value)}
							className="input"
							placeholder="e.g. 3.7"
						/>
					</Field>
				</div>
			</FormSection>

			<FormSection title="Dates">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
					<Field label="Start date" compact={compact}>
						<MonthYearPicker
							value={edu?.startDate || edu?.start_date || ''}
							onChange={(v) => onFieldChange(index, 'startDate', v)}
						/>
					</Field>
					<Field label="End date" compact={compact}>
						<div className={current ? 'pointer-events-none opacity-50' : ''}>
							<MonthYearPicker
								value={edu?.endDate || edu?.end_date || ''}
								onChange={(v) => onFieldChange(index, 'endDate', v)}
								disabled={current}
							/>
						</div>
					</Field>
					<div className="min-w-0">
						<span className={compact ? 'mb-1.5 block text-xs font-semibold text-slate-600' : 'label'}>
							Currently enrolled
						</span>
						<div
							role="switch"
							aria-checked={current}
							aria-label="Currently enrolled"
							tabIndex={0}
							onClick={() => onFieldChange(index, 'current', !current)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									onFieldChange(index, 'current', !current)
								}
							}}
							onMouseDown={(e) => e.preventDefault()}
							className="flex h-[2.75rem] cursor-pointer items-center select-none"
						>
							<div
								className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
									current ? 'bg-brand-pink' : 'bg-slate-300'
								}`}
							>
								<div
									className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
										current ? 'translate-x-5' : 'translate-x-0'
									}`}
								/>
							</div>
							<span className={`ml-3 text-sm font-medium ${current ? 'text-brand-pink-dark' : 'text-slate-500'}`}>
								{current ? 'Yes' : 'No'}
							</span>
						</div>
					</div>
				</div>
			</FormSection>
		</div>
	)
}

export default EducationEntryForm
