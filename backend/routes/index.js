// routes/index.js
const express = require('express');
const router = express.Router();
const uploadRoutes = require('./upload_routes');

// your upload routes
router.use('/', uploadRoutes);
const adminAuthRoutes = require("./admin_auth_routes");
const userAuthRoutes = require("./user_auth_routes");

// your action routes
router.use('/auth/admin', adminAuthRoutes);
router.use('/auth/user', userAuthRoutes);

module.exports = router;
