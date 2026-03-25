import React, { useRef, useLayoutEffect, useEffect } from 'react'

/** Match preview panel height */
const TAGLINE_BOX_MIN = 'min-h-[5rem]'

const TOOLBAR_BTN =
	'px-2.5 py-1.5 text-xs rounded-md border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 hover:border-brand-pink/40 disabled:opacity-50 shrink-0'

/**
 * Tagline mini-markup: ==underline==, **bold**, _italic_, * → · on resume (matches backend).
 * Undo/redo stack for the textarea; Ctrl+Z / Ctrl+Y and Ctrl+Shift+Z supported.
 */
const TaglineMiniEditor = ({ value = '', onChange, id, className = '', placeholder, disabled = false }) => {
	const taRef = useRef(null)
	const pendingSelRef = useRef(null)
	const historyRef = useRef([value])
	const indexRef = useRef(0)
	const isInternalRef = useRef(false)

	// Parent-driven value (e.g. profile load): reset history
	useEffect(() => {
		if (isInternalRef.current) {
			isInternalRef.current = false
			return
		}
		historyRef.current = [value]
		indexRef.current = 0
	}, [value])

	useLayoutEffect(() => {
		if (pendingSelRef.current != null && taRef.current) {
			const pos = pendingSelRef.current
			pendingSelRef.current = null
			const el = taRef.current
			el.focus()
			const p = Math.min(pos, el.value.length)
			el.setSelectionRange(p, p)
		}
	}, [value])

	const applyChange = (newVal) => {
		const h = historyRef.current.slice(0, indexRef.current + 1)
		h.push(newVal)
		historyRef.current = h
		indexRef.current = h.length - 1
		isInternalRef.current = true
		onChange(newVal)
	}

	const commit = (next, caretPos) => {
		pendingSelRef.current = caretPos
		applyChange(next)
	}

	const undo = () => {
		if (disabled || indexRef.current <= 0) return
		indexRef.current -= 1
		isInternalRef.current = true
		onChange(historyRef.current[indexRef.current])
	}

	const redo = () => {
		if (disabled || indexRef.current >= historyRef.current.length - 1) return
		indexRef.current += 1
		isInternalRef.current = true
		onChange(historyRef.current[indexRef.current])
	}

	const wrapBoth = (before, after) => {
		const el = taRef.current
		const v = value
		if (!el) return
		const start = el.selectionStart
		const end = el.selectionEnd
		const sel = v.slice(start, end)
		let next
		let caret
		if (sel.length > 0) {
			next = v.slice(0, start) + before + sel + after + v.slice(end)
			caret = start + before.length + sel.length + after.length
		} else {
			next = v.slice(0, start) + before + after + v.slice(end)
			caret = start + before.length
		}
		commit(next, caret)
	}

	const insertStar = () => {
		const el = taRef.current
		const v = value
		if (!el) return
		const start = el.selectionStart
		const end = el.selectionEnd
		const next = v.slice(0, start) + '*' + v.slice(end)
		commit(next, start + 1)
	}

	const handleTextareaKeyDown = (e) => {
		if (disabled) return
		const mod = e.ctrlKey || e.metaKey
		if (mod && e.key === 'z' && !e.shiftKey) {
			e.preventDefault()
			undo()
			return
		}
		if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
			e.preventDefault()
			redo()
		}
	}

	const canUndo = indexRef.current > 0
	const canRedo = indexRef.current < historyRef.current.length - 1

	return (
		<div className={`flex flex-col gap-2 min-h-0 ${className}`}>
			<div className="flex flex-wrap items-center gap-1.5 min-h-[2.25rem]">
				<button
					type="button"
					disabled={disabled}
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => wrapBoth('**', '**')}
					className={`${TOOLBAR_BTN} font-semibold`}
					title="Bold"
				>
					B
				</button>
				<button
					type="button"
					disabled={disabled}
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => wrapBoth('_', '_')}
					className={`${TOOLBAR_BTN} italic`}
					title="Italic"
				>
					I
				</button>
				<button
					type="button"
					disabled={disabled}
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => wrapBoth('==', '==')}
					className={`${TOOLBAR_BTN} underline`}
					title="Underline"
				>
					U
				</button>
				<button
					type="button"
					disabled={disabled}
					onMouseDown={(e) => e.preventDefault()}
					onClick={insertStar}
					className={TOOLBAR_BTN}
					title="Separator (* → ·)"
				>
					·
				</button>

				<span className="flex-1 min-w-2" aria-hidden />

				<button
					type="button"
					disabled={disabled || !canUndo}
					onMouseDown={(e) => e.preventDefault()}
					onClick={undo}
					className={TOOLBAR_BTN}
					title="Undo (Ctrl+Z)"
				>
					Undo
				</button>
				<button
					type="button"
					disabled={disabled || !canRedo}
					onMouseDown={(e) => e.preventDefault()}
					onClick={redo}
					className={TOOLBAR_BTN}
					title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
				>
					Redo
				</button>
			</div>
			<textarea
				ref={taRef}
				id={id}
				value={value}
				onChange={(e) => applyChange(e.target.value)}
				onKeyDown={handleTextareaKeyDown}
				disabled={disabled}
				rows={3}
				className={`input w-full ${TAGLINE_BOX_MIN} text-sm resize-y flex-1`}
				placeholder={placeholder}
				spellCheck
			/>
		</div>
	)
}

export default TaglineMiniEditor
