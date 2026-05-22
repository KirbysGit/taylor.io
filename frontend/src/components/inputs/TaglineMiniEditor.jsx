import React, { useRef, useLayoutEffect, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBold, faItalic, faUnderline } from '@fortawesome/free-solid-svg-icons'
import TaglinePreview from './TaglinePreview'

/** Match preview panel height when stacked below the textarea */
const TAGLINE_BOX_MIN = 'min-h-[4.5rem]'

const FORMAT_BTN =
	'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 disabled:opacity-40'

/**
 * Tagline mini-markup: ==underline==, **bold**, _italic_, * → · on resume (matches backend).
 * Undo/redo via keyboard only (Ctrl/Cmd+Z, Ctrl/Cmd+Y) so the bar stays approachable for non-technical users.
 */
const TaglineMiniEditor = ({
	value = '',
	onChange,
	id,
	className = '',
	placeholder,
	disabled = false,
	showPreview = true,
}) => {
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

	return (
		<div className={`flex min-h-0 flex-col gap-3 ${className}`}>
			<textarea
				ref={taRef}
				id={id}
				value={value}
				onChange={(e) => applyChange(e.target.value)}
				onKeyDown={handleTextareaKeyDown}
				disabled={disabled}
				rows={3}
				className={`input w-full ${TAGLINE_BOX_MIN} resize-y text-sm`}
				placeholder={placeholder}
				spellCheck
			/>

			<div className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-2 py-1.5">
				<p className="px-1 pb-1 text-[11px] leading-snug text-slate-500">
					Highlight words in your line, then pick a style.
				</p>
				<div className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Tagline formatting">
					<button
						type="button"
						disabled={disabled}
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => wrapBoth('**', '**')}
						className={FORMAT_BTN}
						title="Bold"
					>
						<FontAwesomeIcon icon={faBold} className="size-3" aria-hidden />
						<span>Bold</span>
					</button>
					<button
						type="button"
						disabled={disabled}
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => wrapBoth('_', '_')}
						className={FORMAT_BTN}
						title="Italic"
					>
						<FontAwesomeIcon icon={faItalic} className="size-3" aria-hidden />
						<span>Italic</span>
					</button>
					<button
						type="button"
						disabled={disabled}
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => wrapBoth('==', '==')}
						className={FORMAT_BTN}
						title="Underline"
					>
						<FontAwesomeIcon icon={faUnderline} className="size-3" aria-hidden />
						<span>Underline</span>
					</button>
					<span className="mx-0.5 h-4 w-px shrink-0 bg-slate-200" aria-hidden />
					<button
						type="button"
						disabled={disabled}
						onMouseDown={(e) => e.preventDefault()}
						onClick={insertStar}
						className={FORMAT_BTN}
						title="Add a dot between phrases (shows as · on your résumé)"
					>
						<span className="text-sm leading-none" aria-hidden>
							·
						</span>
						<span>Separator</span>
					</button>
				</div>
			</div>

			{showPreview ? (
				<div>
					<p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">On your résumé</p>
					<TaglinePreview value={value} />
				</div>
			) : null}
		</div>
	)
}

export default TaglineMiniEditor
