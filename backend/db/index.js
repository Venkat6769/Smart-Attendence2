/**
 * db/index.js
 * Creates and exports a PostgreSQL connection pool using the `pg` library.
 * All database queries throughout the app import this pool and call pool.query().
 * Using a pool (not a single connection) is important for production: it handles
 * multiple simultaneous requests without opening a new DB connection each time.
 */

const { Pool } = require('pg');

const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

// Create the connection pool using the DATABASE_URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : {
    // Supabase requires SSL. rejectUnauthorized: false is needed for Supabase's
    // self-signed cert in development. In production, set this to true if you have the CA cert.
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Crucial: Handle errors on idle clients so ECONNRESET does not crash the Node process
pool.on('error', (err) => {
  console.warn('Unexpected error on idle database client (will reconnect automatically):', err.message);
});

// Test the connection when the server starts
pool.connect((err, client, release) => {
  if (err) {
    console.error('Failed to connect to the database:', err.message);
  } else {
    console.log('Database connected successfully');
    release(); // release the test client back to the pool
  }
});

module.exports = pool;
