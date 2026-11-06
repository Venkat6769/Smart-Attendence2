/**
 * src/components/QRScanner.jsx
 * Uses the html5-qrcode library to access the device camera and scan a QR code.
 * Calls onScan(token) when a valid QR code is detected.
 *
 * IMPORTANT NOTE FOR DEPLOYMENT:
 * Camera access via getUserMedia() requires a SECURE CONTEXT (HTTPS).
 * On mobile browsers (especially iOS Safari), this page MUST be served over HTTPS.
 * On localhost, it works without HTTPS. On production, ensure your domain has SSL.
 * If camera access is denied, we show a helpful error message with instructions.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle, CameraOff, Lock } from 'lucide-react';

/**
 * QRScanner — opens the device camera and calls onScan(token) when a QR is detected.
 * Uses Html5Qrcode directly (not the scanner UI) for better mobile control.
 *
 * Camera requires HTTPS on mobile — ngrok provides this automatically.
 */
export default function QRScanner({ onScan, disabled }) {
  const scannerRef   = useRef(null);
  const [error,      setError]      = useState(null);
  const [starting,   setStarting]   = useState(false);
  const [cameraOn,   setCameraOn]   = useState(false);

  // Start the camera when the component mounts
  useEffect(() => {
    if (disabled) return;

    // Track whether start() completed so cleanup only stops a running scanner
    let isRunning = false;
    let isMounted = true;

    const html5Qrcode = new Html5Qrcode('qr-reader-box');
    scannerRef.current = html5Qrcode;

    if (isMounted) setStarting(true);

    html5Qrcode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        isRunning = false;
        html5Qrcode.stop().catch(() => {});
        onScan(decodedText);
      },
      () => {} // ignore per-frame "no QR found" errors
    )
    .then(() => {
      if (!isMounted) {
        html5Qrcode.stop().catch(() => {});
        return;
      }
      isRunning = true;
      setCameraOn(true);
      setError(null);
    })
    .catch((err) => {
      isRunning = false;
      if (!isMounted) return;
      const msg = String(err).toLowerCase();
      if (msg.includes('permission') || msg.includes('denied') || msg.includes('notallowed')) {
        setError('permission_denied');
      } else if (msg.includes('https') || msg.includes('secure')) {
        setError('needs_https');
      } else {
        setError('generic');
      }
    })
    .finally(() => { if (isMounted) setStarting(false); });

    return () => {
      isMounted = false;
      // Only call stop() if the camera actually started — avoids the "not running" error
      if (isRunning) {
        html5Qrcode.stop().catch(() => {});
      }
    };
  }, [disabled]);

  if (disabled) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle size={36} className="text-emerald-500" />
        </div>
        <p className="font-heading text-lg font-semibold text-emerald-700">Attendance Recorded!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">

      {/* Permission denied error */}
      {error === 'permission_denied' && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 w-full">
          <p className="font-semibold mb-2 flex items-center gap-2"><CameraOff size={16} /> Camera Access Denied</p>
          <p className="mb-3">Your browser blocked camera access. Follow the steps for your device:</p>
          <div className="space-y-2 text-xs">
            <div className="bg-white rounded-lg p-3 border border-rose-100">
              <p className="font-semibold mb-1">iPhone / iPad (Safari)</p>
              <p>Settings → Safari → Camera → Allow</p>
              <p className="text-gray-500 mt-1">Then reload this page.</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-rose-100">
              <p className="font-semibold mb-1">Android (Chrome)</p>
              <p>Tap the <Lock size={12} className="inline align-text-bottom" /> lock icon in the address bar &rarr; Permissions &rarr; Camera &rarr; Allow</p>
              <p className="text-gray-500 mt-1">Then reload this page.</p>
            </div>
          </div>
        </div>
      )}

      {/* HTTPS required error */}
      {error === 'needs_https' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 w-full">
          <p className="font-semibold mb-1 flex items-center gap-2"><Lock size={16} /> HTTPS Required</p>
          <p>Camera access requires a secure connection. Make sure you're opening the <strong>ngrok HTTPS URL</strong>, not http://localhost.</p>
        </div>
      )}

      {/* Generic error */}
      {error === 'generic' && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 w-full">
          <p className="font-semibold mb-1">Camera Error</p>
          <p>Could not start the camera. Try reloading the page or using a different browser.</p>
        </div>
      )}

      {/* Loading state */}
      {starting && (
        <div className="flex items-center gap-3 text-sm text-gray-500 py-4">
          <div className="w-5 h-5 border-2 border-violet border-t-transparent rounded-full animate-spin" />
          Requesting camera access...
        </div>
      )}

      {/* Camera viewfinder */}
      <div
        id="qr-reader-box"
        className="w-full max-w-sm rounded-xl overflow-hidden border-2 border-violet-xlight bg-black min-h-[280px]"
      />

      {cameraOn && (
        <p className="text-xs text-gray-400 text-center">
          Hold the QR code steady inside the frame
        </p>
      )}
    </div>
  );
}
