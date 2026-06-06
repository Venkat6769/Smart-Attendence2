/**
 * middleware/roles.js
 * Role-based access control middleware.
 * Use requireRole('admin') or requireRole('lecturer', 'admin') to restrict routes
 * to specific user roles. Must be used AFTER verifyToken so req.user is available.
 *
 * Usage: router.post('/admin-only', verifyToken, requireRole('admin'), controller)
 */

// requireRole — returns a middleware function that checks if the user has one of the allowed roles
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // req.user is set by the verifyToken middleware
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    // Check if the user's role is in the list of allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = { requireRole };
