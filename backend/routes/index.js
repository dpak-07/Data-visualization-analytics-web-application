// routes/index.js
const express = require("express");
const router = express.Router();

// Keep filenames matching your repo (you have exel.js, datasets.js, charts.js, history.js, etc.)
router.use("/exel", require("./exel"));                // POST /api/exel
router.use("/datasets", require("./datasets"));        // GET /api/datasets/:id/meta
router.use("/charts", require("./charts"));            // POST /api/charts
router.use("/upload", require("./upload_helpers"));    // POST /api/upload/buildChartConfig, /exportChartPng
router.use("/history", require("./history"));          // GET /api/history

// Auth routes (your repo has admin_auth_routes.js and user_auth_routes.js)
router.use("/auth/admin", require("./admin_auth_routes"));
router.use("/auth/user", require("./user_auth_routes"));

// Admin management routes (uses controllers/historyAdminController.js)
router.use("/admin", require("./admin"));

module.exports = router;
