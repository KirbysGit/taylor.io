function FormSection({ title, description, children }) {
	return (
		<section className="border-t border-slate-100 pt-5 first:border-t-0 first:pt-0">
			{title ? <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h4> : null}
			{description ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p> : null}
			<div className={title || description ? 'mt-4' : ''}>{children}</div>
		</section>
	)
}

export default FormSection
