import { Toaster, resolveValue, toast } from 'react-hot-toast'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faCircleCheck,
	faCircleInfo,
	faCircleNotch,
	faCircleXmark,
	faTriangleExclamation,
	faXmark,
} from '@fortawesome/free-solid-svg-icons'

const actionToastMeta = new Map()

export function showThemedActionToast({ title, detail, variant = 'custom', actionLabel, onAction, duration = 9000 }) {
	const id = toast(title || 'Update', { duration })
	actionToastMeta.set(id, {
		detail,
		variant,
		actionLabel,
		duration,
		onAction: typeof onAction === 'function' ? onAction : null,
	})
	return id
}

const toastTheme = {
	success: {
		icon: faCircleCheck,
		iconWrap: 'bg-emerald-50 text-emerald-700 ring-emerald-200/75',
		border: 'border-emerald-200',
		action: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
		title: 'text-slate-950',
	},
	error: {
		icon: faCircleXmark,
		iconWrap: 'bg-red-50 text-red-600 ring-red-200/80',
		border: 'border-red-200',
		action: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
		title: 'text-slate-950',
	},
	loading: {
		icon: faCircleNotch,
		iconWrap: 'bg-violet-50 text-violet-600 ring-violet-200/80',
		border: 'border-violet-200',
		action: 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100',
		title: 'text-slate-950',
		spin: true,
	},
	blank: {
		icon: faCircleInfo,
		iconWrap: 'bg-sky-50 text-sky-600 ring-sky-200/80',
		border: 'border-sky-200',
		action: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100',
		title: 'text-slate-950',
	},
	custom: {
		icon: faTriangleExclamation,
		iconWrap: 'bg-amber-50 text-amber-600 ring-amber-200/80',
		border: 'border-amber-200',
		action: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
		title: 'text-slate-950',
	},
}

function normalizeToastMessage(raw) {
	if (typeof raw !== 'string') {
		return { title: raw, detail: null, variant: null, actionLabel: null, onAction: null }
	}

	const trimmed = raw.trim()
	if (!trimmed) return { title: 'Update', detail: null }

	const [first, ...rest] = trimmed.split(/\s+-\s+|\n/)
	return {
		title: first || trimmed,
		detail: rest.join(' ').trim() || null,
		variant: null,
		actionLabel: null,
		onAction: null,
	}
}

function ThemedToast({ item }) {
	const raw = resolveValue(item.message, item)
	const parsed = normalizeToastMessage(raw)
	const meta = actionToastMeta.get(item.id) || {}
	const duration = Number.isFinite(meta.duration) ? meta.duration : item.duration
	const showTimer = Number.isFinite(duration) && duration > 0
	const title = parsed.title
	const detail = meta.detail ?? parsed.detail
	const variant = meta.variant ?? parsed.variant
	const actionLabel = meta.actionLabel ?? parsed.actionLabel
	const onAction = meta.onAction ?? parsed.onAction
	const theme = toastTheme[variant] || toastTheme[item.type] || toastTheme.blank

	const handleAction = () => {
		onAction?.()
		actionToastMeta.delete(item.id)
		toast.dismiss(item.id)
	}

	const handleDismiss = () => {
		actionToastMeta.delete(item.id)
		toast.dismiss(item.id)
	}

	return (
		<div
			className={[
				'pointer-events-auto relative flex w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border-2 bg-white text-left shadow-[0_18px_50px_-24px_rgba(41,28,28,0.45),0_4px_14px_-8px_rgba(41,28,28,0.28)] ring-1 ring-black/[0.03] transition-all duration-200',
				theme.border,
				item.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
			].join(' ')}
			role="status"
			aria-live={item.type === 'error' ? 'assertive' : 'polite'}
		>
			<div className="flex min-w-0 flex-1 items-start gap-3 px-3.5 py-3">
				<span
					className={[
						'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ring-1',
						theme.iconWrap,
					].join(' ')}
					aria-hidden
				>
					<FontAwesomeIcon icon={theme.icon} spin={theme.spin} className="size-4" />
				</span>

				<div className="min-w-0 flex-1 pt-0.5">
					<p className={`truncate text-sm font-black leading-snug ${theme.title}`}>{title}</p>
					<p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
						{detail || defaultDetail(item.type)}
					</p>
					{actionLabel && onAction ? (
						<button
							type="button"
							onClick={handleAction}
							className={[
								'mt-2 inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/45',
								theme.action,
							].join(' ')}
						>
							{actionLabel}
						</button>
					) : null}
				</div>

				<button
					type="button"
					onClick={handleDismiss}
					className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/45"
					aria-label="Dismiss notification"
				>
					{showTimer ? (
						<svg className="pointer-events-none absolute inset-0 size-7 -rotate-90" viewBox="0 0 28 28" aria-hidden>
							<circle
								cx="14"
								cy="14"
								r="11.5"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								className="text-slate-200"
							/>
							<circle
								cx="14"
								cy="14"
								r="11.5"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								className="toast-countdown-ring text-slate-400"
								style={{ '--toast-duration': `${duration}ms` }}
							/>
						</svg>
					) : null}
					<FontAwesomeIcon icon={faXmark} className="size-3.5" />
				</button>
			</div>
		</div>
	)
}

function defaultDetail(type) {
	if (type === 'success') return 'Your latest action completed successfully.'
	if (type === 'error') return 'Please try again or review the current screen.'
	if (type === 'loading') return 'Working on the latest update...'
	return 'Taylor has a new update for you.'
}

export default function ThemedToaster() {
	return (
		<Toaster
			position="top-right"
			gutter={10}
			containerClassName="!top-4 !right-4"
			toastOptions={{
				duration: 3600,
				success: { duration: 3200 },
				error: { duration: 5200 },
				loading: { duration: Infinity },
			}}
		>
			{(item) => <ThemedToast item={item} />}
		</Toaster>
	)
}
