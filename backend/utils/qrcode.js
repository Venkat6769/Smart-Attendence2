/**
 * utils/qrcode.js
 * Generates a QR code image as a base64-encoded PNG string.
 * The QR code encodes the session token so students can scan it.
 * The base64 string is sent to the frontend and displayed in an <img> tag.
 */

const QRCode = require('qrcode');

/**
 * generateQRCode — converts a session token string into a base64 QR image
 * @param {string} token - the unique session token to encode in the QR
 * @returns {Promise<string>} base64 PNG data URL (starts with "data:image/png;base64,...")
 */
async function generateQRCode(token) {
  // QRCode.toDataURL returns a base64 PNG data URL ready to use as <img src="...">
  const dataUrl = await QRCode.toDataURL(token, {
    width: 300,           // size of the QR image in pixels
    margin: 2,            // quiet zone around the QR
    color: {
      dark:  '#1e1b2e',  // plum color for QR dots (matches our theme)
      light: '#ffffff',  // white background
    },
  });
  return dataUrl;
}

module.exports = { generateQRCode };
