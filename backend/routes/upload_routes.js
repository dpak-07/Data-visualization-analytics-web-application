// routes/upload_routes.js
const express = require("express");
// If your folder is misspelled as 'middleweres', use that; otherwise use 'middlewares'
const { uploadDisk } = require("../middleweres/uploadMiddleware.js");
// const { uploadDisk } = require("../middlewares/uploadMiddleware.js");

const {
  uploadAndRegister,
  buildChartData,
  history,
  meta,
  downloadFile,
} = require("../controllers/uploadController.js");

// const { verifyToken } = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.post("/upload", /* verifyToken, */ uploadDisk.single("file"), uploadAndRegister);
router.post("/chart-data", /* verifyToken, */ buildChartData);
router.get("/history", /* verifyToken, */ history);
router.get("/dataset/:id/meta", /* verifyToken, */ meta);
router.get("/dataset/:id/file", /* verifyToken, */ downloadFile);

module.exports = router;
