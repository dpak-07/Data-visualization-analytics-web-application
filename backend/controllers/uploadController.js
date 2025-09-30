// controllers/uploadController.js
const fs = require("fs");
const xlsx = require("xlsx");
const { v4: uuid } = require("uuid");
const { getDb } = require("../config/db");

// ---- helpers ----
const CACHE = new Map(); // key: filePath -> { mtimeMs, wb }

function loadWorkbook(filePath) {
  const stat = fs.statSync(filePath);
  const cached = CACHE.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.wb;
  const buf = fs.readFileSync(filePath);
  const wb = xlsx.read(buf, { type: "buffer", cellDates: true });
  CACHE.set(filePath, { mtimeMs: stat.mtimeMs, wb });
  return wb;
}

function normalizeValue(v) {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const n = Number(v);
  if (!Number.isNaN(n) && v !== "" && typeof v !== "boolean") return n;
  const d = new Date(v);
  if (!isNaN(d.getTime()) && /[-/T]/.test(String(v))) return d;
  return String(v);
}

function getNormalizedRows(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: null, raw: true });
  return rows.map(r => {
    const o = {};
    for (const k of Object.keys(r)) o[k] = normalizeValue(r[k]);
    return o;
  });
}

function passFilters(r, filters) {
  if (!filters) return true;
  for (const [k, rule] of Object.entries(filters)) {
    const v = r[k];
    if (rule?.eq != null && v !== rule.eq) return false;
    if (rule?.in && Array.isArray(rule.in) && !rule.in.includes(v)) return false;
    if (rule?.range && Array.isArray(rule.range)) {
      const [min, max] = rule.range;
      if (typeof v === "number") {
        if (min != null && v < min) return false;
        if (max != null && v > max) return false;
      } else if (v instanceof Date) {
        if (min != null && v < new Date(min)) return false;
        if (max != null && v > new Date(max)) return false;
      }
    }
  }
  return true;
}

function groupByKey(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const k = r[key] ?? null;
    const kk = k instanceof Date ? k.getTime() : k;
    if (!map.has(kk)) map.set(kk, { raw: k, rows: [] });
    map.get(kk).rows.push(r);
  }
  return [...map.values()];
}

function aggregate(values, agg) {
  const nums = values.filter(v => typeof v === "number");
  if (agg === "count") return values.filter(v => v !== null && v !== "").length;
  if (agg === "avg") return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0;
  if (agg === "sum") return nums.reduce((a,b)=>a+b,0);
  return values[0] ?? null; // none
}

// ---- controllers ----

// Upload file (saved by multer to disk) + register metadata in Mongo
async function uploadAndRegister(req, res) {
  try {
    if (!req.file?.path) return res.status(400).json({ error: "No file uploaded" });
    const userId = req.user?.id || req.headers["x-user-id"] || "anonymous";
    const filePath = req.file.path;
    const originalFilename = req.file.originalname;
    const datasetId = uuid();

    const wb = loadWorkbook(filePath);

    const sheets = [];
    const columnsBySheet = {};
    const preview = [];

    for (const sheetName of wb.SheetNames) {
      const nrows = getNormalizedRows(wb, sheetName);
      const columns = Array.from(
        nrows.reduce((set, r) => {
          Object.keys(r).forEach(k => set.add(k));
          return set;
        }, new Set())
      );
      sheets.push({ name: sheetName, rows: nrows.length });
      columnsBySheet[sheetName] = columns;
      if (preview.length < 10) preview.push(...nrows.slice(0, Math.max(0, 10 - preview.length)));
    }

    // Insert metadata into Mongo (native driver)
    const db = getDb();
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

    return res.json({ datasetId, sheets, columns: columnsBySheet, preview, file: { filePath, originalFilename } });
  } catch (e) {
    console.error("upload/register failed:", e);
    return res.status(500).json({ error: "upload/register failed" });
  }
}

// Build chart-ready data by reading from disk every time (cached workbook)
async function buildChartData(req, res) {
  try {
    const { datasetId, sheet, xKey, yKeys, agg = "sum", groupBy = true, filters } = req.body;
    if (!datasetId || !sheet || !xKey || !yKeys?.length) {
      return res.status(400).json({ error: "datasetId, sheet, xKey, yKeys required" });
    }

    const db = getDb();
    const d = await db.collection("datasets").findOne({ datasetId });
    if (!d) return res.status(404).json({ error: "dataset not found" });

    const wb = loadWorkbook(d.filePath);
    let rows = getNormalizedRows(wb, sheet).filter(r => passFilters(r, filters));
    if (!rows.length) return res.json({ series: [], xType: "category" });

    let series, xType;
    const xSample = rows[0]?.[xKey];
    xType = xSample instanceof Date ? "date" : (typeof xSample === "number" ? "number" : "category");

    if (groupBy) {
      const groups = groupByKey(rows, xKey).sort((a, b) => {
        const A = a.raw, B = b.raw;
        if (A instanceof Date && B instanceof Date) return A - B;
        if (typeof A === "number" && typeof B === "number") return A - B;
        return String(A).localeCompare(String(B));
      });
      series = yKeys.map(name => ({ name, data: [] }));
      for (const g of groups) {
        yKeys.forEach((yk, i) => {
          const val = aggregate(g.rows.map(r => r[yk]), agg);
          series[i].data.push({ x: g.raw, y: val });
        });
      }
    } else {
      const bySeries = new Map();
      for (const r of rows) {
        for (const yk of yKeys) {
          if (!bySeries.has(yk)) bySeries.set(yk, []);
          bySeries.get(yk).push({ x: r[xKey], y: r[yk] });
        }
      }
      series = [...bySeries.entries()].map(([name, data]) => ({ name, data }));
    }

    return res.json({ series, xType });
  } catch (e) {
    console.error("chart-data failed:", e);
    return res.status(500).json({ error: "chart-data failed" });
  }
}

// User history
async function history(req, res) {
  try {
    const userId = req.user?.id || req.headers["x-user-id"] || "anonymous";
    const db = getDb();
    const items = await db.collection("datasets").find({ userId }).sort({ createdAt: -1 }).toArray();
    return res.json(items.map(d => ({
      datasetId: d.datasetId,
      filename: d.originalFilename,
      createdAt: d.createdAt,
      sheets: d.sheets,
    })));
  } catch (e) {
    console.error("history failed:", e);
    return res.status(500).json({ error: "history failed" });
  }
}

// Dataset meta for re-opening
async function meta(req, res) {
  try {
    const db = getDb();
    const d = await db.collection("datasets").findOne({ datasetId: req.params.id });
    if (!d) return res.status(404).json({ error: "not found" });
    return res.json({
      datasetId: d.datasetId,
      sheets: d.sheets,
      columns: d.columnsBySheet,
      preview: d.preview,
      filename: d.originalFilename,
      createdAt: d.createdAt,
    });
  } catch (e) {
    console.error("meta failed:", e);
    return res.status(500).json({ error: "meta failed" });
  }
}

// Download original file
async function downloadFile(req, res) {
  try {
    const db = getDb();
    const d = await db.collection("datasets").findOne({ datasetId: req.params.id });
    if (!d) return res.status(404).json({ error: "not found" });
    return res.download(d.filePath, d.originalFilename);
  } catch (e) {
    console.error("download failed:", e);
    return res.status(500).json({ error: "download failed" });
  }
}

module.exports = {
  uploadAndRegister,
  buildChartData,
  history,
  meta,
  downloadFile,
};
