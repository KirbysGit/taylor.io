import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGripVertical } from '@fortawesome/free-solid-svg-icons'
import AnimatedExpand from '../education/AnimatedExpand'
import ExperienceEntryForm from './ExperienceEntryForm'
import ExperienceEntrySummary from './ExperienceEntrySummary'

function ExperienceEntryCard({
	exp,
	index,
	entryId,
	isExpanded,
	isDraggable,
	isDragging,
	isDragOver,
	compact,
	descriptionMode,
	descriptionBullets,
	onToggle,
	onRemove,
	onFieldChange,
	onDescriptionChange,
	onDescriptionModeToggle,
	onBulletChange,
	onAddBullet,
	onRemoveBullet,
	onReorderDrag,
}) {
	const dragHandle = isDraggable ? (
		<div
			draggable
			onDragStart={(e) => onReorderDrag.onDragStart(e, index)}
			onDragEnd={onReorderDrag.onDragEnd}
			className="mt-1 flex shrink-0 cursor-grab touch-none p-1 text-slate-400 active:cursor-grabbing"
			title="Drag to reorder"
		>
			<FontAwesomeIcon icon={faGripVertical} className="size-3.5" />
		</div>
	) : null

	return (
		<div
			id={`experience-card-${entryId}`}
			onDragOver={isDraggable ? (e) => onReorderDrag.onDragOver(e, index) : undefined}
			onDragLeave={isDraggable ? onReorderDrag.onDragLeave : undefined}
			onDrop={isDraggable ? (e) => onReorderDrag.onDrop(e, index) : undefined}
			className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
				isExpanded ? 'border-brand-pink/30 shadow-md' : 'border-slate-200/90 hover:border-slate-300'
			} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'bg-brand-pink/[0.03] ring-2 ring-brand-pink/25' : ''}`}
		>
			<ExperienceEntrySummary
				exp={exp}
				entryId={entryId}
				isExpanded={isExpanded}
				isDraggable={isDraggable}
				dragHandle={dragHandle}
				onToggle={onToggle}
				onRemove={onRemove}
				showDelete
				compact={compact}
			/>

			<AnimatedExpand expanded={isExpanded}>
				<div className="border-t border-slate-100 px-4 pb-5 pt-5 sm:px-5 sm:pb-6">
					<ExperienceEntryForm
						exp={exp}
						entryId={entryId}
						index={index}
						onFieldChange={onFieldChange}
						descriptionMode={descriptionMode}
						descriptionBullets={descriptionBullets}
						onDescriptionChange={onDescriptionChange}
						onDescriptionModeToggle={onDescriptionModeToggle}
						onBulletChange={onBulletChange}
						onAddBullet={onAddBullet}
						onRemoveBullet={onRemoveBullet}
						compact={compact}
					/>
				</div>
			</AnimatedExpand>
		</div>
	)
}

export default ExperienceEntryCard
