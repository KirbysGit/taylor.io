import React from 'react';
import ExperienceInput from '@/components/inputs/ExperienceInput';

// Experience Step Component - Uses ExperienceInput with setup flow header
const ExperienceStep = ({ experiences, onAdd, onRemove, onUpdate }) => {
	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-2">Your Work Experience</h2>
			<p className="text-gray-600 mb-3">Tell us about your professional experience.</p>
			<div className="smallDivider mb-6"></div>
			<ExperienceInput 
				experiences={experiences}
				onAdd={onAdd}
				onRemove={onRemove}
				onUpdate={onUpdate}
			/>
		</div>
	)
}

export default ExperienceStep