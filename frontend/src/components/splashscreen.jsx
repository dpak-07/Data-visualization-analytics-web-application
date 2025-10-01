// src/components/SplashScreen.jsx
import React from 'react';


const SplashScreen = () => {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
      <div className="animate-bounce mb-4">
        <svg className="h-16 w-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-blue-700 animate-fadeIn">Study Spark</h1>
      <p className="text-sm text-gray-500 mt-2 animate-fadeIn delay-200">Loading your experience...</p>
    </div>
  );
};
export default SplashScreen;
