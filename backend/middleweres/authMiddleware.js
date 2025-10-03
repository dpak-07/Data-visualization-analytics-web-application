// middleweres/authMiddleware.js
// Lightweight dev auth middleware. Replace with real JWT/session logic in production.

module.exports = {
  verifyToken: (req, res, next) => {
    // For development convenience accept x-user-id header
    const headerId = req.headers["x-user-id"] || req.headers["x-userid"];
    const role = req.headers["x-user-role"] || req.headers["x-role"] || "user";

    if (headerId) {
      req.user = { id: String(headerId), role };
      req.userId = String(headerId);
    } else {
      // no user header — leave as anonymous user (null)
      req.user = null;
      req.userId = null;
    }
    next();
  },

  requireRole: (role) => {
    return (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (req.user.role !== role) return res.status(403).json({ error: "Forbidden - require role " + role });
      next();
    };
  }
};
