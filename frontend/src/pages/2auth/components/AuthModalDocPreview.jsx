/** Shared abstract “resume” graphic for auth modals (Landing-adjacent style). */

export function AuthModalDocPreview() {
	return (
		<div className="relative mx-auto mt-8 w-full max-w-[200px] select-none opacity-95" aria-hidden="true">
			<div className="absolute -right-1 top-3 h-[85%] w-[90%] rounded-lg bg-white/10 shadow-lg ring-1 ring-white/15" />
			<div className="relative overflow-hidden rounded-lg bg-cream shadow-xl ring-1 ring-black/5">
				<div className="h-1.5 bg-gradient-to-r from-brand-pink to-brand-pink-dark" />
				<div className="space-y-3 px-4 pb-5 pt-4">
					<div className="space-y-1.5">
						<div className="mx-auto h-1.5 w-2/5 rounded-full bg-gray-200" />
						<div className="mx-auto h-1 w-1/2 rounded-full bg-gray-100" />
					</div>
					<div className="flex gap-2 border-b border-gray-100 pb-3">
						<div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-brand-pink-lighter to-brand-pink-light ring-2 ring-white" />
						<div className="flex flex-1 flex-col justify-center gap-1.5">
							<div className="h-1.5 w-3/4 rounded bg-gray-800/85" />
							<div className="h-1 w-1/2 rounded bg-gray-200" />
						</div>
					</div>
					<div className="space-y-1">
						<div className="h-1 w-full rounded bg-gray-100" />
						<div className="h-1 w-[90%] rounded bg-gray-50" />
					</div>
				</div>
			</div>
		</div>
	)
}
