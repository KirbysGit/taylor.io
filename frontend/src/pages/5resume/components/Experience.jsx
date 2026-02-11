import React from 'react';
import { useState, useEffect } from 'react'
import { formatDateForInput } from '@/pages/utils/DataFormatting'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEye, faEyeSlash} from '@fortawesome/free-solid-svg-icons'
import { RequiredAsterisk, ChevronDown, ChevronUp} from '@/components/icons'
import Switch from 'react-switch'
import DescriptionInput from '@/components/inputs/DescriptionInput'


const normalizeExperience = (exp = null) => {
    return {
        title: exp?.title || '',
        company: exp?.company || '',
        description: exp?.description || '',
        start_date: formatDateForInput(exp?.start_date),
        end_date: formatDateForInput(exp?.end_date),
        current: exp?.current || false,
        location: exp?.location || '',
        skills: exp?.skills || '',
    }
}

const Experience = ({ experienceData, onExperienceChange, isVisible = true, onVisibilityChange }) => {
    
    const [isExperienceExpanded, setIsExperienceExpanded] = useState(true)

    // experience entries state.
    const [experiences, setExperiences] = useState(() => {
        if (experienceData && experienceData.length > 0) {
            return experienceData.map(exp => normalizeExperience(exp))
        }
		
        // if no data, start with one empty entry.
        return [normalizeExperience()]
    })

	// ----- helper functions -----

    // update a specific experience entry by index.
    const updateExperience = (index, field, value) => {
        setExperiences(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: value }
            return updated
        })
    }

    // add a new empty experience entry.
    const addExperience = () => {
        setExperiences(prev => [...prev, normalizeExperience()])
    }

    // remove an experience entry by index.
    const removeExperience = (index) => {
        setExperiences(prev => {
            if (prev.length <= 1) return prev // keep at least one entry.
            return prev.filter((_, i) => i !== index)
        })
    }


    // ----- effects -----

	// sync with prop changes.
    useEffect(() => {
        if (experienceData && experienceData.length > 0) {
            setExperiences(experienceData.map(exp => normalizeExperience(exp)))
        }
    }, [experienceData])

    // export experiences array to parent component.
    useEffect(() => {
        onExperienceChange(experiences)
    }, [experiences])

    return (
        <div>
            <div className="flex flex-col mb-4 border-[2px] border-brand-pink-light rounded-md p-4">
			{/* header with chevron */}
			<button
				type="button"
				onClick={() => setIsExperienceExpanded(!isExperienceExpanded)}
				className="flex items-center gap-3 w-full transition-colors"
			>
				{/* Visibility Toggle Button - Left side in circle */}
				{onVisibilityChange && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onVisibilityChange(!isVisible);
						}}
						className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
						aria-label={isVisible ? 'Hide experience in preview' : 'Show experience in preview'}
						title={isVisible ? 'Hide from preview' : 'Show in preview'}
					>
						<FontAwesomeIcon icon={isVisible ? faEye : faEyeSlash} className="w-4 h-4 text-gray-600" />
					</button>
				)}
				
				{/* title */}
				<h1 className="text-[1.375rem] font-semibold text-gray-900">Experience</h1>
				
				{/* divider */}
				<div className="flex-1 h-[3px] rounded bg-gray-300"></div>
				
				{/* chevron in circle */}
				<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
					{isExperienceExpanded ? (
						<ChevronUp className="w-4 h-4 text-gray-600" />
					) : (
						<ChevronDown className="w-4 h-4 text-gray-600" />
					)}
				</div>
			</button>
			
			{isExperienceExpanded && (
				<div>
					<p className="text-[0.875rem] text-gray-500 mb-2">This is where you can explain your experience history.</p>
					
					{/* Map over each experience entry */}
					{experiences.map((experience, index) => (
						<div key={index} className="mb-2 p-4 border border-gray-300 rounded-md">
							{/* entry header with remove button (only show if there are multiple entries) */}
							<div className="flex items-center justify-between mb-2 border-b-2 border-brand-pink-light pb-1">
								<h3 className="text-lg font-medium text-gray-700 m-0 p-0">
									Experience {index + 1}
								</h3>
								{experiences.length > 1 && (
									<button
										type="button"
										onClick={() => removeExperience(index)}
										className="text-red-500 hover:text-red-700 text-sm"
									>
										Remove
									</button>
								)}
							</div>
							<div className="flex mb-2">
								<div className="labelInputPair">
									<label className="label">Title <RequiredAsterisk /></label>
									<input
										type="text"
										value={experience.title}
										onChange={(e) => updateExperience(index, 'title', e.target.value)}
										className="input"
										required
									/>
								</div>
							</div>
							<div className="flex mb-2">
								<div className="labelInputPair">
									<label className="label">Company <RequiredAsterisk /></label>
									<input
										type="text"
										value={experience.company}
										onChange={(e) => updateExperience(index, 'company', e.target.value)}
										className="input"
										required
									/>
								</div>
							</div>
							<div className="mb-2">
								<DescriptionInput
									value={experience.description}
									onChange={(value) => updateExperience(index, 'description', value)}
									placeholder="Describe your responsibilities and achievements..."
									required
								/>
							</div>
                            {/* start date and current checkbox */}
							<div className="flex gap-4 mb-2">
								{/* start date */}
								<div className="flex-1">
									<div className="labelInputPair">
										<label className="label">Start Date</label>
										<input
											type="date"
											value={experience.start_date}
											onChange={(e) => updateExperience(index, 'start_date', e.target.value)}
											className="input"
										/>
									</div>
								</div>

								{/* current toggle */}
								<div className="flex-1 flex flex-col">
									<label className="label">Currently Working</label>
									<div className="flex justify-center items-center h-10">
										<Switch
											checked={experience.current}
											onChange={(checked) => updateExperience(index, 'current', checked)}
											onColor="#d65656" // brand-pink (rgb(214, 86, 86))
											offColor="#e5e7eb" // gray-200
											checkedIcon={false}
											uncheckedIcon={false}
											height={32}
											width={64}
											handleDiameter={24}
										/>
									</div>
								</div>
							</div>

                            {/* end date and location */}
                            <div className="flex gap-4 mb-2">
                                <div className="flex-1">
                                    <div className="labelInputPair">
                                        <label className="label">End Date</label>
                                        <input
                                            type="date"
                                            value={experience.end_date}
                                            onChange={(e) => updateExperience(index, 'end_date', e.target.value)}
                                            className="input"
                                            disabled={experience.current}
                                        />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="labelInputPair">
                                        <label className="label">Location</label>
                                        <input
                                            type="text"
                                            value={experience.location}
                                            onChange={(e) => updateExperience(index, 'location', e.target.value)}
                                            className="input"
                                        />
                                    </div>
                                </div>
                            </div>

							{/* skills (like the project's relevant tech stack) */}
							<div className="flex mb-2">
								<div className="labelInputPair">
									<label className="label">Skills</label>
									<input
										type="text"
										value={experience.skills}
										onChange={(e) => updateExperience(index, 'skills', e.target.value)}
										className="input"
									/>
								</div>
							</div>
						</div>
					))}

					{/* add new experience button */}
					<div className="flex justify-center mt-2">
						<button
							type="button"
							onClick={addExperience}
							className="px-4 py-2 bg-brand-pink-light text-white rounded-full hover:bg-brand-pink transition-colors"
						>
							<FontAwesomeIcon icon={faPlus} className="w-4 h-4 color-white mr-2" /> Add Another Experience
						</button>
					</div>
				</div>
			)}
		</div>
        </div>
    )
}

export default Experience;