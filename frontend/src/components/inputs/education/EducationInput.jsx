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
	const [validationErrors, setValidationErrors] = useState(() => new Map())
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
		// clear validation error for this field when user types
		setValidationErrors((prev) => {
			const fields = prev.get(String(entryId))
			if (!fields || !fields.has(field)) return prev
			const next = new Map(prev)
			const nextFields = new Set(fields)
			nextFields.delete(field)
			// also clear 'discipline' when 'field' is typed (they're aliases)
			if (field === 'field') nextFields.delete('discipline')
			if (field === 'discipline') nextFields.delete('field')
			if (nextFields.size === 0) next.delete(String(entryId))
			else next.set(String(entryId), nextFields)
			return next
		})
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

	function hasEntryContent(entry) {
		return [
			entry?.school,
			entry?.degree,
			entry?.discipline,
			entry?.field,
			entry?.minor,
			entry?.location,
			entry?.gpa,
			entry?.startDate,
			entry?.endDate,
			entry?.current ? 'current' : '',
		].some((value) => String(value || '').trim())
	}

	function revealMissingRequired() {
		// find the first entry that has any content but is missing school, degree, or discipline
		const index = localEntries.findIndex((entry) => {
			if (!hasEntryContent(entry)) return false
			const missingSchool = !String(entry?.school || '').trim()
			const missingDegree = !String(entry?.degree || '').trim()
			const missingDiscipline = !String(entry?.discipline || entry?.field || '').trim()
			return missingSchool || missingDegree || missingDiscipline
		})
		// also catch if there are zero real entries (phantom empty entry exists locally)
		const targetIndex = index >= 0 ? index : 0
		const entry = localEntries[targetIndex]
		const entryId = getEntryId(entry, targetIndex)

		// build the set of missing fields for this entry
		const missing = new Set()
		if (!String(entry?.school || '').trim()) missing.add('school')
		if (!String(entry?.degree || '').trim()) missing.add('degree')
		if (!String(entry?.discipline || entry?.field || '').trim()) missing.add('discipline')

		if (missing.size > 0) {
			setValidationErrors(new Map([[entryId, missing]]))
			setExpandedIds((prev) => new Set([...prev, entryId]))
			window.setTimeout(() => {
				const card = document.getElementById(`education-card-${entryId}`)
				// focus the first missing field in order: school → degree → discipline
				const firstField = missing.has('school')
					? `education-school-${entryId}`
					: missing.has('degree')
					? `education-degree-${entryId}`
					: `education-discipline-${entryId}`
				const input = document.getElementById(firstField)
				card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
				input?.focus()
			}, 220)
			return true
		}
		return false
	}

	useImperativeHandle(ref, () => ({
		addNew: handleAddNew,
		revealMissingRequired,
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
					Schools, degrees, coursework, and honors for tailoring your résumé.
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
					<svg
						viewBox="0 0 64 64"
						className="mx-auto mb-1.5 size-16"
						fill="none"
					>
						{/* sparkles */}
						<path d="M6 9l1.6 3.6L11 14.2l-3.4 1.6L6 19.4 4.4 15.8 1 14.2l3.4-1.6z" fill="#f9a8c5" opacity="0.8" />
						<path d="M57 8l1.1 2.5 2.5 1.1-2.5 1.1L57 15l-1.1-2.3-2.5-1.1 2.5-1.1z" fill="#f9a8c5" opacity="0.7" />
						<path d="M55 44l1.3 2.9 2.9 1.3-2.9 1.3L55 52.4l-1.3-2.9-2.9-1.3 2.9-1.3z" fill="#f9a8c5" opacity="0.6" />

						{/* graduation cap */}
						<path
							d="M32 18L8 28l24 10 24-10-24-10z"
							fill="#fce7f0"
							stroke="#ec9bbd"
							strokeWidth="2"
							strokeLinejoin="round"
						/>
						<path
							d="M18 32.5V41c0 3 6.3 5.5 14 5.5s14-2.5 14-5.5v-8.5"
							stroke="#ec9bbd"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M50 29v9.5"
							stroke="#ec9bbd"
							strokeWidth="2"
							strokeLinecap="round"
						/>
						<circle cx="50" cy="40.5" r="2" fill="#ec9bbd" />
					</svg>
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
									invalidFields={validationErrors.get(entryId)}
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
