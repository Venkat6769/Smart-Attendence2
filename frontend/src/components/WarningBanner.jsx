/**
 * src/components/WarningBanner.jsx
 * Displays a prominent amber warning banner listing courses where
 * the student's attendance has fallen below 75%.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * WarningBanner — shown at the top of the student dashboard when attendance is low
 * @param {Array} warnings - array of { code, title, percentage } objects
 */
export default function WarningBanner({ warnings }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />

        <div>
          <h3 className="font-heading font-semibold text-amber-800 text-sm">
            Attendance Warning — {warnings.length} course{warnings.length > 1 ? 's' : ''} below 75%
          </h3>
          <p className="text-xs text-amber-700 mt-1 mb-2">
            You risk being barred from exams if attendance drops further. Please attend classes.
          </p>

          {/* List each flagged course */}
          <ul className="space-y-1">
            {warnings.map(w => (
              <li key={w.course_id} className="flex items-center gap-2 text-xs text-amber-800">
                <span className="font-semibold">{w.code}</span>
                <span className="text-amber-600">{w.title}</span>
                <span className="ml-auto font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">
                  {w.percentage}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
