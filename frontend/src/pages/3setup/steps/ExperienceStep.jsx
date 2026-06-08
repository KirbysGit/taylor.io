import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import ExperienceInput from '@/components/inputs/ExperienceInput';

// Experience Step Component - Uses ExperienceInput with setup flow header
const ExperienceStep = forwardRef(function ExperienceStep({ experiences, onAdd, onRemove, onUpdate }, ref) {
	const experienceRef = useRef(null)
	useImperativeHandle(ref, () => ({
		revealMissingRequired: () => experienceRef.current?.revealMissingRequired?.(),
	}))

	return (
		<div>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="font-serif text-3xl font-bold tracking-tight text-gray-950">Your Work Experience</h2>
					<p className="mt-1 text-gray-600">Add roles, responsibilities, and the impact you made.</p>
				</div>
				<button
					type="button"
					onClick={() => experienceRef.current?.addNew()}
					className="profileAddButtonPrimary shrink-0"
				>
					+ Add experience
				</button>
			</div>
			<div className="smallDivider mb-6" />
			<ExperienceInput
				ref={experienceRef}
				experiences={experiences}
				onAdd={onAdd}
				onRemove={onRemove}
				onUpdate={onUpdate}
				hideHeader
			/>
		</div>
	)
})

export default ExperienceStep
