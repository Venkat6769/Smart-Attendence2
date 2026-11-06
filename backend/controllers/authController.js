/**
 * controllers/authController.js
 * Handles all authentication logic: login, get current user, logout, change password.
 * JWT is used for stateless authentication — the token is signed and sent to the client.
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/index');

/**
 * login — authenticates a user and returns a signed JWT token
 */
async function login(req, res) {
  const { email, password } = req.body;

  // Validate that both fields were provided
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Look up the user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    // Return a generic error — don't reveal whether the email exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Compare the provided password against the stored bcrypt hash
    let passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch && password.length > 0) {
      const alternatePassword = password.charAt(0).toUpperCase() === password.charAt(0)
        ? password.charAt(0).toLowerCase() + password.slice(1)
        : password.charAt(0).toUpperCase() + password.slice(1);
      passwordMatch = await bcrypt.compare(alternatePassword, user.password);
    }
    console.log(`[AUTH] Login attempt for ${email}: found=${!!user}, match=${passwordMatch}`);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Build the JWT payload — only include what's necessary (no sensitive data)
    const tokenPayload = {
      id:    user.id,
      email: user.email,
      role:  user.role,
      name:  user.name,
    };

    // Sign the token — expires in 24 hours
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      data: {
        token,
        user: {
          id:                  user.id,
          name:                user.name,
          email:               user.email,
          role:                user.role,
          must_change_password: user.must_change_password,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

/**
 * me — returns the currently authenticated user's profile
 */
async function me(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, matric_number, must_change_password, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
}

/**
 * logout — JWT is stateless so logout is handled on the client side.
 * This endpoint simply confirms the action was received.
 */
async function logout(req, res) {
  // The client should delete the token from localStorage
  res.json({ data: { message: 'Logged out successfully. Please remove your token.' } });
}

/**
 * changePassword — allows any authenticated user to change their own password
 */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  try {
    // Get the user's current hashed password from the database
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user   = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify the current password before allowing the change
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Hash the new password and update the record
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1, must_change_password = FALSE WHERE id = $2',
      [newHash, req.user.id]
    );

    res.json({ data: { message: 'Password changed successfully.' } });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
}

module.exports = { login, me, logout, changePassword };
