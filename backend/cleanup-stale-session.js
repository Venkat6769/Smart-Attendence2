const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db/index');

async function cleanup() {
  try {
    const res = await pool.query("UPDATE attendance_sessions SET status = 'closed', closed_at = NOW() WHERE status = 'active'");
    console.log('Closed active sessions count:', res.rowCount);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

cleanup();
