import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { shouldDefaultToBullets, paragraphToBullets, bulletsToParagraph } from '@/utils/descriptionHelpers'
import ProjectEntryCard from './ProjectEntryCard'

const EMPTY_ENTRY = () => ({
	id: Date.now(),
	title: '',
	description: '',
	techStack: [],
	url: '',
})

const ProjectsInput = forwardRef(function ProjectsInput(
	{ projects, onAdd, onRemove, onUpdate, onReorder, compact = false, hideHeader = false },
	ref,
) {
	const getEntryId = (entry, index) => String(entry?.id ?? index)
	const [expandedIds, setExpandedIds] = useState(() => new Set())
	const [validationErrors, setValidationErrors] = useState(() => new Map())
	const [localEntries, setLocalEntries] = useState(projects)
	const [descriptionModes, setDescriptionModes] = useState({})
	const [descriptionBullets, setDescriptionBullets] = useState({})
	const [draggedEntryIndex, setDraggedEntryIndex] = useState(null)
	const [dragOverEntryIndex, setDragOverEntryIndex] = useState(null)
	const prevLengthRef = useRef(projects.length)
	const prevIdsRef = useRef(projects.map((p) => p.id || p).join(','))
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
			let card = document.getElementById(`project-card-${targetId}`)
			let input = document.getElementById(`project-title-${targetId}`)
			if ((!card || !input) && localEntries.length > 0) {
				const lastIdx = localEntries.length - 1
				const fallbackId = getEntryId(localEntries[lastIdx], lastIdx)
				card = card || document.getElementById(`project-card-${fallbackId}`)
				input = input || document.getElementById(`project-title-${fallbackId}`)
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

	// Sync structure changes from parent; preserve in-progress techStack when parent re-renders before save.
	useEffect(() => {
		const currentLength = projects.length
		const currentIds = projects.map((p) => p.id || p).join(',')

		if (currentLength !== prevLengthRef.current || currentIds !== prevIdsRef.current) {
			const merged = projects.map((proj, i) => {
				const local = localEntries[i]
				if (!local) return proj
				const localArr = Array.isArray(local.techStack)
					? local.techStack
					: local.techStack
						? String(local.techStack)
								.split(',')
								.map((t) => t.trim())
								.filter(Boolean)
						: []
				const projArr = Array.isArray(proj.techStack)
					? proj.techStack
					: proj.techStack
						? String(proj.techStack)
								.split(',')
								.map((t) => t.trim())
								.filter(Boolean)
						: []
				if (localArr.length > 0 && projArr.length === 0) return { ...proj, techStack: localArr }
				return proj
			})
			setLocalEntries(merged)
			setDescriptionModes({})
			setDescriptionBullets({})

			if (currentLength > prevLengthRef.current && prevLengthRef.current > 0 && currentLength === prevLengthRef.current + 1) {
				setExpandedIds((prev) => {
					const next = new Set(prev)
					const newEntry = projects[currentLength - 1]
					next.add(getEntryId(newEntry, currentLength - 1))
					return next
				})
			} else if (currentLength > prevLengthRef.current) {
				const delta = currentLength - prevLengthRef.current
				if (delta === 1 && prevLengthRef.current === 0) {
					const newEntry = projects[currentLength - 1]
					setExpandedIds(new Set([getEntryId(newEntry, currentLength - 1)]))
				} else if (delta > 1) {
					setExpandedIds(new Set())
				}
			} else {
				const ids = new Set(projects.map((e, i) => getEntryId(e, i)))
				setExpandedIds((prev) => new Set([...prev].filter((id) => ids.has(id))))
			}

			prevLengthRef.current = currentLength
			prevIdsRef.current = currentIds
		}
	}, [projects])

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
		// clear validation error for this field when user types
		setValidationErrors((prev) => {
			const fields = prev.get(String(entryId))
			if (!fields || !fields.has(field)) return prev
			const next = new Map(prev)
			const nextFields = new Set(fields)
			nextFields.delete(field)
			if (nextFields.size === 0) next.delete(String(entryId))
			else next.set(String(entryId), nextFields)
			return next
		})
		const updatedEntry = { ...localEntries[index], [field]: value }
		const newEntries = [...localEntries]
		newEntries[index] = updatedEntry
		setLocalEntries(newEntries)

		const backendEntry = { ...updatedEntry }
		if (field === 'techStack' && typeof backendEntry.techStack === 'string') {
			const parsed = backendEntry.techStack
				.split(',')
				.map((tech) => tech.trim())
				.filter((tech) => tech.length > 0)
			if (parsed.length > 0) backendEntry.techStack = parsed
			else if (backendEntry.techStack.length === 0) backendEntry.techStack = []
			else {
				const prev = localEntries[index]?.techStack
				backendEntry.techStack = Array.isArray(prev)
					? prev
					: prev
						? String(prev)
								.split(',')
								.map((t) => t.trim())
								.filter(Boolean)
						: []
			}
		}
		onUpdate(index, backendEntry)
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
			handleFieldChange(index, 'description', bullets.filter((b) => b.trim()).join('\n'))
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
		setLocalEntries((prev) => (projects.length === 0 ? [newEntry] : [...prev, newEntry]))
		setExpandedIds((prev) => new Set([...prev, idKey]))
		onAdd(newEntry)
	}

	function hasDescriptionContent(description) {
		if (Array.isArray(description)) return description.some((line) => String(line || '').trim())
		return Boolean(String(description || '').trim())
	}

	function hasEntryContent(entry) {
		return Boolean(String(entry?.title || '').trim()) || hasDescriptionContent(entry?.description)
	}

	function revealMissingRequired() {
		const index = localEntries.findIndex((entry) => {
			if (!hasEntryContent(entry)) return false
			const missingTitle = !String(entry?.title || '').trim()
			const missingDesc = !hasDescriptionContent(entry?.description)
			return missingTitle || missingDesc
		})
		const targetIndex = index >= 0 ? index : 0
		const entry = localEntries[targetIndex]
		const entryId = getEntryId(entry, targetIndex)

		const missing = new Set()
		if (!String(entry?.title || '').trim()) missing.add('title')
		if (!hasDescriptionContent(entry?.description)) missing.add('description')

		if (missing.size > 0) {
			setValidationErrors(new Map([[entryId, missing]]))
			setExpandedIds((prev) => new Set([...prev, entryId]))
			window.setTimeout(() => {
				const card = document.getElementById(`project-card-${entryId}`)
				const input = document.getElementById(`project-title-${entryId}`)
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
	const hasEntries = projects.length > 0

	const headerSection = hideHeader ? null : (
		<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h3 className="text-lg font-bold tracking-tight text-slate-900">Projects</h3>
				<p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
					Portfolio work, technical projects, case studies, and outcomes.
				</p>
			</div>
			<button type="button" onClick={handleAddNew} className="profileAddButton shrink-0">
				+ Add project
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

						{/* clipboard */}
						<rect x="16" y="16" width="32" height="38" rx="4" fill="#fce7f0" stroke="#ec9bbd" strokeWidth="1.75" strokeLinejoin="round" />
						<rect x="25" y="13" width="14" height="7" rx="2.5" fill="#fdf2f8" stroke="#ec9bbd" strokeWidth="1.75" strokeLinejoin="round" />
						<path d="M22 28h20" stroke="#ec9bbd" strokeWidth="1.75" strokeLinecap="round" opacity="0.85" />
						<path d="M22 35h20" stroke="#ec9bbd" strokeWidth="1.75" strokeLinecap="round" opacity="0.7" />
						<path d="M22 42h12" stroke="#ec9bbd" strokeWidth="1.75" strokeLinecap="round" opacity="0.55" />
					</svg>
					<p className="text-sm text-slate-600">No projects yet.</p>
					{hideHeader ? (
						<button type="button" onClick={handleAddNew} className="profileAddButton mt-4">
							+ Add project
						</button>
					) : null}
				</div>
			) : (
				<ul className="space-y-5">
					{localEntries.map((proj, index) => {
						const entryId = getEntryId(proj, index)
						const isExpanded = expandedIds.has(entryId)
						return (
							<li key={proj.id || index}>
								<ProjectEntryCard
									proj={proj}
									index={index}
									entryId={entryId}
									isExpanded={isExpanded}
									isDraggable={isDraggable}
									isDragging={draggedEntryIndex === index}
									isDragOver={dragOverEntryIndex === index}
									compact={compact}
									descriptionMode={descriptionModes[index] || 'paragraph'}
									descriptionBullets={descriptionBullets[index] || ['']}
									invalidFields={validationErrors.get(entryId)}
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
						+ Add another project
					</button>
				</div>
			) : null}
		</div>
	)
})

export default ProjectsInput
