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
			<h2 className="mb-2 font-serif text-3xl font-bold tracking-tight text-gray-950">Your Work Experience</h2>
			<p className="text-gray-600 mb-3">Tell us about your professional experience.</p>
			<div className="smallDivider mb-6"></div>
			<ExperienceInput 
				ref={experienceRef}
				experiences={experiences}
				onAdd={onAdd}
				onRemove={onRemove}
				onUpdate={onUpdate}
			/>
		</div>
	)
})

export default ExperienceStep
