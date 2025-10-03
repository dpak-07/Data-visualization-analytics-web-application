// routes/upload_helpers.js
const express = require("express");
const router = express.Router();
const { buildChartConfigController, exportChartPngController } = require("../controllers/chartRenderController");

// buildChartConfig expects JSON: { datasetId, sheet, xKey, yKeys: [...], agg, type, title }
router.post("/buildChartConfig", buildChartConfigController);

// exportChartPng expects body { chartConfig } or just the config as body; query params: width,height
router.post("/exportChartPng", exportChartPngController);

module.exports = router;
