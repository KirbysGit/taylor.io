// pages / 3setup / steps / SkillsStep.jsx

// imports.
import React from 'react';
import SkillsInput from '@/components/inputs/SkillsInput';

// Skills Step Component - Uses SkillsInput with setup flow header
const SkillsStep = ({ skills, onAdd, onRemove, onUpdate }) => {
	return (
		<div className="w-full">
			{/* Header */}
			<div className="mb-3">
				<h2 className="text-2xl font-bold text-gray-900 mb-2">
					What are your skills?
				</h2>
				<p className="text-gray-600">
					Let's showcase what you know! Add your skills and organize them however makes sense to you.
				</p>
			</div>

			<div className="smallDivider mb-3" />

			<SkillsInput 
				skills={skills}
				onAdd={onAdd}
				onRemove={onRemove}
				onUpdate={onUpdate}
			/>
		</div>
	);
};

export default SkillsStep;
