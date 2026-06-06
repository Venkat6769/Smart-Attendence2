/**
 * src/components/StatsCard.jsx
 * Reusable dashboard metric card that displays a label, a value, and an optional icon.
 * Used on all three dashboards (admin, lecturer, student).
 */

import React from 'react';

/**
 * StatsCard — displays a single metric on the dashboard
 * @param {React.ComponentType} icon  - Lucide icon component
 * @param {string}  label   - the metric name (e.g. "Total Students")
 * @param {string}  value   - the metric value (e.g. "142")
 * @param {string}  color   - 'violet' | 'success' | 'warning' | 'danger'
 * @param {string}  sub     - optional subtitle text (e.g. "enrolled this semester")
 */
export default function StatsCard({ label, value, icon: Icon, color = 'violet', sub }) {
  const colorMap = {
    violet:  'bg-violet text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
    danger:  'bg-rose-500 text-white',
    plum:    'bg-plum-950 text-white',
  };

  return (
    <div className="bg-white rounded-xl border border-violet-xlight p-5 flex items-start gap-4 shadow-sm">
      {/* Icon badge */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        {Icon && <Icon size={22} />}
      </div>

      {/* Text content */}
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-body">{label}</p>
        <p className="text-2xl font-heading font-bold text-plum-950 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}
