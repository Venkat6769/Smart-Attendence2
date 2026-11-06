/**
 * src/components/QRDisplay.jsx
 * Displays a rotating dynamic QR code with a 5-second countdown timer.
 * Prevents attendance fraud / screenshot sharing by rotating the QR token every 5 seconds.
 */

import React, { useState, useEffect } from 'react';
import { Lock, Copy, Check, RefreshCw, ShieldCheck } from 'lucide-react';

/**
 * QRDisplay — shows the dynamic rotating QR image and counts down 5 seconds
 * @param {string}   qrCode          - base64 PNG data URL
 * @param {string}   expiresAt       - ISO timestamp when the overall session expires
 * @param {boolean}  isClosed        - true when the session has been ended
 * @param {string}   courseCode      - shown above the QR
 * @param {string}   token           - current rotating session token code
 * @param {function} onRefresh       - callback to immediately refresh the QR code
 * @param {number}   refreshInterval - duration of each QR cycle in seconds (default 5)
 */
export default function QRDisplay({
  qrCode,
  expiresAt,
  isClosed,
  courseCode,
  token,
  onRefresh,
  refreshInterval = 5,
}) {
  const [secondsLeft, setSecondsLeft] = useState(refreshInterval);
  const [copied, setCopied] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Reset countdown to refreshInterval whenever a new token or qrCode arrives
  useEffect(() => {
    setSecondsLeft(refreshInterval);
  }, [token, qrCode, refreshInterval]);

  // 1-second interval to tick down the 5-second countdown
  useEffect(() => {
    if (isClosed) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (onRefresh) onRefresh();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isClosed, onRefresh, refreshInterval]);

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

  // Calculate percentage of remaining time in 5s cycle for the progress bar
  const progressPercent = ((secondsLeft) / refreshInterval) * 100;

  async function handleManualRefresh() {
    if (isRotating || !onRefresh) return;
    setIsRotating(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRotating(false), 500);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Course & Security Badge */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {courseCode && (
          <span className="text-xs font-bold text-violet bg-violet-xlight px-3 py-1 rounded-full">
            {courseCode}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          <ShieldCheck size={14} className="text-emerald-600" />
          Rotating QR (Changes every 5s)
        </span>
      </div>

      {/* QR Code image container */}
      <div className="relative p-4 bg-white rounded-2xl border-4 border-violet-xlight shadow-xl transition-all duration-300">
        <img
          src={qrCode}
          alt="Attendance QR Code"
          className="w-64 h-64 block rounded-lg select-none"
        />

        {/* Floating pulse indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur px-2 py-0.5 rounded-full border border-violet-100 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-bold text-gray-600">LIVE</span>
        </div>
      </div>

      {/* 5-Second Countdown Indicator */}
      <div className="w-full max-w-xs text-center flex flex-col items-center gap-2">
        {/* Progress bar */}
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200">
          <div
            className="h-full bg-gradient-to-r from-violet to-fuchsia-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between w-full px-1">
          <span className="text-xs text-gray-500">QR Code refreshes in</span>
          <span className="font-heading font-extrabold text-lg text-violet tabular-nums flex items-center gap-1">
            {secondsLeft}s
          </span>
        </div>

        <p className="text-xs text-gray-400">
          Students must scan the current live QR code on this screen
        </p>

        {/* Session Token & Manual Copy */}
        {token && (
          <div className="mt-2 flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <span className="text-xs text-gray-500 font-medium">Live Code:</span>
            <code className="text-xs text-plum-950 font-mono font-semibold max-w-[140px] truncate select-all">
              {token}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(token);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-gray-400 hover:text-violet p-1 transition-colors"
              title="Copy current 5s code"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRotating}
              className="text-gray-400 hover:text-violet p-1 transition-colors ml-1"
              title="Rotate QR code now"
            >
              <RefreshCw size={14} className={isRotating ? 'animate-spin text-violet' : ''} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
