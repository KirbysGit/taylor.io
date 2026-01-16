import React from 'react';

const CompleteScreen = ({ formData, handleComplete }) => {
    return (
        <div className="py-8">
            <div className="text-center mb-8">
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    You're All Set!
                </h2>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                    Great job! You've completed your initial setup. You can always add more information later from your dashboard.
                </p>
            </div>

            {/* Optional: Extracurriculars */}
            {(formData.extracurriculars.length > 0 || formData.coursework.length > 0) && (
                <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Additional Information</h3>
                    
                    {formData.extracurriculars.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-medium text-gray-700 mb-2">Extracurriculars:</h4>
                            <div className="space-y-2">
                                {formData.extracurriculars.map((extra, index) => (
                                    <div key={extra.id || index} className="bg-white p-3 rounded border border-gray-200">
                                        <p className="font-medium text-gray-900">{extra.name}</p>
                                        {extra.role && <p className="text-sm text-gray-600">{extra.role}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {formData.coursework.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">Coursework:</h4>
                            <div className="flex flex-wrap gap-2">
                                {formData.coursework.map((course, index) => (
                                    <span key={course.id || index} className="bg-white px-3 py-1 rounded border border-gray-200 text-sm">
                                        {course.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="text-center">
                <button
                    onClick={handleComplete}
                    className="px-8 py-3 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
                >
                    Go to Dashboard →
                </button>
            </div>
        </div>
    )
}

export default CompleteScreen;