// routes/auth_admin_routes.js
const express = require("express");
const { adminSignup, adminLogin } = require("../controllers/adminauthController");
const { verifyToken, requireRole } = require("../middleweres/authMiddleware");

const router = express.Router();
``
// Public
router.post("/signup", adminSignup);
router.post("/login", adminLogin);

// Example protected admin-only route
router.get("/profile", verifyToken, requireRole("admin"), (req, res) => {
  res.json({ message: "Hello Admin", user: req.user });
});

module.exports = router;
