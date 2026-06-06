/**
 * src/components/QRDisplay.jsx
 * Displays a QR code image with a live countdown timer.
 * Shows "Session Closed" if the session has ended.
 * The QR code is a base64 PNG data URL returned by the backend.
 */

import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

/**
 * QRDisplay — shows the QR image and counts down to expiry
 * @param {string}  qrCode     - base64 PNG data URL
 * @param {string}  expiresAt  - ISO timestamp when the QR expires
 * @param {string}  sessionId  - session ID for polling
 * @param {boolean} isClosed   - true when the session has been ended
 * @param {string}  courseCode - shown above the QR
 */
export default function QRDisplay({ qrCode, expiresAt, isClosed, courseCode, sessionId }) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Calculate and count down the remaining time
  useEffect(() => {
    if (!expiresAt || isClosed) return;

    function updateTimer() {
      const diff = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setSecondsLeft(diff);
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, isClosed]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isExpired = secondsLeft === 0 && !isClosed;

  if (isClosed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <Lock size={28} className="text-gray-500" />
        </div>
        <p className="font-heading text-xl font-semibold text-plum-950">Session Closed</p>
        <p className="text-sm text-gray-500">This session has been ended by the lecturer.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Course label */}
      {courseCode && (
        <p className="text-sm font-semibold text-violet bg-violet-xlight px-3 py-1 rounded-full">
          {courseCode}
        </p>
      )}

      {/* QR Code image */}
      <div className={`p-3 bg-white rounded-2xl border-4 ${isExpired ? 'border-rose-300 opacity-40' : 'border-violet-xlight'} shadow-lg`}>
        <img
          src={qrCode}
          alt="Attendance QR Code"
          className="w-64 h-64 block"
        />
      </div>

      {/* Countdown timer */}
      {isExpired ? (
        <div className="text-center">
          <p className="text-rose-500 font-semibold font-heading">QR Code Expired</p>
          <p className="text-xs text-gray-400 mt-1">Ask your lecturer to start a new session.</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Expires in</p>
          <p className={`font-heading text-3xl font-bold tabular-nums ${secondsLeft < 120 ? 'text-rose-500' : 'text-violet'}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </p>
          <p className="text-xs text-gray-400 mt-1">Students — scan this code to mark attendance</p>
        </div>
      )}
    </div>
  );
}
