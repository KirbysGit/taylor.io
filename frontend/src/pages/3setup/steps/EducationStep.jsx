import React from 'react';
import EducationInput from '@/components/inputs/EducationInput';

// Education Step Component - Uses EducationInput with setup flow header
const EducationStep = ({ education, onAdd, onRemove, onUpdate, showSubsections = false, onSubsectionUpdate }) => {
	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-2">Your Education</h2>
			<p className="text-gray-600 mb-3">Tell us about your educational background.</p>
			<div className="smallDivider mb-6"></div>
			<EducationInput 
				education={education}
				onAdd={onAdd}
				onRemove={onRemove}
				onUpdate={onUpdate}
				showSubsections={showSubsections}
				onSubsectionUpdate={onSubsectionUpdate}
			/>
		</div>
	)
}

export default EducationStep