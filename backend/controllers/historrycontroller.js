// controllers/historyAdminController.js
const fs = require("fs");
const { v4: uuid } = require("uuid");
const { getDb } = require("../config/db");

/**
 * Extended history/admin controller
 *
 * User endpoints:
 * - getUserHistory: GET /api/user/history
 * - getUserCharts:  GET /api/user/charts
 * - recordChart:    POST /api/user/charts
 *
 * Admin endpoints (protect with verifyToken + requireRole('admin')):
 * - adminListAllDatasets:         GET  /api/admin/datasets
 * - adminGetDataset:              GET  /api/admin/datasets/:id
 * - adminCreateDataset:           POST /api/admin/datasets        (admin creates metadata)
 * - adminDeleteDataset:           DELETE /api/admin/datasets/:id
 * - adminDeleteAllDatasetsForUser: DELETE /api/admin/users/:userId/datasets  (bulk delete)
 * - adminListAllCharts:           GET  /api/admin/charts
 * - adminGetChart:                GET  /api/admin/charts/:chartId
 * - adminDeleteChart:             DELETE /api/admin/charts/:chartId
 * - adminDeleteAllChartsForUser:  DELETE /api/admin/users/:userId/charts
 * - adminReassignDataset:         POST /api/admin/datasets/:id/reassign  { newUserId }
 * - adminListUserDatasets:        GET  /api/admin/users/:userId/datasets
 * - adminDownloadDatasetFile:     GET  /api/admin/datasets/:id/download
 *
 * NOTE: must call getDb() after your app has called connectDB()
 */

// ----------------- helpers -----------------
function buildPagination(query) {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(200, Number(query.pageSize || 50));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

// ----------------- User-facing -----------------

async function getUserHistory(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const datasets = await db.collection("datasets")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    const charts = await db.collection("charts")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    const chartsByDataset = {};
    for (const c of charts) {
      chartsByDataset[c.datasetId] = chartsByDataset[c.datasetId] || [];
      chartsByDataset[c.datasetId].push({
        chartId: c.chartId,
        title: c.title,
        createdAt: c.createdAt,
        configSummary: c.configSummary || null,
        downloadUrl: c.downloadUrl || null,
      });
    }

    const items = datasets.map(d => ({
      datasetId: d.datasetId,
      filename: d.originalFilename,
      createdAt: d.createdAt,
      sheets: d.sheets,
      rowsPreview: (d.preview || []).slice(0, 5),
      charts: chartsByDataset[d.datasetId] || [],
    }));

    return res.json({ items });
  } catch (e) {
    console.error("getUserHistory failed:", e);
    return res.status(500).json({ error: "getUserHistory failed" });
  }
}

async function getUserCharts(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { page, pageSize, skip } = buildPagination(req.query);
    const db = getDb();
    const filter = { userId };
    if (req.query.datasetId) filter.datasetId = req.query.datasetId;

    const total = await db.collection("charts").countDocuments(filter);
    const docs = await db.collection("charts")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    return res.json({ total, page, pageSize, charts: docs });
  } catch (e) {
    console.error("getUserCharts failed:", e);
    return res.status(500).json({ error: "getUserCharts failed" });
  }
}

async function recordChart(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { datasetId, title, chartConfig, configSummary, downloadUrl } = req.body;
    if (!datasetId || !chartConfig) return res.status(400).json({ error: "datasetId and chartConfig required" });

    const db = getDb();
    const ds = await db.collection("datasets").findOne({ datasetId });
    if (!ds) return res.status(404).json({ error: "dataset not found" });
    if (String(ds.userId) !== String(userId)) {
      return res.status(403).json({ error: "You don't own this dataset" });
    }

    const chartId = uuid();
    const doc = {
      chartId,
      userId,
      datasetId,
      title: title || `${datasetId} - chart`,
      chartConfig,
      configSummary: configSummary || null,
      downloadUrl: downloadUrl || null,
      createdAt: new Date(),
    };

    await db.collection("charts").insertOne(doc);

    return res.status(201).json({ message: "Chart recorded", chartId });
  } catch (e) {
    console.error("recordChart failed:", e);
    return res.status(500).json({ error: "recordChart failed" });
  }
}

// ----------------- Admin-facing -----------------

async function adminListAllDatasets(req, res) {
  try {
    const { page, pageSize, skip } = buildPagination(req.query);
    const db = getDb();

    const filter = {};
    if (req.query.search) {
      const q = req.query.search;
      filter.$or = [
        { originalFilename: { $regex: q, $options: "i" } },
        { datasetId: { $regex: q, $options: "i" } }
      ];
    }
    if (req.query.userId) filter.userId = req.query.userId;

    const total = await db.collection("datasets").countDocuments(filter);
    const docs = await db.collection("datasets")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    return res.json({ total, page, pageSize, datasets: docs });
  } catch (e) {
    console.error("adminListAllDatasets failed:", e);
    return res.status(500).json({ error: "adminListAllDatasets failed" });
  }
}

