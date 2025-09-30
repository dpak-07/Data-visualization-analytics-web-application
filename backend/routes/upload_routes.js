// routes/upload_routes.js (CommonJS)
const express = require("express");
const { uploadDisk } = require("../middleweres/uploadMiddleware.js");
const {
  uploadAndRegister,
  buildChartData,
  history,
  meta,
  downloadFile,
} = require("../controllers/uploadController.js");

// const { verifyToken, requireRole } = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.post("/upload", /* verifyToken, */ uploadDisk.single("file"), uploadAndRegister);
router.post("/chart-data", /* verifyToken, */ buildChartData);
router.get("/history", /* verifyToken, */ history);
router.get("/dataset/:id/meta", /* verifyToken, */ meta);
router.get("/dataset/:id/file", /* verifyToken, */ downloadFile);

module.exports = router;
