// routes/admin.js
const express = require("express");
const router = express.Router();
const auth = require("../middleweres/authMiddleware");
const adminCtrl = require("../controllers/historrycontroller"); // your controllers/historrycontroller.js

// protect admin routes
router.use(auth.verifyToken, auth.requireRole("admin"));

// GET /api/admin/datasets?page=1&pageSize=50
router.get("/datasets", adminCtrl.adminListAllDatasets);

// GET /api/admin/datasets/:id
router.get("/datasets/:id", adminCtrl.adminGetDataset);

// POST /api/admin/datasets
router.post("/datasets", adminCtrl.adminCreateDataset);

// DELETE /api/admin/datasets/:id
router.delete("/datasets/:id", adminCtrl.adminDeleteDataset);

// POST reassign
router.post("/datasets/:id/reassign", adminCtrl.adminReassignDataset);

// GET /api/admin/charts
router.get("/charts", adminCtrl.adminListAllCharts);

// GET /api/admin/charts/:chartId
router.get("/charts/:chartId", adminCtrl.adminGetChart);

// DELETE /api/admin/charts/:chartId
router.delete("/charts/:chartId", adminCtrl.adminDeleteChart);

// download dataset file
router.get("/datasets/:id/download", adminCtrl.adminDownloadDatasetFile);

// other admin endpoints can be added here

module.exports = router;
