import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faEye, faEyeSlash, faGripVertical, faPencil } from '@fortawesome/free-solid-svg-icons'
import { RequiredAsterisk } from '@/components/icons'

const DEFAULT_CONTACT_ORDER = ['email', 'phone', 'location', 'linkedin', 'github', 'portfolio']

function mergeHeaderPatch(previous, patch) {
	const base = previous && typeof previous === 'object' ? previous : {}
	const next = { ...base, ...patch }
	if (patch.visibility) {
		next.visibility = { ...(base.visibility || {}), ...patch.visibility }
	}
	return next
}

const ResumeHeader = ({ headerData, onHeaderChange, bare = false }) => {
	const header = headerData && typeof headerData === 'object' ? headerData : {}
	const [editingField, setEditingField] = useState(null)
	const [draggedField, setDraggedField] = useState(null)
	const [dragOverIndex, setDragOverIndex] = useState(null)

	const visibility = header.visibility || {}
	const contactOrder =
		Array.isArray(header.contactOrder) && header.contactOrder.length
			? header.contactOrder
			: DEFAULT_CONTACT_ORDER

	const patch = (partial) => onHeaderChange(mergeHeaderPatch(header, partial))
	const setShow = (key, value) => patch({ visibility: { [key]: value } })

	const firstName = header.first_name ?? ''
	const lastName = header.last_name ?? ''
	const taglineValue = header.tagline ?? ''
	const showTagline = visibility.showTagline ?? true
	const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()

	const fieldMap = {
		email: {
			label: 'Email',
			value: header.email ?? '',
			setValue: (value) => patch({ email: value }),
			show: visibility.showEmail ?? true,
			setShow: (value) => setShow('showEmail', value),
		},
		phone: {
			label: 'Phone',
			value: header.phone ?? '',
			setValue: (value) => patch({ phone: value }),
			show: visibility.showPhone ?? true,
			setShow: (value) => setShow('showPhone', value),
		},
		location: {
			label: 'Location',
			value: header.location ?? '',
			setValue: (value) => patch({ location: value }),
			show: visibility.showLocation ?? true,
			setShow: (value) => setShow('showLocation', value),
		},
		linkedin: {
			label: 'LinkedIn',
			value: header.linkedin ?? '',
			setValue: (value) => patch({ linkedin: value }),
			show: visibility.showLinkedin ?? true,
			setShow: (value) => setShow('showLinkedin', value),
		},
		github: {
			label: 'GitHub',
			value: header.github ?? '',
			setValue: (value) => patch({ github: value }),
			show: visibility.showGithub ?? true,
			setShow: (value) => setShow('showGithub', value),
		},
		portfolio: {
			label: 'Portfolio',
			value: header.portfolio ?? '',
			setValue: (value) => patch({ portfolio: value }),
			show: visibility.showPortfolio ?? true,
			setShow: (value) => setShow('showPortfolio', value),
		},
	}

	const handleInputBlur = (event) => {
		if (event.relatedTarget?.closest?.('[data-done-btn]')) return
		setEditingField(null)
	}

	const doneButton = () => (
		<button
			type="button"
			data-done-btn
			onClick={() => setTimeout(() => setEditingField(null), 0)}
			className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-pink/10 text-brand-pink transition-colors hover:bg-brand-pink/15"
			aria-label="Done editing"
			title="Done"
		>
			<FontAwesomeIcon icon={faCheck} className="size-3.5" />
		</button>
	)

	const pencilButton = (fieldKey, label) => (
		<button
			type="button"
			onClick={() => setEditingField(fieldKey)}
			className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-brand-pink/[0.06] hover:text-brand-pink"
			aria-label={label}
			title={label}
		>
			<FontAwesomeIcon icon={faPencil} className="size-3.5" />
		</button>
	)

	const visibilityButton = (visible, onClick, label) => (
		<button
			type="button"
			onClick={onClick}
			className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-brand-pink/[0.06] hover:text-brand-pink"
			title={visible ? `Hide ${label} on resume` : `Show ${label} on resume`}
			aria-label={visible ? `Hide ${label} on resume` : `Show ${label} on resume`}
		>
			<FontAwesomeIcon icon={visible ? faEye : faEyeSlash} className="size-3.5" />
		</button>
	)

	const rowClass =
		'grid min-w-0 grid-cols-[1rem_minmax(5.25rem,6.5rem)_minmax(0,1fr)_4.5rem] items-center gap-2 py-3.5'

	const nameRow = (
		<div className={rowClass}>
			<span aria-hidden />
			<label className="truncate text-sm font-semibold text-gray-600">
				Your name <RequiredAsterisk />
			</label>
			<div className="min-w-0 overflow-hidden">
				{editingField === 'name' ? (
					<input
						type="text"
						value={firstName + (lastName ? ` ${lastName}` : '')}
						onBlur={handleInputBlur}
						onChange={(event) => {
							const value = event.target.value
							const lastSpaceIndex = value.lastIndexOf(' ')
							if (lastSpaceIndex === -1) {
								patch({ first_name: value, last_name: '' })
								return
							}
							const trailingValue = value.substring(lastSpaceIndex + 1)
							if (trailingValue) {
								patch({
									first_name: value.substring(0, lastSpaceIndex),
									last_name: trailingValue,
								})
							} else {
								patch({ first_name: value, last_name: '' })
							}
						}}
						onKeyDown={(event) => event.key === 'Enter' && setEditingField(null)}
						className="input w-full min-w-0 max-w-full py-1.5 text-sm"
						placeholder="First and last name"
						autoFocus
					/>
				) : (
					<p
						className={`truncate text-sm ${fullName ? 'font-medium text-gray-900' : 'text-gray-400'}`}
						title={fullName || 'Add your name'}
					>
						{fullName || 'Add your name'}
					</p>
				)}
			</div>
			<div className="flex w-[4.5rem] justify-end">
				{editingField === 'name' ? doneButton() : pencilButton('name', 'Edit name')}
			</div>
		</div>
	)

	const taglineRow = (
		<div className={rowClass}>
			<span aria-hidden />
			<label className="truncate text-sm font-semibold text-gray-600">Tagline</label>
			<div className="min-w-0 overflow-hidden">
				{editingField === 'tagline' ? (
					<input
						type="text"
						value={taglineValue}
						onBlur={handleInputBlur}
						onChange={(event) => patch({ tagline: event.target.value })}
						onKeyDown={(event) => event.key === 'Enter' && setEditingField(null)}
						className="input w-full min-w-0 max-w-full py-1.5 text-sm disabled:opacity-60"
						disabled={!showTagline}
						placeholder="Optional line below your name"
						autoFocus
					/>
				) : (
					<p
						className={`truncate text-sm ${taglineValue ? 'text-gray-900' : 'text-gray-400'} ${showTagline ? '' : 'opacity-55'}`}
						title={taglineValue || 'Optional line below your name'}
					>
						{taglineValue || 'Optional line below your name'}
					</p>
				)}
			</div>
			<div className="flex w-[4.5rem] justify-end gap-1">
				{visibilityButton(
					showTagline,
					() => patch({ visibility: { showTagline: !showTagline } }),
					'tagline',
				)}
				{editingField === 'tagline'
					? doneButton()
					: pencilButton('tagline', 'Edit tagline')}
			</div>
		</div>
	)

	const contactRow = (fieldKey, field, index) => {
		const isEditing = editingField === fieldKey
		const isDragging = draggedField === fieldKey
		const isDragOver = dragOverIndex === index

		return (
			<div
				key={fieldKey}
				onDragOver={(event) => {
					event.preventDefault()
					event.dataTransfer.dropEffect = 'move'
					setDragOverIndex(index)
				}}
				onDragLeave={() => setDragOverIndex(null)}
				onDrop={(event) => {
					event.preventDefault()
					if (!draggedField || draggedField === fieldKey) return
					const draggedIndex = contactOrder.indexOf(draggedField)
					if (draggedIndex === -1 || draggedIndex === index) return
					const nextOrder = [...contactOrder]
					const [removed] = nextOrder.splice(draggedIndex, 1)
					nextOrder.splice(index, 0, removed)
					patch({ contactOrder: nextOrder })
					setDraggedField(null)
					setDragOverIndex(null)
				}}
				className={[
					rowClass,
					'transition-colors',
					isDragOver ? '-mx-1 rounded-xl bg-brand-pink/[0.035] px-2' : '',
					isDragging ? 'opacity-50' : '',
				].join(' ')}
			>
				<button
					type="button"
					draggable={!isEditing}
					onDragStart={(event) => {
						setDraggedField(fieldKey)
						event.dataTransfer.effectAllowed = 'move'
						event.dataTransfer.setData('text/plain', fieldKey)
					}}
					onDragEnd={() => {
						setDraggedField(null)
						setDragOverIndex(null)
					}}
					disabled={isEditing}
					className="flex size-6 -ml-1 cursor-grab items-center justify-center rounded-md text-gray-300 transition hover:bg-gray-50 hover:text-gray-500 active:cursor-grabbing disabled:cursor-default"
					aria-label={`Drag to reorder ${field.label}`}
					title={`Drag to reorder ${field.label}`}
				>
					<FontAwesomeIcon icon={faGripVertical} className="size-3.5" />
				</button>

				<label className="truncate text-sm font-semibold text-gray-600" title={field.label}>
					{field.label}
				</label>

				<div className="min-w-0 overflow-hidden">
					{isEditing ? (
						<input
							type="text"
							value={field.value}
							onBlur={handleInputBlur}
							onChange={(event) => field.setValue(event.target.value)}
							onKeyDown={(event) => event.key === 'Enter' && setEditingField(null)}
							className="input w-full min-w-0 max-w-full py-1.5 text-sm disabled:opacity-60"
							disabled={!field.show}
							placeholder={field.label}
							autoFocus
						/>
					) : (
						<p
							className={`truncate text-sm ${field.value ? 'text-gray-900' : 'text-gray-400'} ${field.show ? '' : 'opacity-55'}`}
							title={field.value || `Add ${field.label.toLowerCase()}`}
						>
							{field.value || `Add ${field.label.toLowerCase()}`}
						</p>
					)}
				</div>

				<div className="flex w-[4.5rem] justify-end gap-1">
					{visibilityButton(field.show, () => field.setShow(!field.show), field.label)}
					{isEditing
						? doneButton()
						: pencilButton(fieldKey, `Edit ${field.label}`)}
				</div>
			</div>
		)
	}

	const content = (
		<div className="min-w-0 divide-y divide-gray-100 overflow-hidden">
			{nameRow}
			{taglineRow}
			{contactOrder.map((key, index) => {
				const field = fieldMap[key]
				return field ? contactRow(key, field, index) : null
			})}
		</div>
	)

	if (bare) {
		return <div className="min-w-0 overflow-hidden px-4 py-4">{content}</div>
	}

	return (
		<div className="mb-4 min-w-0 overflow-hidden">
			<h2 className="mb-3 text-lg font-semibold text-gray-900">Resume Header</h2>
			{content}
		</div>
	)
}

export default ResumeHeader
