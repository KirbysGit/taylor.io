import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faAward,
	faBookOpen,
	faPlus,
	faTrophy,
	faUsers,
} from '@fortawesome/free-solid-svg-icons'
import FormSection from './FormSection'
import EducationHighlightRow from './EducationHighlightRow'
import {
	HIGHLIGHT_ADD_CHIP_CLASS,
	HIGHLIGHT_CHIP_CLASS,
	HIGHLIGHT_PRESETS,
	highlightRowsToSubsections,
	newHighlightRow,
	subsectionsToHighlightRows,
} from './educationUtils'

const PRESET_ICONS = {
	Coursework: faBookOpen,
	Honors: faAward,
	Awards: faTrophy,
	Clubs: faUsers,
}

function EducationHighlights({ subsections = {}, onChange, eduIndex }) {
	const [rows, setRows] = useState(() => subsectionsToHighlightRows(subsections))
	const [draggedIndex, setDraggedIndex] = useState(null)
	const [dragOverIndex, setDragOverIndex] = useState(null)
	const [editingCategoryKey, setEditingCategoryKey] = useState(null)
	const [editingCategoryValue, setEditingCategoryValue] = useState('')

	const commitRows = (nextRows) => {
		setRows(nextRows)
		onChange(highlightRowsToSubsections(nextRows))
	}

	const handleAddPreset = (category) => {
		commitRows([...rows, newHighlightRow(category)])
	}

	const handleAddCustom = () => {
		const row = newHighlightRow(`__custom__${Date.now()}`)
		const withEmpty = { ...row, category: '' }
		commitRows([...rows, withEmpty])
		setEditingCategoryKey(withEmpty.rowKey)
		setEditingCategoryValue('')
	}

	const handleReorder = (from, to) => {
		if (from === to) return
		const next = [...rows]
		const [removed] = next.splice(from, 1)
		next.splice(to, 0, removed)
		commitRows(next)
	}

	const startEditCategory = (row) => {
		setEditingCategoryKey(row.rowKey)
		setEditingCategoryValue(row.category)
	}

	const saveEditCategory = (rowKey) => {
		const nextCat = editingCategoryValue.trim()
		if (!nextCat) {
			commitRows(rows.filter((r) => r.rowKey !== rowKey))
		} else {
			commitRows(rows.map((r) => (r.rowKey === rowKey ? { ...r, category: nextCat } : r)))
		}
		setEditingCategoryKey(null)
		setEditingCategoryValue('')
	}

	const canDrag = rows.length > 1

	const chipBase =
		'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition'

	return (
		<FormSection
			title="Education highlights"
			description="Add coursework, honors, awards, clubs, or anything worth tailoring later."
		>
			<div className="flex flex-wrap gap-2">
				{HIGHLIGHT_PRESETS.map((preset) => {
					const icon = PRESET_ICONS[preset.id]
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => handleAddPreset(preset.id)}
							className={`${chipBase} ${HIGHLIGHT_CHIP_CLASS}`}
						>
							{icon ? <FontAwesomeIcon icon={icon} className="size-3 opacity-80" aria-hidden /> : null}
							{preset.label}
						</button>
					)
				})}
				<button
					type="button"
					onClick={handleAddCustom}
					className={`${chipBase} ${HIGHLIGHT_ADD_CHIP_CLASS}`}
					title="Add your own highlight type"
				>
					<FontAwesomeIcon icon={faPlus} className="size-3" aria-hidden />
					<span className="sr-only sm:not-sr-only">Custom</span>
				</button>
			</div>

			<div className="mt-4 space-y-2.5">
				{rows.length === 0 ? (
					<p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-center text-sm text-slate-500">
						No highlights yet. Pick a chip above or use + to add your own.
					</p>
				) : (
					rows.map((row, rowIndex) => (
						<EducationHighlightRow
							key={row.rowKey}
							rowKey={row.rowKey}
							eduIndex={eduIndex}
							category={row.category}
							text={row.text}
							canDrag={canDrag}
							isDragging={draggedIndex === rowIndex}
							isDragOver={dragOverIndex === rowIndex}
							isEditingCategory={editingCategoryKey === row.rowKey}
							editingCategoryValue={editingCategoryValue}
							onEditingCategoryValueChange={setEditingCategoryValue}
							onSaveCategory={() => saveEditCategory(row.rowKey)}
							onCancelCategory={() => {
								if (!row.category?.trim()) {
									commitRows(rows.filter((r) => r.rowKey !== row.rowKey))
								}
								setEditingCategoryKey(null)
								setEditingCategoryValue('')
							}}
							onStartEditCategory={() => startEditCategory(row)}
							onTextChange={(text) => commitRows(rows.map((r) => (r.rowKey === row.rowKey ? { ...r, text } : r)))}
							onDelete={() => commitRows(rows.filter((r) => r.rowKey !== row.rowKey))}
							onDragStart={() => setDraggedIndex(rowIndex)}
							onDragEnd={() => {
								setDraggedIndex(null)
								setDragOverIndex(null)
							}}
							onDragOver={(e) => {
								e.preventDefault()
								setDragOverIndex(rowIndex)
							}}
							onDragLeave={() => setDragOverIndex(null)}
							onDrop={(e) => {
								e.preventDefault()
								if (draggedIndex != null) handleReorder(draggedIndex, rowIndex)
								setDraggedIndex(null)
								setDragOverIndex(null)
							}}
						/>
					))
				)}
			</div>
		</FormSection>
	)
}

export default EducationHighlights
