// pages / 3setup / steps / SummaryStep.jsx

// imports.
import React from 'react';
import SummaryInput from '@/components/inputs/SummaryInput';

const SummaryStep = ({ summary, onUpdate }) => {
    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-3">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Professional Summary
                </h2>
                <p className="text-gray-600">
                    {summary 
                        ? "We found a summary from your resume! Feel free to review and edit it, or write something new."
                        : "Share a brief overview of who you are professionally. This helps employers get to know you better."
                    }
                </p>
            </div>

            <div className="smallDivider mb-3" />
            
            {summary && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-semibold mb-1">✓ Summary found from your resume</p>
                    <p className="text-xs text-blue-700">You can edit it below or write a new one.</p>
                </div>
            )}
            
            <SummaryInput summary={summary} onUpdate={onUpdate} />
        </div>
    );
};

export default SummaryStep;
