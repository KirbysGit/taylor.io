import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import EducationInput from '@/components/inputs/EducationInput'

const EducationStep = forwardRef(function EducationStep({ education, onAdd, onRemove, onUpdate, showSubsections = false }, ref) {
	const educationRef = useRef(null)
	useImperativeHandle(ref, () => ({
		revealMissingRequired: () => educationRef.current?.revealMissingRequired?.(),
	}))

	return (
		<div>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-gray-900">Education</h2>
					<p className="mt-1 text-gray-600">
						Add schools, degrees, coursework, honors, and anything else that should be available when tailoring a résumé.
					</p>
				</div>
				<button
					type="button"
					onClick={() => educationRef.current?.addNew()}
					className="profileAddButtonPrimary shrink-0"
				>
					+ Add education
				</button>
			</div>
			<div className="smallDivider mb-6" />
			<EducationInput
				ref={educationRef}
				education={education}
				onAdd={onAdd}
				onRemove={onRemove}
				onUpdate={onUpdate}
				showSubsections={showSubsections}
				hideHeader
			/>
		</div>
	)
})

export default EducationStep
