/**
 * middleware/auth.js
 * Protects routes by verifying the JWT token sent in the Authorization header.
 * If the token is valid, the decoded user object is attached to req.user
 * so controllers can access the current user's id, role, and email.
 *
 * Usage: router.get('/protected', verifyToken, controller)
 */

const jwt = require('jsonwebtoken');

// verifyToken — middleware that checks the Bearer token on every protected request
function verifyToken(req, res, next) {
  // Expect: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  // Extract the token part after "Bearer "
  const token = authHeader.split(' ')[1];

  try {
    // Verify the token using the same secret used to sign it
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach the decoded payload to the request so controllers can use it
    req.user = decoded; // contains: { id, email, role, name }
    next();
  } catch (err) {
    // Token is expired or tampered with
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

module.exports = { verifyToken };
