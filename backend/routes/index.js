// routes/index.js
const express = require("express");
const router = express.Router();

// Upload & dataset routes
const uploadRoutes = require("./upload_routes");
router.use("/datasets", uploadRoutes);

// Auth routes
const adminAuthRoutes = require("./admin_auth_routes");
const userAuthRoutes = require("./user_auth_routes");

router.use("/auth/admin", adminAuthRoutes);
router.use("/auth/user", userAuthRoutes);

// History & admin routes
const historyAdminRoutes = require("./historyroutes");
router.use("/history", historyAdminRoutes);

module.exports = router;
