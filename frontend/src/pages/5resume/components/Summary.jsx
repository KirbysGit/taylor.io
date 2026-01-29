// pages / 5resume / components / Summary.jsx

// imports.
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from '@/components/icons'

const Summary = ({ summaryData, onSummaryChange }) => {
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
    
    return (
        <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-white">
            <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="text-lg font-semibold text-gray-900">Professional Summary</h3>
                {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </div>
            
            {isExpanded && (
                <div className="mt-4">
                    <textarea
                        value={summary}
                        onChange={handleChange}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent resize-y"
                        placeholder="Write a brief professional summary highlighting your experience, skills, and career goals..."
                    />
                    <p className="mt-2 text-sm text-gray-500">
                        {summary.length} characters
                    </p>
                </div>
            )}
        </div>
    );
};

export default Summary;
