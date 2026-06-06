/**
 * src/components/AttendanceTable.jsx
 * Reusable table component for displaying attendance records.
 * Supports pagination and shows colored status badges.
 */

import React, { useState } from 'react';
import { Inbox, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 15;

/**
 * AttendanceTable — renders a paginated attendance table
 * @param {Array}  rows    - array of attendance record objects
 * @param {Array}  columns - array of { key, label, render? } column definitions
 * @param {string} emptyMessage - text shown when there are no rows
 */
export default function AttendanceTable({ rows = [], columns = [], emptyMessage = 'No records found.' }) {
  const [page, setPage] = useState(1);

  const totalPages  = Math.ceil(rows.length / PAGE_SIZE);
  const start       = (page - 1) * PAGE_SIZE;
  const visibleRows = rows.slice(start, start + PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 font-body">
        <Inbox size={40} className="text-gray-300 mb-3 mx-auto" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Scrollable table wrapper */}
      <div className="overflow-x-auto rounded-xl border border-violet-xlight">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="bg-violet-xlight text-plum-950">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left font-heading font-semibold text-xs uppercase tracking-wide"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-xlight">
            {visibleRows.map((row, i) => (
              <tr key={i} className="bg-white hover:bg-canvas transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-plum-950">
                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm font-body">
          <p className="text-gray-500">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of {rows.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-violet-xlight text-plum-950 disabled:opacity-40 hover:bg-violet-xlight transition-colors"
            >
              <ChevronLeft size={14} className="inline" /> Prev
            </button>
            <span className="px-3 py-1.5 text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-violet-xlight text-plum-950 disabled:opacity-40 hover:bg-violet-xlight transition-colors"
            >
              Next <ChevronRight size={14} className="inline" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * StatusBadge — colored badge for present/absent/active/closed/at-risk statuses
 * @param {string} status
 */
export function StatusBadge({ status }) {
  const config = {
    present:  { cls: 'bg-emerald-100 text-emerald-700', label: 'Present' },
    absent:   { cls: 'bg-rose-100 text-rose-700',       label: 'Absent' },
    active:   { cls: 'bg-emerald-100 text-emerald-700', label: 'Active' },
    closed:   { cls: 'bg-gray-100 text-gray-600',       label: 'Closed' },
    'at risk':{ cls: 'bg-amber-100 text-amber-700',     label: 'At Risk' },
    ok:       { cls: 'bg-emerald-100 text-emerald-700', label: 'OK' },
  };

  const c = config[status?.toLowerCase()] || { cls: 'bg-gray-100 text-gray-600', label: status };

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.cls}`}>
      {c.label}
    </span>
  );
}
