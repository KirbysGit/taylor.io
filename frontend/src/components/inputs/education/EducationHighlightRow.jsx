// Single education highlight row — drag handle, category pill, text, actions (matches profile/resume mock).

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGripVertical, faPencil, faTrash } from '@fortawesome/free-solid-svg-icons'
import { presetForCategory } from './educationUtils'

function EducationHighlightRow({
	rowKey,
	eduIndex,
	category,
	text,
	canDrag = false,
	isDragging = false,
	isDragOver = false,
	isEditingCategory = false,
	editingCategoryValue = '',
	onEditingCategoryValueChange,
	onSaveCategory,
	onCancelCategory,
	onStartEditCategory,
	onTextChange,
	onDelete,
	onDragStart,
	onDragEnd,
	onDragOver,
	onDragLeave,
	onDrop,
}) {
	const preset = presetForCategory(category)

	return (
		<div
			onDragOver={canDrag ? onDragOver : undefined}
			onDragLeave={canDrag ? onDragLeave : undefined}
			onDrop={canDrag ? onDrop : undefined}
			className={[
				'flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 transition',
				isDragging ? 'opacity-50' : 'border-slate-200/90',
				isDragOver ? 'border-brand-pink/40 bg-brand-pink/[0.04] ring-2 ring-brand-pink/20' : '',
			].join(' ')}
		>
			{canDrag ? (
				<div
					draggable
					onDragStart={onDragStart}
					onDragEnd={onDragEnd}
					className="flex shrink-0 cursor-grab touch-none p-1 text-slate-400 active:cursor-grabbing"
					title="Drag to reorder"
				>
					<FontAwesomeIcon icon={faGripVertical} className="size-3.5" />
				</div>
			) : (
				<span className="w-6 shrink-0" aria-hidden />
			)}

			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
				{isEditingCategory ? (
					<input
						type="text"
						value={editingCategoryValue}
						onChange={(e) => onEditingCategoryValueChange(e.target.value)}
						onBlur={onSaveCategory}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault()
								onSaveCategory()
							} else if (e.key === 'Escape') {
								onCancelCategory()
							}
						}}
						className="input max-w-[12rem] py-1.5 text-sm"
						placeholder="e.g. Research, Certification"
						autoFocus
					/>
				) : (
					<span
						className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-sm font-semibold leading-tight ${preset.gridPillClass}`}
					>
						{preset.label}
					</span>
				)}

				<input
					id={`education-highlight-${eduIndex}-${rowKey}`}
					type="text"
					value={text}
					onChange={(e) => onTextChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault()
							e.currentTarget.blur()
						}
					}}
					className="input min-w-0 flex-1 border-slate-200/80 py-1.5 text-sm"
					placeholder="One sentence or short phrase…"
				/>
			</div>

			<div className="flex shrink-0 items-center gap-0.5">
				{!isEditingCategory ? (
					<button
						type="button"
						onClick={onStartEditCategory}
						className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
						title="Edit category"
					>
						<FontAwesomeIcon icon={faPencil} className="size-3.5" />
					</button>
				) : null}
				<button
					type="button"
					onClick={onDelete}
					className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
					aria-label="Remove highlight"
					title="Remove"
				>
					<FontAwesomeIcon icon={faTrash} className="size-3.5" />
				</button>
			</div>
		</div>
	)
}

export default EducationHighlightRow
