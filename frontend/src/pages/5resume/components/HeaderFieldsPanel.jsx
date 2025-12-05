// components/HeaderFieldsPanel.jsx
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock } from '@fortawesome/free-solid-svg-icons'
/**
 * Header fields editor panel (inline on the left sidebar).
 * Handles per-field visibility toggles and value editing.
 */
function HeaderFieldsPanel({
	headerFields,
	headerVisibility,
	headerOrder,
	onFieldChange,
	onToggleVisibility,
	onReorder
}) {
	const fieldsMap = {
		name: { key: 'name', label: 'Name' },
		email: { key: 'email', label: 'Email' },
		github: { key: 'github', label: 'GitHub' },
		linkedin: { key: 'linkedin', label: 'LinkedIn' },
		portfolio: { key: 'portfolio', label: 'Portfolio' },
		phone_number: { key: 'phone_number', label: 'Phone' },
		location: { key: 'location', label: 'Location' },
	}

	const handleDragStart = (e, key) => {
		e.dataTransfer.setData('text/plain', key)
	}

	const handleDragOver = (e) => {
		e.preventDefault()
	}

	const handleDrop = (e, targetKey) => {
		e.preventDefault()
		const fromKey = e.dataTransfer.getData('text/plain')
		if (fromKey) {
			onReorder(fromKey, targetKey)
		}
	}

	// name is locked at top (not draggable)
	const nameField = fieldsMap.name

	return (
		<div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
			<div className="flex items-center justify-between mb-3">
				<h3 className="text-sm font-semibold text-gray-900">Header fields</h3>
				<span className="text-xs text-gray-500">Shown/hidden per field</span>
			</div>
			<div className="space-y-3">
				{/* Locked name at top, inline style */}
				<div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
					<div className="flex items-center justify-center text-gray-400 select-none">
						<FontAwesomeIcon icon={faLock} size="xs" />
					</div>
					<label className="text-sm font-medium text-gray-800 whitespace-nowrap">{nameField.label}</label>
					<input
						type="text"
						value={headerFields[nameField.key] || ''}
						onChange={(e) => onFieldChange(nameField.key, e.target.value)}
						className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
						placeholder={`Enter ${nameField.label.toLowerCase()}`}
					/>
					<span className="h-3 w-3 rounded-full bg-gray-300" />
				</div>

				{headerOrder
					.filter((k) => fieldsMap[k] && k !== 'name')
					.map((key) => {
						const field = fieldsMap[key]
						return (
							<div
								key={field.key}
								draggable
								onDragStart={(e) => handleDragStart(e, field.key)}
								onDragOver={handleDragOver}
								onDrop={(e) => handleDrop(e, field.key)}
								className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2"
							>
								<div className="flex items-center gap-2 text-gray-500 cursor-grab select-none">
									<div className="flex flex-col gap-[2px]">
										<div className="flex gap-[2px]">
											<span className="h-1 w-1 rounded-full bg-gray-400" />
											<span className="h-1 w-1 rounded-full bg-gray-400" />
										</div>
										<div className="flex gap-[2px]">
											<span className="h-1 w-1 rounded-full bg-gray-400" />
											<span className="h-1 w-1 rounded-full bg-gray-400" />
										</div>
									</div>
								</div>
								<label className="text-sm font-medium text-gray-800 whitespace-nowrap">{field.label}</label>
								<input
									type="text"
									value={headerFields[field.key] || ''}
									onChange={(e) => onFieldChange(field.key, e.target.value)}
									disabled={!headerVisibility[field.key]}
									className={`flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink ${
										headerVisibility[field.key] ? '' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
									}`}
									placeholder={`Enter ${field.label.toLowerCase()}`}
								/>
								<span
									onClick={() => onToggleVisibility(field.key)}
									className={`h-3 w-3 rounded-full cursor-pointer transition ${
										headerVisibility[field.key] ? 'bg-brand-pink' : 'bg-gray-300'
									}`}
								/>
							</div>
						)
					})}
			</div>
		</div>
	)
}

export default HeaderFieldsPanel

