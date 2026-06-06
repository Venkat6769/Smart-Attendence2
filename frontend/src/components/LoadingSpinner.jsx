/**
 * src/components/LoadingSpinner.jsx
 * Simple centered loading indicator used while API calls are in progress.
 */

import React from 'react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      {/* Animated spinning ring */}
      <div className="w-10 h-10 border-4 border-violet-xlight border-t-violet rounded-full animate-spin" />
      <p className="text-sm text-gray-500 font-body">{message}</p>
    </div>
  );
}
