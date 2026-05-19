import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faChevronDown } from '@fortawesome/free-solid-svg-icons'

/** Branded single-choice picker — matches `.input` fields instead of native `<select>`. */
function ThemedSelect({
	id,
	value,
	onChange,
	options = [],
	disabled = false,
	hasError = false,
	className = '',
	placeholder = 'Select…',
	'aria-describedby': ariaDescribedby,
}) {
	const listId = useId()
	const [open, setOpen] = useState(false)
	const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
	const triggerRef = useRef(null)
	const popoverRef = useRef(null)

	const selected = options.find((opt) => opt.value === value)
	const displayLabel = selected?.label ?? placeholder

	useLayoutEffect(() => {
		if (!open || !triggerRef.current) return
		const rect = triggerRef.current.getBoundingClientRect()
		const padding = 8
		const popoverMaxH = Math.min(options.length * 44 + 16, 280)
		const spaceBelow = window.innerHeight - rect.bottom
		const spaceAbove = rect.top
		const openDown = spaceBelow >= popoverMaxH || spaceBelow >= spaceAbove
		let top = openDown ? rect.bottom + padding : rect.top - popoverMaxH - padding
		let left = rect.left
		const width = rect.width
		if (left + width > window.innerWidth - padding) left = window.innerWidth - width - padding
		if (left < padding) left = padding
		setPosition({ top, left, width })
	}, [open, options.length])

	useEffect(() => {
		if (!open) return undefined
		const onPointerDown = (e) => {
			const el = e.target
			if (triggerRef.current?.contains(el) || popoverRef.current?.contains(el)) return
			setOpen(false)
		}
		const onKeyDown = (e) => {
			if (e.key === 'Escape') setOpen(false)
		}
		document.addEventListener('mousedown', onPointerDown)
		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('mousedown', onPointerDown)
			document.removeEventListener('keydown', onKeyDown)
		}
	}, [open])

	const pick = (nextValue) => {
		onChange(nextValue)
		setOpen(false)
		triggerRef.current?.focus()
	}

	const triggerClass = [
		'input flex w-full items-center justify-between gap-3 text-left',
		hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : '',
		!selected ? 'text-gray-500' : 'text-gray-900',
		disabled ? 'cursor-not-allowed opacity-70' : '',
		open ? 'border-brand-pink shadow-[0_0_0_4px_rgba(214,86,86,0.1),0_12px_28px_-22px_rgba(80,42,42,0.5)]' : '',
	]
		.filter(Boolean)
		.join(' ')

	const popover =
		open &&
		!disabled &&
		typeof document !== 'undefined' &&
		createPortal(
			<div
				ref={popoverRef}
				id={listId}
				role="listbox"
				aria-labelledby={id}
				className="fixed z-[9999] overflow-hidden rounded-xl border border-brand-pink/22 bg-white p-1.5 shadow-[0_18px_42px_-26px_rgba(80,42,42,0.5)] ring-1 ring-brand-pink/10"
				style={{ top: position.top, left: position.left, width: position.width, minWidth: position.width }}
			>
				<ul className="max-h-[min(17.5rem,70vh)] overflow-y-auto">
					{options.map((opt) => {
						const isSelected = opt.value === value
						return (
							<li key={opt.value} role="presentation">
								<button
									type="button"
									role="option"
									aria-selected={isSelected}
									onClick={() => pick(opt.value)}
									className={[
										'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition',
										isSelected
											? 'bg-brand-pink/[0.1] text-brand-pink-dark'
											: 'text-gray-800 hover:bg-brand-pink/[0.06]',
									].join(' ')}
								>
									<span>{opt.label}</span>
									{isSelected ? (
										<FontAwesomeIcon icon={faCheck} className="size-3.5 shrink-0 text-brand-pink" aria-hidden />
									) : null}
								</button>
							</li>
						)
					})}
				</ul>
			</div>,
			document.body,
		)

	return (
		<div className={['relative', className].filter(Boolean).join(' ')}>
			<button
				ref={triggerRef}
				id={id}
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? listId : undefined}
				aria-describedby={ariaDescribedby}
				onClick={() => !disabled && setOpen((o) => !o)}
				className={triggerClass}
			>
				<span className="min-w-0 flex-1 truncate">{displayLabel}</span>
				<span
					className={[
						'flex size-8 shrink-0 items-center justify-center rounded-lg transition',
						open ? 'bg-brand-pink/15 text-brand-pink-dark' : 'bg-brand-pink/[0.07] text-brand-pink-dark/90',
					].join(' ')}
					aria-hidden
				>
					<FontAwesomeIcon icon={faChevronDown} className={['size-3.5 transition-transform', open ? 'rotate-180' : ''].join(' ')} />
				</span>
			</button>
			{popover}
		</div>
	)
}

export default ThemedSelect
