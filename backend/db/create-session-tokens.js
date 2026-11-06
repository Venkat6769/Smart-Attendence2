require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('./index');

async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_session_tokens_token ON session_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_session_tokens_session_id ON session_tokens(session_id);
  `);
  console.log('Table session_tokens created successfully!');
  await pool.end();
}

createTable().catch(err => {
  console.error('Error creating table:', err);
  process.exit(1);
});
