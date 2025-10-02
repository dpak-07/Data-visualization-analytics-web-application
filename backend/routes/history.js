// routes/history.js
const express = require("express");
const { listDatasetsForUser } = require("../models/datasetmodel");
const { listChartsForUser } = require("../models/chartModel");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    const datasets = await listDatasetsForUser(userId, { datasetId: 1, originalFilename: 1, createdAt: 1, sheets: 1 });
    const charts = await listChartsForUser(userId, { chartId: 1, name: 1, chartType: 1, datasetId: 1, thumbnailPath: 1, createdAt: 1 });
    return res.json({ datasets, charts });
  } catch (err) {
    console.error("history GET failed:", err);
    return res.status(500).json({ error: "history GET failed", details: err.message });
  }
});

module.exports = router;
// routes/exel.js