// routes/upload_routes.js
const express = require("express");
const router = express.Router();

// If your folder is named "middlewares", correct import:
// const { uploadDisk } = require("../middlewares/uploadMiddleware.js");
const { uploadDisk } = require("../middleweres/uploadMiddleware.js"); 

// Controllers
const {
  uploadAndRegister,
  buildChartData,
  buildChartConfig,
  getSheetColumns,
  getRows,
  downloadFilteredCsv,
  exportChartPng,
  history,
  meta,
  downloadFile,
} = require("../controllers/uploadController.js");

const { verifyToken } = require("../middlewares/authMiddleware.js");

// -------------------- Dataset routes --------------------

// Upload Excel and register metadata
router.post("/upload", verifyToken, uploadDisk.single("file"), uploadAndRegister);

// Chart data (raw series only)
router.post("/chart-data", verifyToken, buildChartData);

// Chart.js config (ready-to-render)
router.post("/chart-config", verifyToken, buildChartConfig);

// Export chart to PNG (server-side render)
router.post("/chart-export", verifyToken, exportChartPng);

// Get sheet columns
router.get("/columns", verifyToken, getSheetColumns);

// Get rows with pagination & filters
router.get("/rows", verifyToken, getRows);

// Download filtered CSV
router.get("/download-csv", verifyToken, downloadFilteredCsv);

// User history
router.get("/history", verifyToken, history);

// Dataset meta
router.get("/:id/meta", verifyToken, meta);

// Download original file
router.get("/:id/file", verifyToken, downloadFile);

module.exports = router;
