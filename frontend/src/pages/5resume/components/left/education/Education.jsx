// components / left / education / Education.jsx

// right now, just handling how we want to handle an array of education data,
// like multiple schools.

// adding more fields, reference drawing in notebook.
// make it a bank of universities, so users can choose from a list.
// making degree and disciple necessary fields.
// potentially reorganizing the start date, end date, and current checkbox.
// option to save their data.
// bank for location (idk some API)
// able to have no education entries if needed (like bootcamps).

// imports.
import React, { useState, useEffect } from 'react';
import Switch from 'react-switch';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { RequiredAsterisk, ChevronDown, ChevronUp} from '@/components/icons'

// local imports.
import EduSubSection from './EduSubSection';
import { formatDateForInput } from '@/pages/utils/DataFormatting';

// -- external helpers --

// helper function to normalize education entries.
const normalizeEducation = (edu = null) => {

    // if edu is null (new entry), start with default "relevant coursework".
    // if edu exists (from backend), use its subsections (even if empty) - respect user's choice
    let subsections = {}
    if (edu === null) {
        // brand new entry - add default
        subsections = { 'Relevant Coursework': '' }
    } else {
        // existing entry - use what's in the data (or empty object if null/undefined)
        subsections = edu.subsections || {}
    }
    
    return {
        school: edu?.school || '',
        degree: edu?.degree || '',
        discipline: edu?.discipline || '',
        location: edu?.location || '',
        start_date: formatDateForInput(edu?.start_date),
        end_date: formatDateForInput(edu?.end_date),
        current: edu?.current || false,
        gpa: edu?.gpa || '',
        minor: edu?.minor || '',
        subsections: subsections,
    }
}

