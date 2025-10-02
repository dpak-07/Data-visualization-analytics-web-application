// routes/index.js
const express = require("express");
const router = express.Router();

// Upload & dataset routes
// I expect a modular router at ./uploads/index.js (exporting router)
const uploadRoutes = require("./charts"); // <- adjust if your file name differs
router.use("/uploads", uploadRoutes);

// Auth routes
const adminAuthRoutes = require("./admin_auth_routes");
const userAuthRoutes = require("./user_auth_routes");

router.use("/auth/admin", adminAuthRoutes);
router.use("/auth/user", userAuthRoutes);

// History & admin routes
const historyAdminRoutes = require("./history");
router.use("/history", historyAdminRoutes);

module.exports = router;
