// controllers/uploadController.js
const fs = require("fs");
const xlsx = require("xlsx");
const { v4: uuid } = require("uuid");
const { getDb } = require("../config/db");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

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

// ---------- factor out chart-data logic (reusable) ----------
async function getChartData({ datasetId, sheet, xKey, yKeys, agg = "sum", groupBy = true, filters = null }) {
  if (!datasetId || !sheet || !xKey || !yKeys?.length) {
    throw { status: 400, message: "datasetId, sheet, xKey, yKeys required" };
  }

  const db = getDb();
  const d = await db.collection("datasets").findOne({ datasetId });
  if (!d) throw { status: 404, message: "dataset not found" };

  const wb = loadWorkbook(d.filePath);
  let rows = getNormalizedRows(wb, sheet).filter(r => passFilters(r, filters));
  if (!rows.length) return { series: [], xType: "category" };

  const xSample = rows[0]?.[xKey];
  const xType = xSample instanceof Date ? "date" : (typeof xSample === "number" ? "number" : "category");

  let series;
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
        // Convert Date objects to ISO strings for JSON transport
        const xVal = g.raw instanceof Date ? g.raw.toISOString() : g.raw;
        series[i].data.push({ x: xVal, y: val });
      });
    }
  } else {
    const bySeries = new Map();
    for (const r of rows) {
      for (const yk of yKeys) {
        if (!bySeries.has(yk)) bySeries.set(yk, []);
        const xVal = r[xKey] instanceof Date ? r[xKey].toISOString() : r[xKey];
        bySeries.get(yk).push({ x: xVal, y: r[yk] });
      }
    }
    series = [...bySeries.entries()].map(([name, data]) => ({ name, data }));
  }

  return { series, xType };
}

