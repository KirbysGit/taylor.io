import React, { useState } from 'react';

import { RequiredAsterisk, ChevronDown, ChevronUp } from '@/components/icons'

const Education = ({ educationData, onEducationChange }) => {

    const [isEducationExpanded, setIsEducationExpanded] = useState(true);

    const [schoolName, setSchoolName] = useState(educationData[0]?.school || '');

    return (
        <div className="flex flex-col mb-4 border-[2px] border-brand-pink-light rounded-md p-4">
			{/* header with chevron */}
			<button
				type="button"
				onClick={() => setIsEducationExpanded(!isEducationExpanded)}
				className="flex items-center gap-3 w-full transition-colors"
			>
				{/* title */}
				<h1 className="text-[1.375rem] font-semibold text-gray-900">Education</h1>
				
				{/* divider */}
				<div className="flex-1 h-[3px] rounded bg-gray-300"></div>
				
				{/* chevron in circle */}
				<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
					{isEducationExpanded ? (
						<ChevronUp className="w-4 h-4 text-gray-600" />
					) : (
						<ChevronDown className="w-4 h-4 text-gray-600" />
					)}
				</div>
			</button>
			
			{isEducationExpanded && (
				<div>
					<p className="text-[0.875rem] text-gray-500 mb-2">This is where you can explain you education history.</p>
					{/* school name */}
					<div className="flex gap-4 mb-4">
						<div className="labelInputPair">
							<label className="label">School Name <RequiredAsterisk /></label>
							<input
								type="text"
								value={schoolName}
								onChange={(e) => setSchoolName(e.target.value)}
								className="input"
								required
							/>
						</div>
					</div>
				</div>
			)}
		</div>
    )
}

export default Education;