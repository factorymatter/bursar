const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;

    // Fetch user permissions from database
    const userResult = await db.query(
      `SELECT u.*, ur.role as user_role
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       WHERE u.id = $1 AND u.status = 'active'`,
      [decoded.sub]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }

    req.userProfile = userResult.rows[0];

    // Fetch user scopes/permissions
    const roleResult = await db.query(
      `SELECT permissions FROM roles WHERE id = $1`,
      [userResult.rows[0].user_role]
    );

    req.userPermissions = roleResult.rows[0]?.permissions || [];

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

const requireScope = (...requiredScopes) => {
  return (req, res, next) => {
    const userScopes = req.userPermissions || [];

    const hasAllScopes = requiredScopes.every(scope => userScopes.includes(scope));

    if (!hasAllScopes) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredScopes,
        user: userScopes
      });
    }

    next();
  };
};

const requireInstitutionAccess = async (req, res, next) => {
  try {
    const institutionId = req.params.institutionId || req.body.institution_id;

    if (!institutionId) {
      return next();
    }

    // Check if user has access to this institution
    const result = await db.query(
      `SELECT * FROM user_institutions WHERE user_id = $1 AND institution_id = $2`,
      [req.user.sub, institutionId]
    );

    if (result.rows.length === 0) {
      // Check if user is a super admin (has access to all)
      const userResult = await db.query(
        'SELECT permissions FROM user_roles WHERE user_id = $1',
        [req.user.sub]
      );

      const permissions = userResult.rows[0]?.permissions || [];

      if (!permissions.includes('access:all_institutions')) {
        return res.status(403).json({
          error: 'No access to this institution',
          code: 'INSTITUTION_ACCESS_DENIED'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Institution access check error:', error);
    return res.status(500).json({
      error: 'Permission check failed',
      code: 'PERMISSION_CHECK_FAILED'
    });
  }
};

module.exports = {
  auth: authMiddleware,
  requireScope,
  requireInstitutionAccess
};
