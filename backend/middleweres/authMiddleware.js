// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../utils/jwt");

/**
 * Verify Bearer token and attach req.user
 */
function verifyToken(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const parts = auth.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, username, role }
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Require a specific role (e.g., "admin")
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

module.exports = { verifyToken, requireRole };