async function adminGetDataset(req, res) {
  try {
    const datasetId = req.params.id;
    if (!datasetId) return res.status(400).json({ error: "datasetId required" });

    const db = getDb();
    const d = await db.collection("datasets").findOne({ datasetId });
    if (!d) return res.status(404).json({ error: "not found" });

    return res.json({ dataset: d });
  } catch (e) {
    console.error("adminGetDataset failed:", e);
    return res.status(500).json({ error: "adminGetDataset failed" });
  }
}

/**
 * Admin create dataset metadata
 * POST /api/admin/datasets
 * body: { datasetId (optional), userId, originalFilename, filePath, sheets, columnsBySheet, preview }
 */
async function adminCreateDataset(req, res) {
  try {
    const body = req.body || {};
    const {
      datasetId: providedId,
      userId,
      originalFilename,
      filePath,
      sheets = [],
      columnsBySheet = {},
      preview = []
    } = body;

    if (!userId || !originalFilename || !filePath) {
      return res.status(400).json({ error: "userId, originalFilename and filePath are required" });
    }

    const datasetId = providedId || uuid();
    const db = getDb();

    const existing = await db.collection("datasets").findOne({ datasetId });
    if (existing) return res.status(400).json({ error: "datasetId already exists" });

    const doc = {
      datasetId,
      userId,
      originalFilename,
      filePath,
      sheets,
      columnsBySheet,
      preview,
      createdAt: new Date(),
    };

    await db.collection("datasets").insertOne(doc);
    return res.status(201).json({ message: "Dataset created", datasetId });
  } catch (e) {
    console.error("adminCreateDataset failed:", e);
    return res.status(500).json({ error: "adminCreateDataset failed" });
  }
}

/**
 * Admin delete single dataset (existing)
 * DELETE /api/admin/datasets/:id
 * query: unlink=true to delete file from disk
 */
async function adminDeleteDataset(req, res) {
  try {
    const datasetId = req.params.id;
    if (!datasetId) return res.status(400).json({ error: "datasetId required" });

    const db = getDb();
    const d = await db.collection("datasets").findOne({ datasetId });
    if (!d) return res.status(404).json({ error: "not found" });

    await db.collection("datasets").deleteOne({ datasetId });

    const unlink = req.query.unlink === 'true' || req.query.unlink === true;
    let fileDeleted = false;
    if (unlink && d.filePath) {
      try {
        if (fs.existsSync(d.filePath)) {
          fs.unlinkSync(d.filePath);
          fileDeleted = true;
        }
      } catch (er) {
        console.error("file deletion error:", er);
      }
    }

    await db.collection("charts").deleteMany({ datasetId });

    return res.json({ message: "dataset deleted", datasetId, fileDeleted });
  } catch (e) {
    console.error("adminDeleteDataset failed:", e);
    return res.status(500).json({ error: "adminDeleteDataset failed" });
  }
}

/**
 * Admin bulk delete all datasets for a user
 * DELETE /api/admin/users/:userId/datasets
 * query: unlink=true to delete files from disk
 */
async function adminDeleteAllDatasetsForUser(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const unlink = req.query.unlink === 'true' || req.query.unlink === true;
    const db = getDb();

    const docs = await db.collection("datasets").find({ userId }).toArray();
    const datasetIds = docs.map(d => d.datasetId);

    // delete DB docs
    const result = await db.collection("datasets").deleteMany({ userId });

    // delete files if requested
    let deletedFiles = 0;
    if (unlink) {
      for (const d of docs) {
        try {
          if (d.filePath && fs.existsSync(d.filePath)) {
            fs.unlinkSync(d.filePath);
            deletedFiles++;
          }
        } catch (er) {
          console.error("file deletion error for", d.filePath, er);
        }
      }
    }

    // remove charts for those datasets and also any charts owned by user
    await db.collection("charts").deleteMany({ $or: [{ userId }, { datasetId: { $in: datasetIds } }] });

    return res.json({ message: "deleted datasets for user", userId, deletedCount: result.deletedCount, deletedFiles });
  } catch (e) {
    console.error("adminDeleteAllDatasetsForUser failed:", e);
    return res.status(500).json({ error: "adminDeleteAllDatasetsForUser failed" });
  }
}

/**
 * Admin bulk delete all charts for a user
 * DELETE /api/admin/users/:userId/charts
 */
async function adminDeleteAllChartsForUser(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const db = getDb();
    const result = await db.collection("charts").deleteMany({ userId });

    return res.json({ message: "deleted charts for user", userId, deletedCount: result.deletedCount });
  } catch (e) {
    console.error("adminDeleteAllChartsForUser failed:", e);
    return res.status(500).json({ error: "adminDeleteAllChartsForUser failed" });
  }
}

