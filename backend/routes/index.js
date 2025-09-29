// routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./auth_routes');

// your action routes
router.use('/auth', authRoutes);

module.exports = router;