const Education = ({ educationData, onEducationChange, isVisible = true, onVisibilityChange }) => {

	// ----- states -----

	// expanded state.
    const [isEducationExpanded, setIsEducationExpanded] = useState(true);

    // education entries state.
    const [educations, setEducations] = useState(() => {
        if (educationData && educationData.length > 0) {
            return educationData.map(edu => normalizeEducation(edu))
        }
		
        // if no data, start with one empty entry.
        return [normalizeEducation()]
    })

	// ----- helper functions -----

    // update a specific education entry by index.
    const updateEducation = (index, field, value) => {
        setEducations(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: value }
            return updated
        })
    }

    // add a new empty education entry.
    const addEducation = () => {
        setEducations(prev => [...prev, normalizeEducation()])
    }

    // remove an education entry by index.
    const removeEducation = (index) => {
        setEducations(prev => {
            if (prev.length <= 1) return prev // keep at least one entry.
            return prev.filter((_, i) => i !== index)
        })
    }

	// ----- subsection helpers -----

    // update subsection title for a specific education entry.
    const updateSubsectionTitle = (eduIndex, oldTitle, newTitle) => {
        if (!newTitle.trim() || oldTitle === newTitle) return
        
        setEducations(prev => {
            const updated = [...prev]
            const subsections = { ...updated[eduIndex].subsections }
            const content = subsections[oldTitle] || ''
            delete subsections[oldTitle]
            subsections[newTitle] = content
            updated[eduIndex] = { ...updated[eduIndex], subsections }
            return updated
        })
    }

    // update subsection content for a specific education entry.
    const updateSubsectionContent = (eduIndex, title, content) => {
        setEducations(prev => {
            const updated = [...prev]
            updated[eduIndex] = {
                ...updated[eduIndex],
                subsections: { ...updated[eduIndex].subsections, [title]: content }
            }
            return updated
        })
    }

    // add a new subsection to a specific education entry.
    const addSubsection = (eduIndex) => {
        setEducations(prev => {
            const updated = [...prev]
            const newTitle = `New Section ${Object.keys(updated[eduIndex].subsections).length + 1}`
            updated[eduIndex] = {
                ...updated[eduIndex],
                subsections: { ...updated[eduIndex].subsections, [newTitle]: '' }
            }
            return updated
        })
    }

    // remove a subsection from a specific education entry.
    const removeSubsection = (eduIndex, title) => {
        setEducations(prev => {
            const updated = [...prev]
            const subsections = { ...updated[eduIndex].subsections }
            delete subsections[title]
            updated[eduIndex] = { ...updated[eduIndex], subsections }
            return updated
        })
    }

	// ----- effects -----

	// sync with prop changes.
    useEffect(() => {
        if (educationData && educationData.length > 0) {
            setEducations(educationData.map(edu => normalizeEducation(edu)))
        }
    }, [educationData])

    // export educations array to parent component.
    useEffect(() => {
        onEducationChange(educations)
    }, [educations])

    return (
        <div className="flex flex-col mb-4 border-[2px] border-brand-pink-light rounded-md p-4">
			{/* header with chevron */}
			<button
				type="button"
				onClick={() => setIsEducationExpanded(!isEducationExpanded)}
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
						aria-label={isVisible ? 'Hide education in preview' : 'Show education in preview'}
						title={isVisible ? 'Hide from preview' : 'Show in preview'}
					>
						<FontAwesomeIcon icon={isVisible ? faEye : faEyeSlash} className="w-4 h-4 text-gray-600" />
					</button>
				)}
				
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
					<p className="text-[0.875rem] text-gray-500 mb-2">This is where you can explain your education history.</p>
					
					{/* Map over each education entry */}
					{educations.map((education, index) => (
						<div key={index} className="mb-2 p-4 border border-gray-300 rounded-md">
							{/* entry header with remove button (only show if there are multiple entries) */}
							<div className="flex items-center justify-between mb-2 border-b-2 border-brand-pink-light pb-1">
								<h3 className="text-lg font-medium text-gray-700 m-0 p-0">
									Education {index + 1}
								</h3>
								{educations.length > 1 && (
									<button
										type="button"
										onClick={() => removeEducation(index)}
										className="text-red-500 hover:text-red-700 text-sm"
									>
										Remove
									</button>
								)}
							</div>

							{/* school name */}
							<div className="flex mb-2">
								<div className="labelInputPair">
									<label className="label">School Name <RequiredAsterisk /></label>
									<input
										type="text"
										value={education.school}
										onChange={(e) => updateEducation(index, 'school', e.target.value)}
										className="input"
										required
									/>
								</div>
							</div>
							
							{/* degree and discipline */}
							<div className="flex row mb-1 gap-2">
								{/* degree */}
								<div className="flex-1 mb-2">
									<div className="labelInputPair">
										<label className="label">Degree <RequiredAsterisk /></label>
										<input
											type="text"
											value={education.degree}
											onChange={(e) => updateEducation(index, 'degree', e.target.value)}
											className="input"
										/>
									</div>
								</div>

								{/* discipline */}
								<div className="flex-1 mb-2">
									<div className="labelInputPair">
										<label className="label">Discipline <RequiredAsterisk /></label>
										<input
											type="text"
											value={education.discipline}
											onChange={(e) => updateEducation(index, 'discipline', e.target.value)}
											className="input"
										/>
									</div>
								</div>
							</div>

							{/* minor and location */}
							<div className="flex row mb-1 gap-2">
								{/* minor */}
								<div className="flex-1 mb-2">
									<div className="labelInputPair">
										<label className="label">Minor</label>
										<input
											type="text"
											value={education.minor}
											onChange={(e) => updateEducation(index, 'minor', e.target.value)}
											className="input"
										/>
									</div>
								</div>

								{/* location */}
								<div className="flex-1 mb-2">
									<div className="labelInputPair">
										<label className="label">Location</label>
										<input
											type="text"
											value={education.location}
											onChange={(e) => updateEducation(index, 'location', e.target.value)}
											className="input"
										/>
									</div>
								</div>
							</div>

							{/* start date and current checkbox */}
							<div className="flex gap-4 mb-2">
								{/* start date */}
								<div className="flex-1">
									<div className="labelInputPair">
										<label className="label">Start Date</label>
										<input
											type="date"
											value={education.start_date}
											onChange={(e) => updateEducation(index, 'start_date', e.target.value)}
											className="input"
										/>
									</div>
								</div>

								{/* current toggle */}
								<div className="flex-1 flex flex-col">
									<label className="label">Currently Attending</label>
									<div className="flex justify-center items-center h-10">
										<Switch
											checked={education.current}
											onChange={(checked) => updateEducation(index, 'current', checked)}
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

							{/* end date and gpa */}
							<div className="flex gap-4 mb-2">
								{/* end date */}
								<div className="flex-1">
									<div className="labelInputPair">
										<label className="label">End Date</label>
										<input
											type="date"
											value={education.end_date}
											onChange={(e) => updateEducation(index, 'end_date', e.target.value)}
											className="input"
											disabled={education.current}
										/>
									</div>
								</div>

								{/* gpa */}
								<div className="flex-1">
									<div className="labelInputPair">
										<label className="label">GPA</label>
										<input
											type="text"
											value={education.gpa}
											onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
											className="input"
										/>
									</div>
								</div>
							</div>

							{/* highlights section */}
							<div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-300">
								{/* highlights header with plus icon */}
								<div className="flex items-center gap-2">
									<h4 className="text-base font-semibold text-gray-800">Highlights</h4>
									<button
										type="button"
										onClick={() => addSubsection(index)}
										className="text-white rounded-full bg-brand-pink w-7 h-7 hover:text-white hover:bg-brand-pink-dark transition-colors"
										title="Add new subsection"
									>
										<FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
									</button>
								</div>

								{/* subsections list */}
								<div className="flex flex-col gap-3">
									{Object.keys(education.subsections).length === 0 ? (
										// empty state
										<div className="flex flex-col items-center justify-center py-8 text-gray-400">
											<span className="text-4xl mb-2">😞</span>
											<p className="text-sm">No highlights</p>
										</div>
									) : (
										Object.entries(education.subsections).map(([title, content], subsectionIndex) => {
											const subsectionKey = `edu-${index}-sub-${subsectionIndex}`
											return (
												<EduSubSection
													key={subsectionKey}
													eduIndex={index}
													title={title}
													content={content}
													onTitleChange={(newTitle) => updateSubsectionTitle(index, title, newTitle)}
													onContentChange={(newContent) => updateSubsectionContent(index, title, newContent)}
													onDelete={() => removeSubsection(index, title)}
												/>
											)
										})
									)}
								</div>
							</div>
						</div>
					))}

					{/* add new education button */}
					<div className="flex justify-center mt-2">
						<button
							type="button"
							onClick={addEducation}
							className="px-4 py-2 bg-brand-pink-light text-white rounded-full hover:bg-brand-pink transition-colors"
						>
							<FontAwesomeIcon icon={faPlus} className="w-4 h-4 color-white mr-2" /> Add Another Education
						</button>
					</div>
				</div>
			)}
		</div>
    )
}

export default Education;
