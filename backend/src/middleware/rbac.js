const { logger } = require('../utils/logger');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Comprehensive permission system for SmartStart Platform
 */

class RBACSystem {
  constructor() {
    this.permissions = {
      // User permissions
      'user:read': ['user', 'admin', 'moderator'],
      'user:write': ['user', 'admin', 'moderator'],
      'user:delete': ['admin'],
      'user:manage': ['admin'],
      
      // Venture permissions
      'venture:read': ['user', 'admin', 'moderator'],
      'venture:write': ['user', 'admin', 'moderator'],
      'venture:delete': ['user', 'admin'],
      'venture:manage': ['admin'],
      
      // Document permissions
      'document:read': ['user', 'admin', 'moderator'],
      'document:write': ['user', 'admin', 'moderator'],
      'document:delete': ['admin'],
      'document:manage': ['admin'],
      
      // Legal document permissions
      'legal:read': ['user', 'admin', 'moderator'],
      'legal:write': ['user', 'admin', 'moderator'],
      'legal:sign': ['user', 'admin', 'moderator'],
      'legal:manage': ['admin'],
      
      // Signature permissions
      'signature:read': ['user', 'admin', 'moderator'],
      'signature:write': ['user', 'admin', 'moderator'],
      'signature:delete': ['admin'],
      'signature:manage': ['admin'],
      
      // Subscription permissions
      'subscription:read': ['user', 'admin', 'moderator'],
      'subscription:write': ['user', 'admin', 'moderator'],
      'subscription:delete': ['admin'],
      'subscription:manage': ['admin'],
      
      // Dashboard permissions
      'dashboard:read': ['user', 'admin', 'moderator'],
      'dashboard:write': ['user', 'admin', 'moderator'],
      'dashboard:manage': ['admin'],
      
      // Admin permissions
      'admin:read': ['admin'],
      'admin:write': ['admin'],
      'admin:delete': ['admin'],
      'admin:manage': ['admin']
    };
  }

  /**
   * Check if user has permission
   * @param {string} userRole - User's role
   * @param {string} permission - Required permission
   * @returns {boolean} - Has permission
   */
  hasPermission(userRole, permission) {
    const allowedRoles = this.permissions[permission];
    if (!allowedRoles) {
      logger.warn(`Unknown permission: ${permission}`);
      return false;
    }
    return allowedRoles.includes(userRole);
  }

  /**
   * Check if user can access resource
   * @param {string} userRole - User's role
   * @param {string} resource - Resource type
   * @param {string} action - Action type
   * @returns {boolean} - Can access
   */
  canAccess(userRole, resource, action) {
    const permission = `${resource}:${action}`;
    return this.hasPermission(userRole, permission);
  }

  /**
   * Check if user can manage resource
   * @param {string} userRole - User's role
   * @param {string} resource - Resource type
   * @returns {boolean} - Can manage
   */
  canManage(userRole, resource) {
    return this.canAccess(userRole, resource, 'manage');
  }

  /**
   * Check if user can read resource
   * @param {string} userRole - User's role
   * @param {string} resource - Resource type
   * @returns {boolean} - Can read
   */
  canRead(userRole, resource) {
    return this.canAccess(userRole, resource, 'read');
  }

  /**
   * Check if user can write resource
   * @param {string} userRole - User's role
   * @param {string} resource - Resource type
   * @returns {boolean} - Can write
   */
  canWrite(userRole, resource) {
    return this.canAccess(userRole, resource, 'write');
  }

  /**
   * Check if user can delete resource
   * @param {string} userRole - User's role
   * @param {string} resource - Resource type
   * @returns {boolean} - Can delete
   */
  canDelete(userRole, resource) {
    return this.canAccess(userRole, resource, 'delete');
  }
}

// Create singleton instance
const rbacSystem = new RBACSystem();

/**
 * RBAC Middleware Factory
 * @param {string} resource - Resource type
 * @param {string} action - Action type
 * @returns {Function} - Express middleware
 */
const authorize = (resource, action) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;
      
      if (!userRole) {
        logger.warn('Authorization failed: No user role found');
        return res.status(401).json({
          success: false,
          error: { message: 'Unauthorized: No user role found' }
        });
      }

      const permission = `${resource}:${action}`;
      const hasPermission = rbacSystem.hasPermission(userRole, permission);

      if (!hasPermission) {
        logger.warn(`Authorization failed: User ${req.user.id} with role ${userRole} lacks permission ${permission}`);
        return res.status(403).json({
          success: false,
          error: { message: `Forbidden: Insufficient permissions for ${permission}` }
        });
      }

      logger.debug(`Authorization successful: User ${req.user.id} with role ${userRole} has permission ${permission}`);
      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Authorization error' }
      });
    }
  };
};

/**
 * Resource ownership middleware
 * @param {string} resourceIdParam - Parameter name for resource ID
 * @param {string} userIdField - Field name for user ID in resource
 * @returns {Function} - Express middleware
 */
const requireOwnership = (resourceIdParam = 'id', userIdField = 'userId') => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      const resourceId = req.params[resourceIdParam];

      // Admin can access all resources
      if (userRole === 'admin') {
        return next();
      }

      // Check if user owns the resource
      if (req.resource && req.resource[userIdField] === userId) {
        return next();
      }

      logger.warn(`Ownership check failed: User ${userId} does not own resource ${resourceId}`);
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden: You can only access your own resources' }
      });
    } catch (error) {
      logger.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Ownership check error' }
      });
    }
  };
};

/**
 * Admin only middleware
 * @returns {Function} - Express middleware
 */
const requireAdmin = () => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;
      
      if (userRole !== 'admin') {
        logger.warn(`Admin access denied: User ${req.user?.id} with role ${userRole} attempted admin action`);
        return res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Admin access required' }
        });
      }

      next();
    } catch (error) {
      logger.error('Admin check error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Admin check error' }
      });
    }
  };
};

/**
 * Role-based middleware factory
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} - Express middleware
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;
      
      if (!allowedRoles.includes(userRole)) {
        logger.warn(`Role access denied: User ${req.user?.id} with role ${userRole} not in allowed roles: ${allowedRoles.join(', ')}`);
        return res.status(403).json({
          success: false,
          error: { message: `Forbidden: Required roles: ${allowedRoles.join(', ')}` }
        });
      }

      next();
    } catch (error) {
      logger.error('Role check error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Role check error' }
      });
    }
  };
};

module.exports = {
  rbacSystem,
  authorize,
  requireOwnership,
  requireAdmin,
  requireRole
};
