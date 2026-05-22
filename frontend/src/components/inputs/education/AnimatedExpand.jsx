function AnimatedExpand({ expanded, children }) {
	return (
		<div
			className="grid transition-[grid-template-rows] duration-150 ease-out motion-reduce:transition-none"
			style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
		>
			<div className="min-h-0 overflow-hidden">{children}</div>
		</div>
	)
}

export default AnimatedExpand
