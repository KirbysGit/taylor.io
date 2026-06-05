function FormSection({ title, description, children }) {
	return (
		<section className="border-t border-slate-100 pt-6 first:border-t-0 first:pt-0">
			{title ? <h4 className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{title}</h4> : null}
			{description ? <p className="mb-4 text-xs leading-relaxed text-slate-500">{description}</p> : null}
			<div>{children}</div>
		</section>
	)
}

export default FormSection
