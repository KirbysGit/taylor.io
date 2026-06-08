import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faChevronDown,
	faChevronUp,
	faGraduationCap,
	faPencil,
	faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { getEntryTheme } from '../shared/entryThemePalette'
import { entrySummaryPaddingClass, getEntrySummaryGridClasses } from '../shared/entrySummaryLayout'
import {
	getEducationDisplayTitle,
	getEducationMetaLine,
	presetForCategory,
	subsectionsToHighlightRows,
} from './educationUtils'

function HighlightChip({ category }) {
	const preset = presetForCategory(category)
	return (
		<span
			className={`inline-flex max-w-full rounded-full border px-2.5 py-0.5 text-xs font-semibold ${preset.gridPillClass}`}
		>
			{preset.label}
		</span>
	)
}

function EducationEntrySummary({
	edu,
	entryId,
	isExpanded,
	isDraggable,
	dragHandle,
	onToggle,
	onRemove,
	showDelete = true,
	compact = false,
}) {
	const title = getEducationDisplayTitle(edu)
	const meta = getEducationMetaLine(edu)
	const theme = getEntryTheme(entryId)
	const layout = getEntrySummaryGridClasses({ compact, isDraggable })
	const subs = edu?.subsections || {}
	const highlightRows = subsectionsToHighlightRows(subs)
	const chipCategories = [
		...new Set([
			...Object.keys(subs).filter((k) => k.trim()),
			...highlightRows.filter((r) => r.category?.trim()).map((r) => r.category),
		]),
	]
	const hasPills = chipCategories.length > 0

	return (
		<div
			className={[
				'grid gap-x-3 sm:gap-x-4',
				entrySummaryPaddingClass(compact),
				layout.grid,
				hasPills ? 'gap-y-2.5' : 'gap-y-0',
			].join(' ')}
		>
			{isDraggable ? <div className="row-start-1 self-center">{dragHandle}</div> : null}

			{layout.showIcon ? (
				<span
					className={`row-start-1 flex size-10 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}
					aria-hidden
				>
					<FontAwesomeIcon icon={faGraduationCap} className="size-4" />
				</span>
			) : null}

			<div className="row-start-1 min-w-0">
				<div className="flex flex-wrap items-start gap-2 gap-y-1">
					<p className="text-sm font-bold text-slate-900">{title}</p>
				</div>
				{meta ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{meta}</p> : null}
			</div>

			<div className="row-start-1 flex shrink-0 items-center gap-0.5 self-start">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation()
						onToggle()
					}}
					className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-brand-pink-dark"
					aria-expanded={isExpanded}
					title={isExpanded ? 'Collapse' : 'Edit'}
				>
					<FontAwesomeIcon icon={faPencil} className="size-3.5" />
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation()
						onToggle()
					}}
					className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
					aria-label={isExpanded ? 'Collapse' : 'Expand'}
				>
					<FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="size-3.5" />
				</button>
				{showDelete ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onRemove()
						}}
						className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
						aria-label="Remove education"
						title="Remove"
					>
						<FontAwesomeIcon icon={faTrash} className="size-3.5" />
					</button>
				) : null}
			</div>

			{hasPills ? (
				<div
					className={[
						'row-start-2 flex min-w-0 flex-wrap gap-1.5 border-t border-slate-100 pt-2.5',
						layout.pillsCol,
					].join(' ')}
				>
					{chipCategories.map((cat) => (
						<HighlightChip key={cat} category={cat} />
					))}
				</div>
			) : null}
		</div>
	)
}

export default EducationEntrySummary
