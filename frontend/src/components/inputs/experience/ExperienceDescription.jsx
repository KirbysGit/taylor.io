import { XIcon } from '@/components/icons'
import FormSection from '../education/FormSection'

function ExperienceDescription({
	index,
	description,
	mode,
	bullets,
	onDescriptionChange,
	onModeToggle,
	onBulletChange,
	onAddBullet,
	onRemoveBullet,
	compact = false,
	invalid = false,
}) {
	const isBullets = (mode || 'paragraph') === 'bullets'
	const bulletList = bullets || ['']
	const labelClass = compact ? 'mb-1.5 block text-xs font-semibold text-slate-600' : 'label'

	return (
		<FormSection
			title="Role description"
			description="Use bullets for résumé-ready impact lines, or a short paragraph."
		>
			<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
				<span className={labelClass}>Format</span>
				<div className="flex items-center gap-2">
					<span className={`text-xs font-medium ${!isBullets ? 'text-brand-pink-dark' : 'text-slate-400'}`}>
						Paragraph
					</span>
					<div
						role="switch"
						aria-checked={isBullets}
						aria-label="Toggle between paragraph and bullet list"
						tabIndex={0}
						onClick={onModeToggle}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								onModeToggle()
							}
						}}
						onMouseDown={(e) => e.preventDefault()}
						className="flex cursor-pointer items-center select-none"
					>
						<div
							className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
								isBullets ? 'bg-brand-pink' : 'bg-slate-300'
							}`}
						>
							<div
								className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
									isBullets ? 'translate-x-5' : 'translate-x-0'
								}`}
							/>
						</div>
					</div>
					<span className={`text-xs font-medium ${isBullets ? 'text-brand-pink-dark' : 'text-slate-400'}`}>
						Bullets
					</span>
				</div>
			</div>

			{!isBullets ? (
				<textarea
					value={description || ''}
					onChange={(e) => onDescriptionChange(e.target.value)}
					className={`input min-h-[100px] resize-y ${invalid ? 'border-red-400 bg-red-50/30 ring-2 ring-red-100 [animation:shake_0.45s_ease-in-out]' : ''}`}
					placeholder="Describe your responsibilities and achievements..."
				/>
			) : (
				<div className="space-y-2">
					{bulletList.length === 0 ? (
						<div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
							No bullets yet. Add one below.
						</div>
					) : (
						bulletList.map((bullet, bulletIndex) => (
							<div key={bulletIndex} className="flex items-center gap-2">
								<span className="font-medium text-slate-500" aria-hidden>
									•
								</span>
								<input
									type="text"
									value={bullet}
									onChange={(e) => onBulletChange(bulletIndex, e.target.value)}
									className={`input flex-1 ${invalid && bulletIndex === 0 ? 'border-red-400 bg-red-50/30 ring-2 ring-red-100' : ''}`}
									placeholder="Impact or responsibility..."
								/>
								{bulletList.length > 1 ? (
									<button
										type="button"
										onClick={() => onRemoveBullet(bulletIndex)}
										className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-700"
										aria-label="Remove bullet"
									>
										<XIcon className="size-4" />
									</button>
								) : null}
							</div>
						))
					)}
					<button
						type="button"
						onClick={onAddBullet}
						className="w-full rounded-xl border border-brand-pink/25 bg-brand-pink/5 px-3 py-2 text-sm font-semibold text-brand-pink-dark transition hover:bg-brand-pink/10"
					>
						+ Add bullet
					</button>
				</div>
			)}
		</FormSection>
	)
}

export default ExperienceDescription
