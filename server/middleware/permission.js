/**
 * Middleware to check for user permissions based on module and access level.
 * @param {string} module - The module to check (e.g., 'bookings', 'cars').
 * @param {string} requiredAccess - The minimum required access level ('read', 'write', 'full').
 */
export const checkPermission = (module, requiredAccess) => {
  return (req, res, next) => {
    const user = req.user;

    // Admin has universal access
    if (user.role === 'admin') {
      return next();
    }

    // Only employees have granular permissions
    if (user.role !== 'employee') {
        return res.status(403).json({ success: false, message: 'Access Denied.' });
    }

    // Find if the employee has any permission for the required module
    const permission = user.permissions?.find(p => p.module === module);

    if (!permission) {
      return res.status(403).json({ success: false, message: 'Access Denied: You do not have permission for this module.' });
    }

    // Define access levels
    const accessLevels = { 'read': 1, 'write': 2, 'full': 3 };

    // Check if the user's access level is sufficient
    if (accessLevels[permission.access] >= accessLevels[requiredAccess]) {
      return next(); // Permission granted
    }

    return res.status(403).json({ success: false, message: 'Insufficient permissions for this action.' });
  };
};