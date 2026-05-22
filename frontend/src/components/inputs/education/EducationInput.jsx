import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import EducationEntryCard from './EducationEntryCard'

const EMPTY_ENTRY = () => ({
	id: Date.now(),
	school: '',
	degree: '',
	discipline: '',
	location: '',
	minor: '',
	gpa: '',
	startDate: '',
	endDate: '',
	current: false,
	subsections: {},
})

const EducationInput = forwardRef(function EducationInput(
	{
		education,
		onAdd,
		onRemove,
		onUpdate,
		onReorder,
		showSubsections = false,
		compact = false,
		hideHeader = false,
		showFooterTip = true,
	},
	ref,
) {
	const entries = education.length > 0 ? education : [EMPTY_ENTRY()]

	const getEntryId = (entry, index) => String(entry?.id ?? index)
	const [expandedIds, setExpandedIds] = useState(() => new Set())
	const [localEntries, setLocalEntries] = useState(entries)
	const [draggedEntryIndex, setDraggedEntryIndex] = useState(null)
	const [dragOverEntryIndex, setDragOverEntryIndex] = useState(null)
	const prevLengthRef = useRef(education.length)
	const prevIdsRef = useRef(education.map((e) => e.id || e).join(','))
	const savedEndDatesRef = useRef(new Map())
	const lastDragEndRef = useRef(0)
	const pendingSchoolFocusEntryIdRef = useRef(null)

	useEffect(() => {
		const targetId = pendingSchoolFocusEntryIdRef.current
		if (targetId == null) return
		const isOpen = [...expandedIds].some((id) => String(id) === targetId)
		if (!isOpen) return

		let cancelled = false
		const t = window.setTimeout(() => {
			if (cancelled) return
			let card = document.getElementById(`education-card-${targetId}`)
			let input = document.getElementById(`education-school-${targetId}`)
			if ((!card || !input) && localEntries.length > 0) {
				const lastIdx = localEntries.length - 1
				const fallbackId = getEntryId(localEntries[lastIdx], lastIdx)
				card = card || document.getElementById(`education-card-${fallbackId}`)
				input = input || document.getElementById(`education-school-${fallbackId}`)
			}
			card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
			input?.focus()
			input?.select()
			pendingSchoolFocusEntryIdRef.current = null
		}, 200)

		return () => {
			cancelled = true
			window.clearTimeout(t)
		}
	}, [localEntries, expandedIds])

	useEffect(() => {
		const currentLength = education.length
		const currentIds = education.map((e) => e.id || e).join(',')

		if (currentLength !== prevLengthRef.current || currentIds !== prevIdsRef.current) {
			const newEntries = education.length > 0 ? education : [EMPTY_ENTRY()]
			setLocalEntries(newEntries)

			if (currentLength > prevLengthRef.current && prevLengthRef.current > 0 && currentLength === prevLengthRef.current + 1) {
				setExpandedIds((prev) => {
					const newSet = new Set(prev)
					const newEntry = newEntries[currentLength - 1]
					newSet.add(getEntryId(newEntry, currentLength - 1))
					return newSet
				})
			} else if (currentLength > prevLengthRef.current) {
				const delta = currentLength - prevLengthRef.current
				if (delta === 1 && prevLengthRef.current === 0) {
					const newEntry = newEntries[currentLength - 1]
					setExpandedIds(new Set([getEntryId(newEntry, currentLength - 1)]))
				} else if (delta > 1) {
					setExpandedIds(new Set())
				}
			} else {
				const ids = new Set(newEntries.map((e, i) => getEntryId(e, i)))
				setExpandedIds((prev) => new Set([...prev].filter((id) => ids.has(id))))
			}

			prevLengthRef.current = currentLength
			prevIdsRef.current = currentIds
		}
	}, [education])

	const toggleExpanded = (index) => {
		const entryId = getEntryId(localEntries[index], index)
		setExpandedIds((prev) => {
			const next = new Set(prev)
			if (next.has(entryId)) next.delete(entryId)
			else next.add(entryId)
			return next
		})
	}

	const handleFieldChange = (index, field, value) => {
		const entryId = localEntries[index]?.id ?? index
		const updatedEntry = { ...localEntries[index], [field]: value }

		if (field === 'current' && value) {
			const currentEndDate = updatedEntry.endDate || updatedEntry.end_date || ''
			if (currentEndDate) savedEndDatesRef.current.set(entryId, currentEndDate)
			updatedEntry.endDate = ''
			updatedEntry.end_date = ''
		} else if (field === 'current' && !value) {
			const savedEndDate = savedEndDatesRef.current.get(entryId)
			if (savedEndDate) {
				updatedEntry.endDate = savedEndDate
				updatedEntry.end_date = savedEndDate
				savedEndDatesRef.current.delete(entryId)
			}
		}

		if (field === 'endDate' && value) {
			updatedEntry.current = false
			savedEndDatesRef.current.delete(entryId)
		}

		const newEntries = [...localEntries]
		newEntries[index] = updatedEntry
		setLocalEntries(newEntries)
		onUpdate(index, updatedEntry)
	}

	const handleSubsectionsChange = (index, subsections) => {
		const updatedEntry = { ...localEntries[index], subsections }
		const newEntries = [...localEntries]
		newEntries[index] = updatedEntry
		setLocalEntries(newEntries)
		onUpdate(index, updatedEntry)
	}

	function handleAddNew() {
		const newEntry = EMPTY_ENTRY()
		const idKey = getEntryId(newEntry, 0)
		pendingSchoolFocusEntryIdRef.current = idKey
		setLocalEntries((prev) => (education.length === 0 ? [newEntry] : [...prev, newEntry]))
		setExpandedIds((prev) => new Set([...prev, idKey]))
		onAdd(newEntry)
	}

	useImperativeHandle(ref, () => ({
		addNew: handleAddNew,
	}))

	const handleReorder = (fromIndex, toIndex) => {
		if (fromIndex === toIndex || !onReorder) return
		const reordered = [...localEntries]
		const [removed] = reordered.splice(fromIndex, 1)
		reordered.splice(toIndex, 0, removed)
		onReorder(reordered)
	}

	const onReorderDrag = {
		onDragStart: (e, index) => {
			setDraggedEntryIndex(index)
			e.dataTransfer.effectAllowed = 'move'
			e.dataTransfer.setData('text/plain', String(index))
		},
		onDragEnd: () => {
			lastDragEndRef.current = Date.now()
			setDraggedEntryIndex(null)
			setDragOverEntryIndex(null)
		},
		onDragOver: (e, index) => {
			e.preventDefault()
			e.dataTransfer.dropEffect = 'move'
			setDragOverEntryIndex(index)
		},
		onDragLeave: () => setDragOverEntryIndex(null),
		onDrop: (e, index) => {
			e.preventDefault()
			if (draggedEntryIndex != null) handleReorder(draggedEntryIndex, index)
			setDraggedEntryIndex(null)
			setDragOverEntryIndex(null)
		},
	}

	const isDraggable = !!onReorder
	const hasEntries = education.length > 0

	const headerSection = hideHeader ? null : (
		<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h3 className="text-lg font-bold tracking-tight text-slate-900">Education</h3>
				<p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
					Add schools, degrees, coursework, honors, and anything else that should be available when tailoring a résumé.
				</p>
			</div>
			<button type="button" onClick={handleAddNew} className="profileAddButton shrink-0">
				+ Add education
			</button>
		</div>
	)

	return (
		<div>
			{headerSection}

			{!hasEntries ? (
				<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
					<p className="text-sm text-slate-600">No education entries yet.</p>
					{hideHeader ? (
						<button type="button" onClick={handleAddNew} className="profileAddButton mt-4">
							+ Add education
						</button>
					) : null}
				</div>
			) : (
				<ul className="space-y-5">
					{localEntries.map((edu, index) => {
						const entryId = getEntryId(edu, index)
						const isExpanded = expandedIds.has(entryId)
						return (
							<li key={edu.id || index}>
								<EducationEntryCard
									edu={edu}
									index={index}
									entryId={entryId}
									isExpanded={isExpanded}
									isDraggable={isDraggable}
									isDragging={draggedEntryIndex === index}
									isDragOver={dragOverEntryIndex === index}
									compact={compact}
									showSubsections={showSubsections}
									onToggle={() => {
										if (Date.now() - lastDragEndRef.current < 150) return
										toggleExpanded(index)
									}}
									onRemove={() => onRemove(index)}
									onFieldChange={handleFieldChange}
									onSubsectionsChange={(subs) => handleSubsectionsChange(index, subs)}
									onReorderDrag={onReorderDrag}
								/>
							</li>
						)
					})}
				</ul>
			)}

			{hasEntries && !hideHeader ? (
				<div className="mt-5 flex justify-end">
					<button type="button" onClick={handleAddNew} className="text-sm font-semibold text-brand-pink-dark hover:underline">
						+ Add another education
					</button>
				</div>
			) : null}
		</div>
	)
})

export default EducationInput
