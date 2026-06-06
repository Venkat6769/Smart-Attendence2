/**
 * db/index.js
 * Creates and exports a PostgreSQL connection pool using the `pg` library.
 * All database queries throughout the app import this pool and call pool.query().
 * Using a pool (not a single connection) is important for production: it handles
 * multiple simultaneous requests without opening a new DB connection each time.
 */

const { Pool } = require('pg');

// Create the connection pool using the DATABASE_URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Supabase requires SSL. rejectUnauthorized: false is needed for Supabase's
    // self-signed cert in development. In production, set this to true if you have the CA cert.
    rejectUnauthorized: false,
  },
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
