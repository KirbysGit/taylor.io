// pages / 3setup / steps / CompleteScreen.jsx

// imports.
import React from 'react';

const CompleteScreen = ({ formData, handleComplete }) => {
    return (
        <div className="w-full">
            <div className="text-center">
                <div className="text-5xl mb-4">✨</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    You're all set!
                </h2>
                <p className="text-gray-600 mb-8">
                    Ready to see your resume?
                </p>
            </div>

            <div className="text-center">
                <button
                    onClick={handleComplete}
                    className="w-full px-8 py-4 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all text-lg"
                >
                    Continue →
                </button>
            </div>
        </div>
    )
}

export default CompleteScreen;
