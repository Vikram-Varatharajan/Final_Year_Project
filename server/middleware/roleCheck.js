// server/middleware/roleCheck.js
module.exports = (requiredRole) => {
  return (req, res, next) => {
    // Check if user exists and has the required role
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};