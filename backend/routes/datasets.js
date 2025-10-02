// routes/datasets.js
const express = require("express");
const { findDatasetById } = require("../models/datasetmodel");

const router = express.Router();

router.get("/:id/meta", async (req, res) => {
  try {
    const d = await findDatasetById(req.params.id);
    if (!d) return res.status(404).json({ error: "not found" });
    return res.json({
      datasetId: d.datasetId,
      sheets: d.sheets,
      columns: d.columnsBySheet,
      preview: d.preview,
      filename: d.originalFilename,
      createdAt: d.createdAt,
      filePath: d.filePath,
      charts: d.charts || [],
    });
  } catch (err) {
    console.error("datasets meta failed:", err);
    return res.status(500).json({ error: "datasets meta failed", details: err.message });
  }
});

module.exports = router;
