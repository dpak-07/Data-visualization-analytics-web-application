const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/historrycontroller");
const { verifyToken, requireRole } = require("../middleweres/authMiddleware");

// user routes
router.get("/user/history", verifyToken, ctrl.getUserHistory);
router.get("/user/charts", verifyToken, ctrl.getUserCharts);
router.post("/user/charts", verifyToken, ctrl.recordChart);

// admin routes
router.get("/admin/datasets", verifyToken, requireRole("admin"), ctrl.adminListAllDatasets);
router.get("/admin/datasets/:id", verifyToken, requireRole("admin"), ctrl.adminGetDataset);
router.post("/admin/datasets", verifyToken, requireRole("admin"), ctrl.adminCreateDataset);
router.delete("/admin/datasets/:id", verifyToken, requireRole("admin"), ctrl.adminDeleteDataset);
router.delete("/admin/users/:userId/datasets", verifyToken, requireRole("admin"), ctrl.adminDeleteAllDatasetsForUser);
router.get("/admin/datasets/:id/download", verifyToken, requireRole("admin"), ctrl.adminDownloadDatasetFile);
router.post("/admin/datasets/:id/reassign", verifyToken, requireRole("admin"), ctrl.adminReassignDataset);

router.get("/admin/charts", verifyToken, requireRole("admin"), ctrl.adminListAllCharts);
router.get("/admin/charts/:chartId", verifyToken, requireRole("admin"), ctrl.adminGetChart);
router.delete("/admin/charts/:chartId", verifyToken, requireRole("admin"), ctrl.adminDeleteChart);
router.delete("/admin/users/:userId/charts", verifyToken, requireRole("admin"), ctrl.adminDeleteAllChartsForUser);

router.get("/admin/users/:userId/datasets", verifyToken, requireRole("admin"), ctrl.adminListUserDatasets);

module.exports = router;
