import MonthYearPicker from '../MonthYearPicker'
import FormSection from './FormSection'

const INVALID_CLASS = 'border-red-400 bg-red-50/30 ring-2 ring-red-100 [animation:shake_0.45s_ease-in-out]'

function Field({ label, required, children, compact }) {
	return (
		<div className="min-w-0">
			<label className={compact ? 'mb-1.5 block text-xs font-semibold text-slate-600' : 'label'}>
				{label}
				{required ? <span className="ml-1 text-brand-pink">*</span> : null}
			</label>
			{children}
		</div>
	)
}

function EducationEntryForm({ edu, entryId, index, onFieldChange, invalidFields, compact = false }) {
	const current = edu?.current || false
	const inv = invalidFields || new Set()

	return (
		<div className="space-y-6">
			<FormSection title="Basics">
				{/* School — full width */}
				<Field label="School / University" required compact={compact}>
					<input
						id={`education-school-${entryId}`}
						type="text"
						value={edu?.school || ''}
						onChange={(e) => onFieldChange(index, 'school', e.target.value)}
						className={`input ${inv.has('school') ? INVALID_CLASS : ''}`}
						placeholder="e.g. University of Central Florida"
						autoComplete="organization"
					/>
				</Field>
				{/* Degree + Field of study — 2 equal columns */}
				<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label="Degree" required compact={compact}>
						<input
							id={`education-degree-${entryId}`}
							type="text"
							value={edu?.degree || ''}
							onChange={(e) => onFieldChange(index, 'degree', e.target.value)}
							className={`input ${inv.has('degree') ? INVALID_CLASS : ''}`}
							placeholder="e.g. Bachelor of Science"
						/>
					</Field>
					<Field label="Field of study" required compact={compact}>
						<input
							id={`education-discipline-${entryId}`}
							type="text"
							value={edu?.discipline || edu?.field || ''}
							onChange={(e) => onFieldChange(index, 'discipline', e.target.value)}
							className={`input ${inv.has('discipline') ? INVALID_CLASS : ''}`}
							placeholder="e.g. Computer Science"
						/>
					</Field>
				</div>
			</FormSection>

			<FormSection title="Details">
				{/* Minor + Location take equal space, GPA is narrower */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_0.55fr]">
					<Field label="Minor" compact={compact}>
						<input
							type="text"
							value={edu?.minor || ''}
							onChange={(e) => onFieldChange(index, 'minor', e.target.value)}
							className="input"
							placeholder="e.g. Mathematics"
						/>
					</Field>
					<Field label="Location" optional compact={compact}>
						<input
							type="text"
							value={edu?.location || ''}
							onChange={(e) => onFieldChange(index, 'location', e.target.value)}
							className="input"
							placeholder="City, State"
						/>
					</Field>
					<Field label="GPA" compact={compact}>
						<input
							type="text"
							value={edu?.gpa || ''}
							onChange={(e) => onFieldChange(index, 'gpa', e.target.value)}
							className="input"
							placeholder="3.7 / 4.0"
						/>
					</Field>
				</div>
			</FormSection>

			<FormSection title="Dates">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
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
