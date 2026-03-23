import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parse "YYYY-MM" to { year, month } (1-indexed) or null
const parseValue = (value) => {
	if (!value || typeof value !== 'string') return null
	const [y, m] = value.split('-').map(Number)
	if (!y || !m || m < 1 || m > 12) return null
	return { year: y, month: m }
}

// Format { year, month } to "YYYY-MM"
const formatValue = ({ year, month }) => {
	return `${year}-${String(month).padStart(2, '0')}`
}

// Display string for a value
const formatDisplay = (value) => {
	const p = parseValue(value)
	if (!p) return ''
	return `${MONTHS[p.month - 1]} ${p.year}`
}

const currentYear = new Date().getFullYear()
const MIN_YEAR = 1980
const MAX_YEAR = currentYear + 2
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i).reverse()

const MonthYearPicker = ({ value = '', onChange, disabled = false, placeholder = 'Select date', className = '' }) => {
	const [open, setOpen] = useState(false)
	const [step, setStep] = useState('year')
	const [year, setYear] = useState(() => {
		const p = parseValue(value)
		return p ? p.year : currentYear
	})
	const [position, setPosition] = useState({ top: 0, left: 0 })
	const triggerRef = useRef(null)
	const popoverRef = useRef(null)

	// Sync internal state when value prop changes (e.g. from parent)
	useEffect(() => {
		const p = parseValue(value)
		if (p) {
			setYear(p.year)
		} else {
			setYear(currentYear)
		}
	}, [value])

	// Reset to year step when opening
	useEffect(() => {
		if (open) setStep('year')
	}, [open])

	// Position popover with fixed, avoid clipping viewport
	useLayoutEffect(() => {
		if (!open || !triggerRef.current) return
		const rect = triggerRef.current.getBoundingClientRect()
		const padding = 8
		const popoverW = Math.max(rect.width, 220)
		const popoverH = step === 'year' ? 250 : 220
		const spaceBelow = window.innerHeight - rect.bottom
		const spaceAbove = rect.top
		const openDown = spaceBelow >= popoverH || spaceBelow >= spaceAbove
		let top = openDown ? rect.bottom + padding : rect.top - popoverH - padding
		let left = rect.left
		// Keep within viewport horizontally
		if (left + popoverW > window.innerWidth - padding) left = window.innerWidth - popoverW - padding
		if (left < padding) left = padding
		setPosition({ top, left, width: popoverW })
	}, [open, step])

	// Close on outside click
	useEffect(() => {
		if (!open) return
		const fn = (e) => {
			const el = e.target
			if (triggerRef.current?.contains(el) || popoverRef.current?.contains(el)) return
			setOpen(false)
		}
		document.addEventListener('mousedown', fn)
		return () => document.removeEventListener('mousedown', fn)
	}, [open])

	const handleYearClick = (y) => {
		setYear(y)
		setStep('month')
	}

	const handleMonthClick = (m) => {
		onChange(formatValue({ year, month: m }))
		setOpen(false)
	}

	const handleBack = () => setStep('year')

	const displayText = formatDisplay(value) || placeholder

	const popoverContent = open && (
		<div
			ref={popoverRef}
			className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl"
			style={{
				top: position.top,
				left: position.left,
				width: position.width,
				minWidth: 220
			}}
		>
			{step === 'year' && (
				<div className="py-2 max-h-[200px] overflow-y-auto">
					<div className="px-3 py-1.5 text-xs font-medium text-gray-500">Select year</div>
					{YEARS.map((y) => (
						<button
							key={y}
							type="button"
							onClick={() => handleYearClick(y)}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
								year === y ? 'bg-brand-pink/10 text-brand-pink font-medium' : 'text-gray-800'
							}`}
						>
							{y}
						</button>
					))}
				</div>
			)}
			{step === 'month' && (
				<div className="p-3">
					<div className="flex items-center justify-between mb-2">
							<button
									type="button"
									onClick={handleBack}
									className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
								>
									<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
							Back to year
						</button>
						<span className="text-sm font-medium text-gray-700">{year}</span>
					</div>
					<div className="grid grid-cols-4 gap-1">
						{MONTHS.map((name, i) => {
							const m = i + 1
							const isSelected = parseValue(value)?.year === year && parseValue(value)?.month === m
							return (
								<button
									key={m}
									type="button"
									onClick={() => handleMonthClick(m)}
									className={`py-1.5 px-2 text-sm rounded transition-colors ${
										isSelected
											? 'bg-brand-pink text-white'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
									}`}
								>
									{name}
								</button>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)

	return (
		<div className={`relative ${className}`}>
			<button
				ref={triggerRef}
				type="button"
				onClick={() => !disabled && setOpen((o) => !o)}
				disabled={disabled}
				className={`input w-full text-left flex items-center justify-between disabled:bg-gray-100 disabled:cursor-not-allowed ${!value ? 'text-gray-500' : ''}`}
			>
				<span>{displayText}</span>
				<svg
					className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
		</div>
	)
}

export default MonthYearPicker
