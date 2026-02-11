// pages / 5resume / components / Summary.jsx

// imports.
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from '@/components/icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

const Summary = ({ summaryData, onSummaryChange, isVisible = false, onVisibilityChange }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [summary, setSummary] = useState(summaryData?.summary || '');
    
    // sync with prop changes.
    useEffect(() => {
        setSummary(summaryData?.summary || '');
    }, [summaryData]);
    
    // handle text change and export to parent.
    const handleChange = (e) => {
        const value = e.target.value;
        setSummary(value);
        onSummaryChange({ summary: value });
    };

    // handle visibility toggle.
    const handleVisibilityToggle = (e) => {
        e.stopPropagation(); // prevent expanding/collapsing when clicking toggle
        onVisibilityChange?.(!isVisible);
    };
    
    return (
        <div>
            <div className="flex flex-col mb-4 border-[2px] border-brand-pink-light rounded-md p-4">
                {/* header with chevron */}
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-3 w-full transition-colors"
                >
                    {/* Visibility Toggle Button - Left side in circle */}
                    <button
                        type="button"
                        onClick={handleVisibilityToggle}
                        className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        aria-label={isVisible ? 'Hide summary in preview' : 'Show summary in preview'}
                        title={isVisible ? 'Hide from preview' : 'Show in preview'}
                    >
                        <FontAwesomeIcon icon={isVisible ? faEye : faEyeSlash} className="w-4 h-4 text-gray-600" />
                    </button>
                    
                    {/* title */}
                    <h1 className="text-[1.375rem] font-semibold text-gray-900">Professional Summary</h1>
                    
                    {/* divider */}
                    <div className="flex-1 h-[3px] rounded bg-gray-300"></div>
                    
                    {/* chevron in circle */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-600" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                        )}
                    </div>
                </button>
                
                {isExpanded && (
                    <div>
                        <p className="text-[0.875rem] text-gray-500 mb-2">Write a brief professional summary highlighting your experience, skills, and career goals.</p>
                        <div className="labelInputPair">
                            <textarea
                                value={summary}
                                onChange={handleChange}
                                rows={6}
                                className="input resize-y"
                                placeholder="Write a brief professional summary highlighting your experience, skills, and career goals..."
                            />
                            <p className="mt-2 text-sm text-gray-500">
                                {summary.length} characters
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Summary;
