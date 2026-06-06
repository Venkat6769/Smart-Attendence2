/**
 * db/seed.js
 * Seeds the database with the initial admin user.
 * Run with: node db/seed.js
 * This creates a default admin account you can use to log in and set up the system.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('./index');

async function seed() {
  try {
    // Hash the default admin password with bcrypt (10 salt rounds is standard)
    const defaultPassword = 'Admin@123';
    const hashedPassword  = await bcrypt.hash(defaultPassword, 10);

    // Insert the admin user — ON CONFLICT ensures this is safe to run multiple times
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, must_change_password)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email`,
      ['System Admin', 'admin@university.edu', hashedPassword, 'admin', false]
    );

    if (result.rows.length > 0) {
      console.log('Admin user created successfully:');
      console.log('  Email:    admin@university.edu');
      console.log('  Password: Admin@123');
      console.log('  --> Please change the password immediately after first login.');
    } else {
      console.log('Admin user already exists. Skipping seed.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
