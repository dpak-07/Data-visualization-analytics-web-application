// controllers/chartRenderController.js
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const { getDb } = require("../config/db");

// Helper to aggregate rows by xKey and produce labels + datasets
function aggregateRows(rows, xKey, yKeys = [], agg = "sum") {
  const map = new Map();
  for (const r of rows) {
    const rawX = r[xKey];
    const x = (rawX === null || rawX === undefined) ? "__null" : String(rawX);
    if (!map.has(x)) {
      map.set(x, { __count: 0, __sums: {} });
      for (const k of yKeys) map.get(x).__sums[k] = 0;
    }
    const entry = map.get(x);
    entry.__count++;
    for (const k of yKeys) {
      const v = Number(r[k]);
      if (!Number.isNaN(v)) entry.__sums[k] += v;
    }
  }

  const labels = Array.from(map.keys());
  const datasets = yKeys.map(k => ({ label: k, data: [] }));

  for (const key of labels) {
    const val = map.get(key);
    for (let i = 0; i < yKeys.length; i++) {
      const k = yKeys[i];
      let out = val.__sums[k];
      if (agg === "avg") out = val.__sums[k] / val.__count;
      if (agg === "count") out = val.__count;
      datasets[i].data.push(out);
    }
  }

  return { labels, datasets };
}

async function buildChartConfigController(req, res) {
  try {
    const { datasetId, sheet, xKey, yKeys = [], agg = "sum", type = "line", title } = req.body || {};
    if (!datasetId || !xKey || !Array.isArray(yKeys) || yKeys.length === 0) {
      return res.status(400).json({ error: "datasetId, xKey and yKeys (array) are required" });
    }

    const db = getDb();
    const ds = await db.collection("datasets").findOne({ datasetId });
    if (!ds) return res.status(404).json({ error: "dataset not found" });

    // For now use stored preview if full parsing isn't implemented.
    const rows = (ds.preview && ds.preview.length) ? ds.preview : [];
    if (!rows.length) {
      // If preview is empty, try to load from filePath (if present) - quick attempt using xlsx
      if (ds.filePath) {
        try {
          const xlsx = require("xlsx");
          const fs = require("fs");
          if (fs.existsSync(ds.filePath)) {
            const buf = fs.readFileSync(ds.filePath);
            const wb = xlsx.read(buf, { type: "buffer", cellDates: true });
            const sheetName = sheet || wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            const parsedRows = xlsx.utils.sheet_to_json(ws, { defval: null, raw: true });
            // convert Dates to ISO strings to be consistent
            const normalized = parsedRows.map(r => {
              const out = {};
              for (const k of Object.keys(r)) {
                const v = r[k];
                if (v instanceof Date) out[k] = v.toISOString();
                else out[k] = v;
              }
              return out;
            });
            // proceed with normalized rows
            const { labels, datasets } = aggregateRows(normalized, xKey, yKeys, agg);
            const colors = ["#ef4444","#10b981","#3b82f6","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316"];
            const chartDatasets = datasets.map((d, i) => ({
              label: d.label,
              data: d.data,
              backgroundColor: colors[i % colors.length],
              borderColor: colors[i % colors.length],
              fill: false,
            }));
            const config = {
              type,
              data: { labels, datasets: chartDatasets },
              options: {
                plugins: { title: { display: !!title, text: title || `${sheet || "sheet"} - ${yKeys.join(",")}` } },
                scales: { x: { title: { display: true, text: xKey } }, y: { title: { display: true, text: yKeys.join(", ") } } }
              }
            };
            return res.json({ config });
          }
        } catch (e) {
          console.warn("Failed to parse filePath for dataset:", e.message);
        }
      }
      return res.status(422).json({ error: "No rows available for dataset (preview empty). Upload and parse first." });
    }

    const { labels, datasets } = aggregateRows(rows, xKey, yKeys, agg);
    const colors = ["#ef4444","#10b981","#3b82f6","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316"];
    const chartDatasets = datasets.map((d, i) => ({
      label: d.label,
      data: d.data,
      backgroundColor: colors[i % colors.length],
      borderColor: colors[i % colors.length],
      fill: false,
    }));

    const config = {
      type,
      data: { labels, datasets: chartDatasets },
      options: {
        plugins: { title: { display: !!title, text: title || `${sheet || "sheet"} - ${yKeys.join(",")}` } },
        scales: { x: { title: { display: true, text: xKey } }, y: { title: { display: true, text: yKeys.join(", ") } } }
      }
    };

    return res.json({ config });
  } catch (e) {
    console.error("buildChartConfigController failed:", e);
    return res.status(500).json({ error: "buildChartConfig failed", details: e.message });
  }
}

async function exportChartPngController(req, res) {
  try {
    const chartConfig = req.body.chartConfig || req.body;
    if (!chartConfig) return res.status(400).json({ error: "chartConfig required in request body" });

    const width = Math.min(2500, Number(req.query.width) || 1200);
    const height = Math.min(2500, Number(req.query.height) || 800);

    const renderer = new ChartJSNodeCanvas({ width, height, chartCallback: (ChartJS) => {
      // you may register additional plugins if needed
    }});

    const buffer = await renderer.renderToBuffer(chartConfig);
    res.set("Content-Type", "image/png");
    return res.send(buffer);
  } catch (e) {
    console.error("exportChartPngController failed:", e);
    return res.status(500).json({ error: "exportChartPng failed", details: e.message });
  }
}

module.exports = { buildChartConfigController, exportChartPngController };
