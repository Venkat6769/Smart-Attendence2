/**
 * src/pages/student/ScanQR.jsx
 * Student QR scanning page. Uses the device camera to scan the lecturer's QR code
 * and submits the token to the backend to record attendance.
 *
 * NOTE: Camera requires HTTPS on mobile (especially iOS Safari).
 * Localhost works without HTTPS during development.
 */

import React, { useState } from 'react';
import api from '../../api/axios';
import QRScanner from '../../components/QRScanner';
import { CheckCircle, XCircle } from 'lucide-react';

export default function ScanQR() {
  const [result,  setResult]  = useState(null);  // { success: true/false, message }
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);  // true after successful scan

  /**
   * handleScan — called by QRScanner with the decoded token string
   * Sends the token to the backend to mark attendance
   */
  async function handleScan(token) {
    if (loading || done) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('/api/attendance/scan', { token });
      setResult({ success: true, message: res.data.data.message || 'Attendance marked!' });
      setDone(true);
    } catch (err) {
      setResult({
        success: false,
        message: err.response?.data?.error || 'Failed to mark attendance. Please try again.',
      });
      // Allow the student to retry after a failed scan
      setTimeout(() => setResult(null), 4000);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setDone(false);
    setResult(null);
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-plum-950">Scan QR Code</h1>
        <p className="text-sm text-gray-500 mt-1">
          Point your camera at the QR code on the lecturer's screen to mark your attendance.
        </p>
      </div>

      {/* Camera requires HTTPS info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
        <strong>Camera Note:</strong> Camera access requires a secure connection (HTTPS) on mobile browsers.
        If prompted, allow camera permissions. On iOS Safari, go to Settings → Safari → Camera if blocked.
      </div>

      {/* Result message */}
      {result && (
        <div className={`rounded-xl p-4 mb-6 text-sm font-medium ${
          result.success
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border border-rose-200 text-rose-700'
        }`}>
          <span className="flex items-center gap-2">
            {result.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {result.message}
          </span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-4 mb-4">
          <div className="w-8 h-8 border-4 border-violet-xlight border-t-violet rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Verifying your attendance...</p>
        </div>
      )}

      {/* QR Scanner */}
      <div className="bg-white border border-violet-xlight rounded-2xl p-5">
        <QRScanner onScan={handleScan} disabled={done || loading} />

        {done && (
          <div className="mt-5 text-center">
            <button
              onClick={handleReset}
              className="text-sm text-violet font-semibold hover:underline"
            >
              Scan another QR code
            </button>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="mt-6 bg-violet-xlight rounded-xl p-4 text-sm text-plum-950">
        <p className="font-semibold mb-2">Troubleshooting</p>
        <ul className="space-y-1 text-xs text-gray-600 list-disc list-inside">
          <li>Ensure the QR code is well-lit and fully visible</li>
          <li>Hold your camera steady and avoid glare on the screen</li>
          <li>Ask your lecturer if the QR code has expired</li>
          <li>You can only scan once per session</li>
          <li>You must be enrolled in the course to mark attendance</li>
        </ul>
      </div>
    </div>
  );
}
