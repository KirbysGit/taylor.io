import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGripVertical } from '@fortawesome/free-solid-svg-icons'
import AnimatedExpand from './AnimatedExpand'
import EducationEntryForm from './EducationEntryForm'
import EducationEntrySummary from './EducationEntrySummary'
import EducationHighlights from './EducationHighlights'

function EducationEntryCard({
	edu,
	index,
	entryId,
	isExpanded,
	isDraggable,
	isDragging,
	isDragOver,
	compact,
	showSubsections,
	onToggle,
	onRemove,
	onFieldChange,
	onSubsectionsChange,
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
			id={`education-card-${entryId}`}
			onDragOver={isDraggable ? (e) => onReorderDrag.onDragOver(e, index) : undefined}
			onDragLeave={isDraggable ? onReorderDrag.onDragLeave : undefined}
			onDrop={isDraggable ? (e) => onReorderDrag.onDrop(e, index) : undefined}
			className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
				isExpanded ? 'border-brand-pink/30 shadow-md' : 'border-slate-200/90 hover:border-slate-300'
			} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'bg-brand-pink/[0.03] ring-2 ring-brand-pink/25' : ''}`}
		>
			<EducationEntrySummary
				edu={edu}
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
					<EducationEntryForm
						edu={edu}
						entryId={entryId}
						index={index}
						onFieldChange={onFieldChange}
						compact={compact}
					/>
					{showSubsections ? (
						<div className="mt-6">
							<EducationHighlights
								key={entryId}
								eduIndex={index}
								subsections={edu?.subsections || {}}
								onChange={onSubsectionsChange}
							/>
						</div>
					) : null}
				</div>
			</AnimatedExpand>
		</div>
	)
}

export default EducationEntryCard
