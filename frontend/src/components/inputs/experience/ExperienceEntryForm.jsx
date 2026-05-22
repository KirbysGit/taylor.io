import MonthYearPicker from '../MonthYearPicker'
import FormSection from '../education/FormSection'
import ExperienceDescription from './ExperienceDescription'

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

function ExperienceEntryForm({
	exp,
	entryId,
	index,
	onFieldChange,
	descriptionMode,
	descriptionBullets,
	onDescriptionChange,
	onDescriptionModeToggle,
	onBulletChange,
	onAddBullet,
	onRemoveBullet,
	compact = false,
}) {
	const current = exp?.current || false

	return (
		<div className="space-y-6">
			<FormSection title="Basics">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Field label="Job title" compact={compact}>
						<input
							id={`experience-title-${entryId}`}
							type="text"
							value={exp?.title || ''}
							onChange={(e) => onFieldChange(index, 'title', e.target.value)}
							className="input"
							placeholder="e.g. Software Engineer"
						/>
					</Field>
					<Field label="Company" compact={compact}>
						<input
							type="text"
							value={exp?.company || ''}
							onChange={(e) => onFieldChange(index, 'company', e.target.value)}
							className="input"
							placeholder="Company name"
						/>
					</Field>
				</div>
			</FormSection>

			<FormSection title="Details">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Field label="Location" optional compact={compact}>
						<input
							type="text"
							value={exp?.location || ''}
							onChange={(e) => onFieldChange(index, 'location', e.target.value)}
							className="input"
							placeholder="e.g. Remote, San Francisco, CA"
						/>
					</Field>
					<Field label="Tech stack / skills" optional compact={compact}>
						<input
							type="text"
							value={exp?.skills || ''}
							onChange={(e) => onFieldChange(index, 'skills', e.target.value)}
							className="input"
							placeholder="Python, React, AWS (comma-separated)"
						/>
					</Field>
				</div>
			</FormSection>

			<FormSection title="Dates">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
					<Field label="Start date" compact={compact}>
						<MonthYearPicker
							value={exp?.startDate || exp?.start_date || ''}
							onChange={(v) => onFieldChange(index, 'startDate', v)}
						/>
					</Field>
					<Field label="End date" compact={compact}>
						<div className={current ? 'pointer-events-none opacity-50' : ''}>
							<MonthYearPicker
								value={exp?.endDate || exp?.end_date || ''}
								onChange={(v) => onFieldChange(index, 'endDate', v)}
								disabled={current}
							/>
						</div>
					</Field>
					<div className="min-w-0">
						<span className={compact ? 'mb-1.5 block text-xs font-semibold text-slate-600' : 'label'}>
							Currently working here
						</span>
						<div
							role="switch"
							aria-checked={current}
							aria-label="Currently working here"
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

			<ExperienceDescription
				index={index}
				description={exp?.description || ''}
				mode={descriptionMode}
				bullets={descriptionBullets}
				onDescriptionChange={(v) => onDescriptionChange(index, v)}
				onModeToggle={() => onDescriptionModeToggle(index)}
				onBulletChange={(bi, v) => onBulletChange(index, bi, v)}
				onAddBullet={() => onAddBullet(index)}
				onRemoveBullet={(bi) => onRemoveBullet(index, bi)}
				compact={compact}
			/>
		</div>
	)
}

export default ExperienceEntryForm
