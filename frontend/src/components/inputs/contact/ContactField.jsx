import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

function ContactField({ label, icon, type = 'text', value, onChange, placeholder, className = '', autoComplete }) {
	return (
		<div className={className}>
			<label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
			<div className="relative">
				<span
					className="pointer-events-none absolute left-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-brand-pink/10 text-brand-pink"
					aria-hidden
				>
					<FontAwesomeIcon icon={icon} className="size-3.5" />
				</span>
				<input
					type={type}
					value={value || ''}
					onChange={(e) => onChange(e.target.value)}
					className="input w-full rounded-xl border-slate-200/90 py-2.5 pl-12 pr-3 text-sm"
					placeholder={placeholder}
					autoComplete={autoComplete}
				/>
			</div>
		</div>
	)
}

export default ContactField
