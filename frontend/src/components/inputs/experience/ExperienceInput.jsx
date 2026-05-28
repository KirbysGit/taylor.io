import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { shouldDefaultToBullets, paragraphToBullets, bulletsToParagraph } from '@/utils/descriptionHelpers'
import ExperienceEntryCard from './ExperienceEntryCard'

const EMPTY_ENTRY = () => ({
	id: Date.now(),
	title: '',
	company: '',
	description: '',
	skills: '',
	location: '',
	startDate: '',
	endDate: '',
	current: false,
})

const ExperienceInput = forwardRef(function ExperienceInput(
	{ experiences, onAdd, onRemove, onUpdate, onReorder, compact = false, hideHeader = false },
	ref,
) {
	const entries = experiences.length > 0 ? experiences : [EMPTY_ENTRY()]

	const getEntryId = (entry, index) => String(entry?.id ?? index)
	const [expandedIds, setExpandedIds] = useState(() => new Set())
	const [localEntries, setLocalEntries] = useState(entries)
	const [descriptionModes, setDescriptionModes] = useState({})
	const [descriptionBullets, setDescriptionBullets] = useState({})
	const [draggedEntryIndex, setDraggedEntryIndex] = useState(null)
	const [dragOverEntryIndex, setDragOverEntryIndex] = useState(null)
	const prevLengthRef = useRef(experiences.length)
	const prevIdsRef = useRef(experiences.map((e) => e.id || e).join(','))
	const savedEndDatesRef = useRef(new Map())
	const lastDragEndRef = useRef(0)
	const pendingTitleFocusEntryIdRef = useRef(null)

	useEffect(() => {
		const targetId = pendingTitleFocusEntryIdRef.current
		if (targetId == null) return
		const isOpen = [...expandedIds].some((id) => String(id) === targetId)
		if (!isOpen) return

		let cancelled = false
		const t = window.setTimeout(() => {
			if (cancelled) return
			let card = document.getElementById(`experience-card-${targetId}`)
			let input = document.getElementById(`experience-title-${targetId}`)
			if ((!card || !input) && localEntries.length > 0) {
				const lastIdx = localEntries.length - 1
				const fallbackId = getEntryId(localEntries[lastIdx], lastIdx)
				card = card || document.getElementById(`experience-card-${fallbackId}`)
				input = input || document.getElementById(`experience-title-${fallbackId}`)
			}
			card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
			input?.focus()
			input?.select()
			pendingTitleFocusEntryIdRef.current = null
		}, 200)

		return () => {
			cancelled = true
			window.clearTimeout(t)
		}
	}, [localEntries, expandedIds])

	useEffect(() => {
		const currentLength = experiences.length
		const currentIds = experiences.map((e) => e.id || e).join(',')

		if (currentLength !== prevLengthRef.current || currentIds !== prevIdsRef.current) {
			const newEntries = experiences.length > 0 ? experiences : [EMPTY_ENTRY()]
			setLocalEntries(newEntries)
			setDescriptionModes({})
			setDescriptionBullets({})

			if (currentLength > prevLengthRef.current && prevLengthRef.current > 0 && currentLength === prevLengthRef.current + 1) {
				setExpandedIds((prev) => {
					const next = new Set(prev)
					const newEntry = newEntries[currentLength - 1]
					next.add(getEntryId(newEntry, currentLength - 1))
					return next
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
	}, [experiences])

	// Default bullet vs paragraph from stored description when an entry first appears locally.
	useEffect(() => {
		localEntries.forEach((entry, index) => {
			if (descriptionModes[index] !== undefined) return
			const desc = entry.description || ''
			const useBullets = shouldDefaultToBullets(desc)
			setDescriptionModes((prev) => ({ ...prev, [index]: useBullets ? 'bullets' : 'paragraph' }))
			if (useBullets) {
				setDescriptionBullets((prev) => ({ ...prev, [index]: paragraphToBullets(desc) }))
			} else {
				setDescriptionBullets((prev) => ({ ...prev, [index]: [''] }))
			}
		})
	}, [localEntries])

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

	const handleDescriptionChange = (index, value) => {
		handleFieldChange(index, 'description', value)
	}

	const handleDescriptionModeToggle = (index) => {
		const currentMode = descriptionModes[index] || 'paragraph'
		const newMode = currentMode === 'paragraph' ? 'bullets' : 'paragraph'
		const currentDescription = localEntries[index]?.description || ''

		if (newMode === 'bullets') {
			const bullets = paragraphToBullets(currentDescription)
			setDescriptionBullets((prev) => ({ ...prev, [index]: bullets.length > 0 ? bullets : [''] }))
			handleFieldChange(index, 'description', bulletsToParagraph(bullets))
		} else {
			const bullets = descriptionBullets[index] || ['']
			const paragraph = bullets.filter((b) => b.trim()).join('\n')
			handleFieldChange(index, 'description', paragraph)
		}

		setDescriptionModes((prev) => ({ ...prev, [index]: newMode }))
	}

	const handleBulletChange = (index, bulletIndex, value) => {
		const currentBullets = descriptionBullets[index] || ['']
		const newBullets = [...currentBullets]
		newBullets[bulletIndex] = value
		setDescriptionBullets((prev) => ({ ...prev, [index]: newBullets }))
		handleFieldChange(index, 'description', bulletsToParagraph(newBullets))
	}

	const handleAddBullet = (index) => {
		const currentBullets = descriptionBullets[index] || ['']
		setDescriptionBullets((prev) => ({ ...prev, [index]: [...currentBullets, ''] }))
	}

	const handleRemoveBullet = (index, bulletIndex) => {
		const currentBullets = descriptionBullets[index] || ['']
		if (currentBullets.length <= 1) return
		const newBullets = currentBullets.filter((_, i) => i !== bulletIndex)
		setDescriptionBullets((prev) => ({ ...prev, [index]: newBullets }))
		handleFieldChange(index, 'description', bulletsToParagraph(newBullets))
	}

	function handleAddNew() {
		const newEntry = EMPTY_ENTRY()
		const idKey = getEntryId(newEntry, 0)
		pendingTitleFocusEntryIdRef.current = idKey
		setLocalEntries((prev) => (experiences.length === 0 ? [newEntry] : [...prev, newEntry]))
		setExpandedIds((prev) => new Set([...prev, idKey]))
		onAdd(newEntry)
	}

	function hasDescriptionContent(description) {
		if (Array.isArray(description)) return description.some((line) => String(line || '').trim())
		return Boolean(String(description || '').trim())
	}

	function hasEntryContent(entry) {
		return [
			entry?.title,
			entry?.company,
			entry?.location,
			entry?.skills,
			entry?.startDate,
			entry?.endDate,
			hasDescriptionContent(entry?.description) ? 'description' : '',
		].some((value) => String(value || '').trim())
	}

	function revealMissingRequired() {
		const index = localEntries.findIndex((entry) => hasEntryContent(entry) && !String(entry?.title || '').trim())
		if (index < 0) return false
		const entryId = getEntryId(localEntries[index], index)
		setExpandedIds((prev) => new Set([...prev, entryId]))
		window.setTimeout(() => {
			const card = document.getElementById(`experience-card-${entryId}`)
			const input = document.getElementById(`experience-title-${entryId}`)
			card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
			input?.focus()
		}, 220)
		return true
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
		setLocalEntries(reordered)
		setDescriptionModes({})
		setDescriptionBullets({})
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
	const hasEntries = experiences.length > 0

	const headerSection = hideHeader ? null : (
		<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h3 className="text-lg font-bold tracking-tight text-slate-900">Work experience</h3>
				<p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
					Roles, companies, responsibilities, impact, and tools you used.
				</p>
			</div>
			<button type="button" onClick={handleAddNew} className="profileAddButton shrink-0">
				+ Add experience
			</button>
		</div>
	)

	return (
		<div>
			{headerSection}

			{!hasEntries ? (
				<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
					<p className="text-sm text-slate-600">No experience entries yet.</p>
					{hideHeader ? (
						<button type="button" onClick={handleAddNew} className="profileAddButton mt-4">
							+ Add experience
						</button>
					) : null}
				</div>
			) : (
				<ul className="space-y-5">
					{localEntries.map((exp, index) => {
						const entryId = getEntryId(exp, index)
						const isExpanded = expandedIds.has(entryId)
						return (
							<li key={exp.id || index}>
								<ExperienceEntryCard
									exp={exp}
									index={index}
									entryId={entryId}
									isExpanded={isExpanded}
									isDraggable={isDraggable}
									isDragging={draggedEntryIndex === index}
									isDragOver={dragOverEntryIndex === index}
									compact={compact}
									descriptionMode={descriptionModes[index] || 'paragraph'}
									descriptionBullets={descriptionBullets[index] || ['']}
									onToggle={() => {
										if (Date.now() - lastDragEndRef.current < 150) return
										toggleExpanded(index)
									}}
									onRemove={() => onRemove(index)}
									onFieldChange={handleFieldChange}
									onDescriptionChange={handleDescriptionChange}
									onDescriptionModeToggle={handleDescriptionModeToggle}
									onBulletChange={handleBulletChange}
									onAddBullet={handleAddBullet}
									onRemoveBullet={handleRemoveBullet}
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
						+ Add another experience
					</button>
				</div>
			) : null}
		</div>
	)
})

export default ExperienceInput