// ---------- server-side Chart.js config generator ----------
function createChartJsConfig(series = [], xType = "category", opts = {}) {
  // opts: { title, stacked, showPoints, xLabel, yLabel, timeUnit, beginAtZero, pointRadius, tension }
  const {
    title = "",
    stacked = false,
    showPoints = true,
    xLabel = "",
    yLabel = "",
    timeUnit = "day",
    beginAtZero = true,
    pointRadius = 3,
    tension = 0.2,
  } = opts;

  // simple deterministic palette
  const palette = [
    [31,119,180],[255,127,14],[44,160,44],[214,39,40],
    [148,103,189],[140,86,75],[227,119,194],[127,127,127],
    [188,189,34],[23,190,207]
  ];
  const getColor = (i, a = 1) => {
    const c = palette[i % palette.length];
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  };

  const datasets = (series || []).map((s, idx) => ({
    label: s.name ?? `Series ${idx + 1}`,
    data: (s.data || []).map(pt => ({ x: pt.x, y: pt.y })),
    fill: false,
    tension,
    pointRadius: showPoints ? pointRadius : 0,
    borderWidth: 2,
    borderColor: getColor(idx, 1),
    backgroundColor: getColor(idx, 0.15),
    spanGaps: true,
  }));

  const xAxis = (xType === 'date') ? {
    type: 'time',
    time: {
      unit: timeUnit,
      tooltipFormat: 'yyyy-MM-dd',
      displayFormats: { day: 'yyyy-MM-dd', month: 'yyyy-MM', year: 'yyyy' }
    },
    title: { display: !!xLabel, text: xLabel }
  } : (xType === 'number') ? {
    type: 'linear',
    title: { display: !!xLabel, text: xLabel }
  } : {
    type: 'category',
    title: { display: !!xLabel, text: xLabel }
  };

  const config = {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      stacked,
      plugins: {
        title: { display: !!title, text: title },
        legend: { display: true, position: 'top' },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: xAxis,
        y: {
          beginAtZero,
          title: { display: !!yLabel, text: yLabel },
          ticks: { autoSkip: true, maxTicksLimit: 12 }
        }
      }
    }
  };

  return config;
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

    // Normalize yKeys if it arrives as comma string
    const ykArray = Array.isArray(yKeys) ? yKeys : (typeof yKeys === 'string' ? yKeys.split(',').map(s=>s.trim()).filter(Boolean) : []);

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
      series = ykArray.map(name => ({ name, data: [] }));
      for (const g of groups) {
        ykArray.forEach((yk, i) => {
          const val = aggregate(g.rows.map(r => r[yk]), agg);
          const xVal = g.raw instanceof Date ? g.raw.toISOString() : g.raw;
          series[i].data.push({ x: xVal, y: val });
        });
      }
    } else {
      const bySeries = new Map();
      for (const r of rows) {
        for (const yk of ykArray) {
          if (!bySeries.has(yk)) bySeries.set(yk, []);
          const xVal = r[xKey] instanceof Date ? r[xKey].toISOString() : r[xKey];
          bySeries.get(yk).push({ x: xVal, y: r[yk] });
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

// New: Return columns for a sheet (names only)
async function getSheetColumns(req, res) {
  try {
    const { datasetId, sheet } = req.query;
    if (!datasetId || !sheet) return res.status(400).json({ error: "datasetId and sheet required" });

    const db = getDb();
    const d = await db.collection("datasets").findOne({ datasetId });
    if (!d) return res.status(404).json({ error: "dataset not found" });

    const wb = loadWorkbook(d.filePath);
    if (!wb.SheetNames.includes(sheet)) return res.status(404).json({ error: "sheet not found" });

    const rows = getNormalizedRows(wb, sheet);
    const columns = Array.from(
      rows.reduce((set, r) => {
        Object.keys(r).forEach(k => set.add(k));
        return set;
      }, new Set())
    );

    return res.json({ columns, rowsCount: rows.length });
  } catch (e) {
    console.error("getSheetColumns failed:", e);
    return res.status(500).json({ error: "getSheetColumns failed" });
  }
}

// New: Return rows with pagination and filters (JSON)
async function getRows(req, res) {
  try {
    const { datasetId, sheet } = req.query;
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(1000, Number(req.query.pageSize || 100));
    const filters = req.body?.filters ?? (req.query.filters ? JSON.parse(req.query.filters) : null);

    if (!datasetId || !sheet) return res.status(400).json({ error: "datasetId and sheet required" });

    const db = getDb();
    const d = await db.collection("datasets").findOne({ datasetId });
    if (!d) return res.status(404).json({ error: "dataset not found" });

    const wb = loadWorkbook(d.filePath);
    if (!wb.SheetNames.includes(sheet)) return res.status(404).json({ error: "sheet not found" });

    let rows = getNormalizedRows(wb, sheet).filter(r => passFilters(r, filters));
    const total = rows.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageRows = rows.slice(start, end);

    return res.json({ total, page, pageSize, rows: pageRows });
  } catch (e) {
    console.error("getRows failed:", e);
    return res.status(500).json({ error: "getRows failed" });
  }
}

// New: Download filtered rows as CSV
async function downloadFilteredCsv(req, res) {
  try {
    const { datasetId, sheet } = req.query;
    const filters = req.body?.filters ?? (req.query.filters ? JSON.parse(req.query.filters) : null);
    if (!datasetId || !sheet) return res.status(400).json({ error: "datasetId and sheet required" });

    const db = getDb();
    const d = await db.collection("datasets").findOne({ datasetId });
    if (!d) return res.status(404).json({ error: "dataset not found" });

    const wb = loadWorkbook(d.filePath);
    if (!wb.SheetNames.includes(sheet)) return res.status(404).json({ error: "sheet not found" });

    const rows = getNormalizedRows(wb, sheet).filter(r => passFilters(r, filters));
    if (!rows.length) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${d.originalFilename}-${sheet}.csv"`);
      return res.send('');
    }

    // Build CSV
    const columns = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach(k=>s.add(k)); return s; }, new Set()));
    const header = columns.join(',') + '\n';
    const csvRows = rows.map(r =>
      columns.map(c => {
        const v = r[c];
        if (v == null) return '';
        if (v instanceof Date) return `"${v.toISOString()}"`;
        const s = String(v).replace(/"/g, '""');
        return /[,"\n]/.test(s) ? `"${s}"` : s;
      }).join(',')
    ).join('\n');

    const filename = `${d.originalFilename.replace(/\.[^/.]+$/, '')}-${sheet}.csv`;
    // prepend BOM so Excel opens UTF-8 correctly
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send('\uFEFF' + header + csvRows);
  } catch (e) {
    console.error("downloadFilteredCsv failed:", e);
    return res.status(500).json({ error: "downloadFilteredCsv failed" });
  }
}

// New: Export chart PNG server-side using chartjs-node-canvas
// Expects a Chart.js config in req.body.chartConfig (or call buildChartConfig + send config)
async function exportChartPng(req, res) {
  try {
    const { width = 800, height = 600 } = req.query;
    const chartConfig = req.body?.chartConfig;
    if (!chartConfig) return res.status(400).json({ error: "chartConfig required in body" });

    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: Number(width), height: Number(height) });
    const buffer = await chartJSNodeCanvas.renderToBuffer(chartConfig);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename=chart.png');
    return res.send(buffer);
  } catch (e) {
    console.error("exportChartPng failed:", e);
    return res.status(500).json({ error: "exportChartPng failed" });
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

// New: Build Chart.js config server-side and return it (ready-to-render)
async function buildChartConfig(req, res) {
  try {
    // Accept parameters via body (POST) or query (GET)
    const body = req.method === 'GET' ? req.query : req.body;
    const {
      datasetId, sheet, xKey, yKeys, agg = "sum", groupBy = true, filters,
      title, xLabel, yLabel, timeUnit, beginAtZero, showPoints
    } = body;

    // yKeys might be string "col1,col2" if passed via query; normalize to array
    const ykArray = Array.isArray(yKeys) ? yKeys : (typeof yKeys === 'string' ? yKeys.split(',').map(s => s.trim()).filter(Boolean) : []);

    // parse filters if sent as JSON string in query
    const parsedFilters = (typeof filters === 'string') ? JSON.parse(filters) : filters;

    const { series, xType } = await getChartData({
      datasetId,
      sheet,
      xKey,
      yKeys: ykArray,
      agg,
      groupBy: groupBy === 'false' || groupBy === false ? false : true,
      filters: parsedFilters
    });

    // Build Chart.js config
    const config = createChartJsConfig(series, xType, {
      title: title || `${sheet} — ${ykArray.join(',')}`,
      xLabel: xLabel || xKey,
      yLabel: yLabel || '',
      timeUnit: timeUnit || 'day',
      beginAtZero: beginAtZero === undefined ? true : (beginAtZero === 'false' ? false : !!beginAtZero),
      showPoints: showPoints === undefined ? true : (showPoints === 'false' ? false : !!showPoints),
    });

    // Return config JSON (front-end can use this directly)
    return res.json({ config });
  } catch (err) {
    console.error("buildChartConfig failed:", err);
    if (err?.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "buildChartConfig failed" });
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
  buildChartConfig,
  getSheetColumns,
  getRows,
  downloadFilteredCsv,
  exportChartPng,
  history,
  meta,
  downloadFile,
};
