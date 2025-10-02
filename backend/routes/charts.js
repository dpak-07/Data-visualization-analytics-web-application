// routes/charts.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const { insertChart } = require("../models/chartModel");
const { pushChartRefToDataset } = require("../models/datasetmodel");

const router = express.Router();

// helper to decode dataURL
function dataUrlToBuffer(dataUrl) {
  const m = String(dataUrl).match(/^data:(.+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const buf = Buffer.from(m[2], "base64");
  return { buffer: buf, mime };
}

router.post("/", async (req, res) => {
  try {
    // multer may have put a file in req.file
    const name = req.body?.name || req.body?.title || `chart_${Date.now()}`;
    const chartType = req.body?.chartType || req.body?.type || "unknown";
    const datasetId = req.body?.datasetId || req.body?.dataset || null;
    let chartPayload = null;
    if (req.body?.chartPayload) {
      try { chartPayload = JSON.parse(req.body.chartPayload); } catch { chartPayload = req.body.chartPayload; }
    } else if (req.body?.chartData) {
      try { chartPayload = JSON.parse(req.body.chartData); } catch { chartPayload = req.body.chartData; }
    } else {
      chartPayload = req.body || null;
    }

    let thumbnailPath = null;
    if (req.file && req.file.path) {
      thumbnailPath = req.file.path;
    } else if (req.body?.thumbnailDataUrl) {
      const parsed = dataUrlToBuffer(req.body.thumbnailDataUrl);
      if (!parsed) return res.status(400).json({ error: "Invalid thumbnailDataUrl" });

      const ext = (parsed.mime && parsed.mime.split("/")[1]) || "png";
      const destDir = path.join(__dirname, "..", "uploads", "gencharts", String(req.userId));
      try { fs.mkdirSync(destDir, { recursive: true }); } catch (e) {}
      const filename = `${Date.now()}_${uuid()}.${ext}`;
      const full = path.join(destDir, filename);
      fs.writeFileSync(full, parsed.buffer);
      thumbnailPath = full;
    }

    const chartId = uuid();
    const chartDoc = {
      chartId,
      userId: req.userId,
      name,
      chartType,
      datasetId,
      thumbnailPath,
      chartPayload,
      createdAt: new Date(),
    };

    await insertChart(chartDoc);

    if (datasetId) {
      await pushChartRefToDataset(datasetId, { chartId, name, chartType, thumbnailPath, createdAt: chartDoc.createdAt }).catch(() => {});
    }

    return res.json({ chartId, thumbnailPath });
  } catch (err) {
    console.error("charts POST failed:", err);
    return res.status(500).json({ error: "charts POST failed", details: err.message });
  }
});

module.exports = router;