/**
 * GET /api/admin/charts
 * List all charts (admin)
 */
async function adminListAllCharts(req, res) {
  try {
    const { page, pageSize, skip } = buildPagination(req.query);
    const db = getDb();

    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.datasetId) filter.datasetId = req.query.datasetId;
    if (req.query.search) {
      const q = req.query.search;
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { chartId: { $regex: q, $options: "i" } },
        { "configSummary": { $regex: q, $options: "i" } }
      ];
    }

    const total = await db.collection("charts").countDocuments(filter);
    const docs = await db.collection("charts")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    return res.json({ total, page, pageSize, charts: docs });
  } catch (e) {
    console.error("adminListAllCharts failed:", e);
    return res.status(500).json({ error: "adminListAllCharts failed" });
  }
}

/**
 * GET /api/admin/charts/:chartId
 */
async function adminGetChart(req, res) {
  try {
    const { chartId } = req.params;
    if (!chartId) return res.status(400).json({ error: "chartId required" });

    const db = getDb();
    const chart = await db.collection("charts").findOne({ chartId });
    if (!chart) return res.status(404).json({ error: "chart not found" });

    return res.json({ chart });
  } catch (e) {
    console.error("adminGetChart failed:", e);
    return res.status(500).json({ error: "adminGetChart failed" });
  }
}

/**
 * DELETE /api/admin/charts/:chartId
 */
async function adminDeleteChart(req, res) {
  try {
    const { chartId } = req.params;
    if (!chartId) return res.status(400).json({ error: "chartId required" });

    const db = getDb();
    const chart = await db.collection("charts").findOne({ chartId });
    if (!chart) return res.status(404).json({ error: "chart not found" });

    await db.collection("charts").deleteOne({ chartId });

    return res.json({ message: "chart deleted", chartId });
  } catch (e) {
    console.error("adminDeleteChart failed:", e);
    return res.status(500).json({ error: "adminDeleteChart failed" });
  }
}

/**
 * Admin reassign dataset ownership
 * POST /api/admin/datasets/:id/reassign
 * body: { newUserId }
 */
async function adminReassignDataset(req, res) {
  try {
    const datasetId = req.params.id;
    const { newUserId } = req.body;
    if (!datasetId || !newUserId) return res.status(400).json({ error: "datasetId and newUserId required" });

    const db = getDb();
    const d = await db.collection("datasets").findOne({ datasetId });
    if (!d) return res.status(404).json({ error: "dataset not found" });

    await db.collection("datasets").updateOne({ datasetId }, { $set: { userId: newUserId } });

    // Optionally keep an audit log (not implemented here)
    return res.json({ message: "reassigned dataset", datasetId, newUserId });
  } catch (e) {
    console.error("adminReassignDataset failed:", e);
    return res.status(500).json({ error: "adminReassignDataset failed" });
  }
}

/**
 * List datasets for user (admin)
 */
async function adminListUserDatasets(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const { page, pageSize, skip } = buildPagination(req.query);
    const db = getDb();

    const filter = { userId };
    const total = await db.collection("datasets").countDocuments(filter);
    const docs = await db.collection("datasets")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    return res.json({ total, page, pageSize, datasets: docs });
  } catch (e) {
    console.error("adminListUserDatasets failed:", e);
    return res.status(500).json({ error: "adminListUserDatasets failed" });
  }
}

/**
 * Admin download dataset file
 * GET /api/admin/datasets/:id/download
 */
async function adminDownloadDatasetFile(req, res) {
  try {
    const datasetId = req.params.id;
    if (!datasetId) return res.status(400).json({ error: "datasetId required" });

    const db = getDb();
    const d = await db.collection("datasets").findOne({ datasetId });
    if (!d) return res.status(404).json({ error: "not found" });

    if (!d.filePath || !fs.existsSync(d.filePath)) {
      return res.status(404).json({ error: "file not found on disk" });
    }

    return res.download(d.filePath, d.originalFilename);
  } catch (e) {
    console.error("adminDownloadDatasetFile failed:", e);
    return res.status(500).json({ error: "adminDownloadDatasetFile failed" });
  }
}

// ----------------- exports -----------------
module.exports = {
  // user
  getUserHistory,
  getUserCharts,
  recordChart,
  // admin
  adminListAllDatasets,
  adminGetDataset,
  adminCreateDataset,
  adminDeleteDataset,
  adminDeleteAllDatasetsForUser,
  adminListAllCharts,
  adminGetChart,
  adminDeleteChart,
  adminDeleteAllChartsForUser,
  adminReassignDataset,
  adminListUserDatasets,
  adminDownloadDatasetFile,
};
