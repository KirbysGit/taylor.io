import FormSection from '../education/FormSection'
import ProjectDescription from './ProjectDescription'
import { getTechStackString } from './projectsUtils'

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

function ProjectEntryForm({
	proj,
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
	return (
		<div className="space-y-6">
			<FormSection title="Basics">
				<Field label="Project title" compact={compact}>
					<input
						id={`project-title-${entryId}`}
						type="text"
						value={proj?.title || ''}
						onChange={(e) => onFieldChange(index, 'title', e.target.value)}
						className="input"
						placeholder="e.g. Personal Finance App"
					/>
				</Field>
			</FormSection>

			<ProjectDescription
				description={proj?.description || ''}
				mode={descriptionMode}
				bullets={descriptionBullets}
				onDescriptionChange={(v) => onDescriptionChange(index, v)}
				onModeToggle={() => onDescriptionModeToggle(index)}
				onBulletChange={(bi, v) => onBulletChange(index, bi, v)}
				onAddBullet={() => onAddBullet(index)}
				onRemoveBullet={(bi) => onRemoveBullet(index, bi)}
				compact={compact}
			/>

			<FormSection title="Details">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Field label="Tech stack" optional compact={compact}>
						<input
							type="text"
							value={getTechStackString(proj)}
							onChange={(e) => onFieldChange(index, 'techStack', e.target.value)}
							className="input"
							placeholder="React, Node.js, PostgreSQL (comma-separated)"
						/>
					</Field>
					<Field label="Project URL" optional compact={compact}>
						<input
							type="url"
							value={proj?.url || ''}
							onChange={(e) => onFieldChange(index, 'url', e.target.value)}
							className="input"
							placeholder="https://github.com/you/project"
						/>
					</Field>
				</div>
			</FormSection>
		</div>
	)
}

export default ProjectEntryForm
