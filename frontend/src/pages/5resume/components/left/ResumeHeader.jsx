// pages / 5resume / components / left / ResumeHeader.jsx

// smooth closing / opening of collapsible section.
// friendlier text between fields to clarify what each field is for.
// placeholder text for each field.
// input validation, like @ . com for email, etc.
// ability to do a header line.
// ability to add a header image.
// toggle for "https://".
// add your own link sort of thing (more for people not on linkedin, github, etc.)

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash, faGripVertical, faPencil, faCheck } from '@fortawesome/free-solid-svg-icons'
import { RequiredAsterisk } from '@/components/icons'

const DEFAULT_CONTACT_ORDER = ['email', 'phone', 'location', 'linkedin', 'github', 'portfolio']

function mergeHeaderPatch(prev, patch) {
	const base = prev && typeof prev === 'object' ? prev : {}
	const next = { ...base, ...patch }
	if (patch.visibility) {
		next.visibility = { ...(base.visibility || {}), ...patch.visibility }
	}
	return next
}

const ResumeHeader = ({ headerData, onHeaderChange, bare = false }) => {
	const h = headerData && typeof headerData === 'object' ? headerData : {}

	const [editingField, setEditingField] = useState(null)
	const [draggedField, setDraggedField] = useState(null)
	const [dragOverIndex, setDragOverIndex] = useState(null)

	const vis = h.visibility || {}
	const showEmail = vis.showEmail ?? true
	const showPhone = vis.showPhone ?? true
	const showLocation = vis.showLocation ?? true
	const showLinkedin = vis.showLinkedin ?? true
	const showGithub = vis.showGithub ?? true
	const showPortfolio = vis.showPortfolio ?? true
	const showTagline = vis.showTagline ?? true

	const contactOrder =
		Array.isArray(h.contactOrder) && h.contactOrder.length ? h.contactOrder : DEFAULT_CONTACT_ORDER

	const firstName = h.first_name ?? ''
	const lastName = h.last_name ?? ''
	const email = h.email ?? ''
	const phoneValue = h.phone ?? ''
	const locationValue = h.location ?? ''
	const linkedinValue = h.linkedin ?? ''
	const githubValue = h.github ?? ''
	const portfolioValue = h.portfolio ?? ''
	const taglineValue = h.tagline ?? ''

	const patch = (partial) => onHeaderChange(mergeHeaderPatch(h, partial))

	const setShow = (key, value) => patch({ visibility: { [key]: value } })

	const fieldMap = {
		email: {
			label: 'Email',
			value: email,
			setValue: (v) => patch({ email: v }),
			show: showEmail,
			setShow: (v) => setShow('showEmail', v),
		},
		phone: {
			label: 'Phone Number',
			value: phoneValue,
			setValue: (v) => patch({ phone: v }),
			show: showPhone,
			setShow: (v) => setShow('showPhone', v),
		},
		location: {
			label: 'Location',
			value: locationValue,
			setValue: (v) => patch({ location: v }),
			show: showLocation,
			setShow: (v) => setShow('showLocation', v),
		},
		linkedin: {
			label: 'LinkedIn',
			value: linkedinValue,
			setValue: (v) => patch({ linkedin: v }),
			show: showLinkedin,
			setShow: (v) => setShow('showLinkedin', v),
		},
		github: {
			label: 'GitHub',
			value: githubValue,
			setValue: (v) => patch({ github: v }),
			show: showGithub,
			setShow: (v) => setShow('showGithub', v),
		},
		portfolio: {
			label: 'Portfolio',
			value: portfolioValue,
			setValue: (v) => patch({ portfolio: v }),
			show: showPortfolio,
			setShow: (v) => setShow('showPortfolio', v),
		},
	}

	const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || ''

	const doneBtn = () => (
		<button
			type="button"
			data-done-btn
			onClick={() => {
				setTimeout(() => setEditingField(null), 0)
			}}
			className="p-2 rounded-md text-brand-pink bg-brand-pink/10 hover:bg-brand-pink/15 transition-colors"
			aria-label="Done"
			title="Done"
		>
			<FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
		</button>
	)

	const handleInputBlur = (e) => {
		if (e.relatedTarget?.closest?.('[data-done-btn]')) return
		setEditingField(null)
	}

	const pencilBtn = (fieldKey, label) => (
		<button
			type="button"
			onClick={() => setEditingField(fieldKey)}
			className="p-2 rounded-md text-gray-400 hover:text-brand-pink hover:bg-gray-50 transition-colors"
			aria-label={label}
			title={label}
		>
			<FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5" />
		</button>
	)

	const taglineRow = (
		<div className="flex items-center gap-4 py-3.5">
			<label className="w-28 flex-shrink-0 text-sm font-medium text-gray-500">Tagline</label>
			<div className="flex-1 min-w-0 flex items-center gap-3">
				{editingField === 'tagline' ? (
					<>
						<input
							type="text"
							value={taglineValue}
							onBlur={handleInputBlur}
							onChange={(e) => patch({ tagline: e.target.value })}
							onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
							className="input py-1.5 text-sm flex-1 disabled:opacity-60"
							disabled={!showTagline}
							placeholder="**Bold** · _italic_ · type * for middle dots (·)"
							autoFocus
						/>
						<button
							type="button"
							onClick={() => patch({ visibility: { showTagline: !showTagline } })}
							className="p-2 rounded-md text-gray-400 hover:text-brand-pink hover:bg-gray-50 transition-colors"
							title={showTagline ? 'Hide on resume' : 'Show on resume'}
						>
							<FontAwesomeIcon icon={showTagline ? faEye : faEyeSlash} className="w-3.5 h-3.5" />
						</button>
						{doneBtn()}
					</>
				) : (
					<>
						<span className={`text-sm flex-1 ${taglineValue ? 'text-gray-900' : 'text-gray-400'}`}>
							{taglineValue || 'Optional line below your name'}
						</span>
						<button
							type="button"
							onClick={() => patch({ visibility: { showTagline: !showTagline } })}
							className="p-2 rounded-md text-gray-400 hover:text-brand-pink hover:bg-gray-50 transition-colors"
							title={showTagline ? 'Hide on resume' : 'Show on resume'}
						>
							<FontAwesomeIcon icon={showTagline ? faEye : faEyeSlash} className="w-3.5 h-3.5" />
						</button>
						{pencilBtn('tagline', 'Edit tagline')}
					</>
				)}
			</div>
		</div>
	)

	const nameRow = (
		<div className="flex items-center gap-4 py-4">
			<label className="w-28 flex-shrink-0 text-sm font-medium text-gray-500">
				Your name <RequiredAsterisk />
			</label>
			<div className="flex-1 min-w-0 flex items-center gap-3">
				{editingField === 'name' ? (
					<>
						<input
							type="text"
							value={firstName + (lastName ? ' ' + lastName : '')}
							onBlur={handleInputBlur}
							onChange={(e) => {
								const val = e.target.value
								const lastSpaceIndex = val.lastIndexOf(' ')
								if (lastSpaceIndex === -1) {
									patch({ first_name: val, last_name: '' })
								} else {
									const afterSpace = val.substring(lastSpaceIndex + 1)
									if (afterSpace.length > 0) {
										patch({ first_name: val.substring(0, lastSpaceIndex), last_name: afterSpace })
									} else {
										patch({ first_name: val, last_name: '' })
									}
								}
							}}
							onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
							className="input py-1.5 text-sm flex-1"
							placeholder="First and last name"
							autoFocus
						/>
						{doneBtn()}
					</>
				) : (
					<>
						<span className={`text-sm flex-1 ${fullName ? 'text-gray-900' : 'text-gray-400'}`}>
							{fullName || 'Add your name'}
						</span>
						{pencilBtn('name', 'Edit name')}
					</>
				)}
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
				draggable={!isEditing}
				onDragStart={(e) => {
					setDraggedField(fieldKey)
					e.dataTransfer.effectAllowed = 'move'
					e.dataTransfer.setData('text/plain', fieldKey)
				}}
				onDragOver={(e) => {
					e.preventDefault()
					e.dataTransfer.dropEffect = 'move'
					setDragOverIndex(index)
				}}
				onDragLeave={() => setDragOverIndex(null)}
				onDrop={(e) => {
					e.preventDefault()
					if (!draggedField || draggedField === fieldKey) return
					const di = contactOrder.indexOf(draggedField)
					if (di === -1 || di === index) return
					const next = [...contactOrder]
					const [removed] = next.splice(di, 1)
					next.splice(index, 0, removed)
					patch({ contactOrder: next })
					setDraggedField(null)
					setDragOverIndex(null)
				}}
				onDragEnd={() => {
					setDraggedField(null)
					setDragOverIndex(null)
				}}
				className={`flex items-center gap-4 py-3.5 transition-colors
					${isDragOver ? 'bg-gray-50/80 rounded-lg -mx-1 px-2' : ''}
					${isDragging ? 'opacity-50' : ''}`}
			>
				<div className="w-28 flex-shrink-0 flex items-center gap-4">
					<FontAwesomeIcon icon={faGripVertical} className="w-3.5 h-3.5 text-gray-300 cursor-move flex-shrink-0" />
					<label className="text-sm font-medium text-gray-500">{field.label}</label>
				</div>
				<div className="flex-1 min-w-0 flex items-center gap-3">
					{isEditing ? (
						<>
							<input
								type="text"
								value={field.value}
								onBlur={handleInputBlur}
								onChange={(e) => field.setValue(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
								className="input py-1.5 text-sm flex-1 disabled:opacity-60"
								disabled={!field.show}
								placeholder={field.label}
								autoFocus
							/>
							<button
								type="button"
								onClick={() => field.setShow(!field.show)}
								className="p-2 rounded-md text-gray-400 hover:text-brand-pink hover:bg-gray-50 transition-colors"
								title={field.show ? 'Hide on resume' : 'Show on resume'}
							>
								<FontAwesomeIcon icon={field.show ? faEye : faEyeSlash} className="w-3.5 h-3.5" />
							</button>
							{doneBtn()}
						</>
					) : (
						<>
							<span className={`text-sm flex-1 ${field.value ? 'text-gray-900' : 'text-gray-400'}`}>
								{field.value || `Add ${field.label.toLowerCase()}`}
							</span>
							<button
								type="button"
								onClick={() => field.setShow(!field.show)}
								className="p-2 rounded-md text-gray-400 hover:text-brand-pink hover:bg-gray-50 transition-colors"
								title={field.show ? 'Hide on resume' : 'Show on resume'}
							>
								<FontAwesomeIcon icon={field.show ? faEye : faEyeSlash} className="w-3.5 h-3.5" />
							</button>
							{pencilBtn(fieldKey, `Edit ${field.label}`)}
						</>
					)}
				</div>
			</div>
		)
	}

	const content = (
		<div className="divide-y divide-gray-100">
			{nameRow}
			{taglineRow}
			{contactOrder.map((key, i) => {
				const f = fieldMap[key]
				return f ? contactRow(key, f, i) : null
			})}
		</div>
	)

	if (bare) {
		return <div className="px-4 py-5">{content}</div>
	}

	return (
		<div className="mb-4">
			<h2 className="text-lg font-semibold text-gray-900 mb-3">Resume Header</h2>
			{content}
		</div>
	)
}

export default ResumeHeader
