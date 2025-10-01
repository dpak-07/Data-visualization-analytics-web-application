// UserDashboardWithHistoryFullView.jsx
// Requires: chart.js (v3+), react-chartjs-2, xlsx, framer-motion, tailwindcss
// Render: <UserDashboardWithHistoryFullView currentUser={{ name, email }} />

import React, { useState, useRef, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler,
  TimeScale,
} from "chart.js";
import { Line, Bar, Pie, Scatter } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler,
  TimeScale
);

const STORAGE_KEY = "exel_analysis_chart_history_v_chartjs_v3";
const CHART_COLORS = ["#7c3aed", "#06b6d4", "#ffd86b", "#f97316", "#60a5fa", "#34d399"];

/* ---------------------------- API CONFIG ---------------------------- */
// Adjust base path if your server mounts routes elsewhere
const API_BASE = "/api/datasets";

function getAuthHeaders() {
  // Example: token in localStorage. Replace with your auth approach.
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function uploadFileToServer(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload failed: ${txt || res.statusText}`);
  }
  return res.json(); // expected { datasetId, sheets, columns, preview, file }
}

async function fetchSheetColumnsFromServer(datasetId, sheet) {
  const q = new URLSearchParams({ datasetId, sheet }).toString();
  const res = await fetch(`${API_BASE}/columns?${q}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch sheet columns");
  return res.json(); // { columns, rowsCount }
}

async function requestChartConfigFromServer(payload) {
  const res = await fetch(`${API_BASE}/chart-config`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Chart config failed: ${txt || res.statusText}`);
  }
  return res.json(); // { config }
}

async function fetchHistoryFromServer() {
  const res = await fetch(`${API_BASE}/history`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

async function exportChartServerSide(config, width = 1200, height = 800) {
  const res = await fetch(`${API_BASE}/chart-export?width=${width}&height=${height}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ chartConfig: config }),
  });
  if (!res.ok) throw new Error("Server export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chart.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------- small helpers ---------------------------- */

function looksLikeIsoDate(s) {
  if (typeof s !== "string") return false;
  return /^\d{4}-\d{2}(-\d{2}(T.*)?)?$/.test(s);
}

function canvasToPngDataUrl(srcCanvas, scale = 2) {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const dest = document.createElement("canvas");
  dest.width = w * scale;
  dest.height = h * scale;
  const ctx = dest.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, dest.width, dest.height);
  ctx.drawImage(srcCanvas, 0, 0, dest.width, dest.height);
  return dest.toDataURL("image/png");
}

function pngDataUrlToSvgDataUrl(pngDataUrl, width = 1200, height = 800) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><image href="${pngDataUrl}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* ------------------------- Component ---------------------------- */

export default function UserDashboardWithHistoryFullView({
  currentUser = { name: "Jane Doe", email: "jane@example.com" },
}) {
  // file + workbook
  const [fileName, setFileName] = useState(null);
  const [datasetId, setDatasetId] = useState(null); // server dataset id (if uploaded)
  const [sheets, setSheets] = useState([]);
  const [sheetData, setSheetData] = useState({}); // { sheetName: { headers:[], rows:[] } }
  const [selectedSheet, setSelectedSheet] = useState("");
  const [selectedCols, setSelectedCols] = useState([]);
  const [rowRange, setRowRange] = useState({ from: 1, to: 1000 });

  // chart
  const [chartType, setChartType] = useState("line"); // line, bar, area, pie, scatter
  const [chartData, setChartData] = useState(null);
  const [chartReady, setChartReady] = useState(false);
  const [computedServerOptions, setComputedServerOptions] = useState(null);
  const chartRef = useRef(null); // react-chartjs ref (chart instance)
  const chartWrapperRef = useRef(null);

  // UI
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // history
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Accordion
  const [openSection, setOpenSection] = useState("file");
  const fileInputRef = useRef();

  /* ------------------------- local file parsing (fallback) ------------------------- */
  function parseWorkbookBuffer(buffer) {
    try {
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetNames = wb.SheetNames || [];
      const parsed = {};
      sheetNames.forEach((name) => {
        const ws = wb.Sheets[name];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (!json.length) {
          parsed[name] = { headers: [], rows: [], raw: [] };
          return;
        }
        const headerRow = json[0].map((h, i) => (h === "" ? `Column ${i + 1}` : String(h)));
        const rows = json.slice(1).map((r) => {
          const obj = {};
          headerRow.forEach((h, idx) => {
            obj[h] = r[idx] !== undefined ? r[idx] : "";
          });
          return obj;
        });
        parsed[name] = { headers: headerRow, rows, raw: json };
      });
      return { sheetNames, parsed };
    } catch (e) {
      console.error("parseWorkbookBuffer error", e);
      return { sheetNames: [], parsed: {} };
    }
  }

  /* ------------------------- helpers ------------------------- */
  function resetAll() {
    setFileName(null);
    setDatasetId(null);
    setSheets([]);
    setSheetData({});
    setSelectedSheet("");
    setSelectedCols([]);
    setRowRange({ from: 1, to: 1000 });
    setChartType("line");
    setChartData(null);
    setChartReady(false);
    setComputedServerOptions(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setOpenSection("file");
  }

  function resetForNewFile() {
    setSheets([]);
    setSheetData({});
    setSelectedSheet("");
    setSelectedCols([]);
    setRowRange({ from: 1, to: 1000 });
    setChartType("line");
    setChartData(null);
    setChartReady(false);
    setComputedServerOptions(null);
    setError("");
    setOpenSection("columns");
  }

  function downloadDataUrl(dataUrl, filename = "chart.png") {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function getCanvasFromChartRef() {
    const inst = chartRef.current;
    return inst?.canvas || inst?.chart?.canvas || inst?.getCanvas?.();
  }

  /* ------------------------- file handling: prefer server ------------------------- */
  async function handleFile(e) {
    resetForNewFile();
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    // Try server upload first (recommended)
    try {
      setIsPreparing(true);
      const uploadResp = await uploadFileToServer(f);
      // server: { datasetId, sheets, columns, preview, file }
      if (uploadResp?.datasetId) {
        setDatasetId(uploadResp.datasetId);
        // server might return sheets as array of {name, rows}, normalize
        const serverSheetNames = (uploadResp.sheets || []).map((s) => (typeof s === "string" ? s : s.name || s.sheetName));
        setSheets(serverSheetNames);
        if (serverSheetNames.length) {
          const first = serverSheetNames[0];
          setSelectedSheet(first);
          // fetch columns for first sheet
          try {
            const colsResp = await fetchSheetColumnsFromServer(uploadResp.datasetId, first);
            setSheetData((p) => ({ ...p, [first]: { headers: colsResp.columns || [], rows: [] } }));
            setRowRange({ from: 1, to: Math.max(1, colsResp.rowsCount || 1) });
          } catch (err) {
            console.warn("fetchSheetColumnsFromServer failed", err);
          }
        }
        setOpenSection("columns");
        setError("");
        setIsPreparing(false);
        return;
      }
    } catch (err) {
      console.warn("server upload failed, falling back to local parse:", err);
      // continue to local parse as fallback
    } finally {
      setIsPreparing(false);
    }
    // Local fallback parsing using XLSX
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const { sheetNames, parsed } = parseWorkbookBuffer(data);
          setSheets(sheetNames);
          setSheetData(parsed);
          if (sheetNames.length) {
            setSelectedSheet(sheetNames[0]);
            const totalRows = parsed[sheetNames[0]].rows.length;
            setRowRange({ from: 1, to: Math.max(1, totalRows) });
            setOpenSection("columns");
          }
          setError("");
        } catch (err) {
          console.error(err);
          setError("Failed to read file. Make sure it's a valid XLS/XLSX file.");
        }
      };
      reader.onerror = (err) => {
        console.error(err);
        setError("Failed to read file");
      };
      reader.readAsArrayBuffer(f);
    } catch (err) {
      console.error(err);
      setError("Failed to process file.");
    }
  }

  /* ------------------------- sheet/columns selection ------------------------- */
  async function handleSelectSheet(s) {
    setSelectedSheet(s);
    setSelectedCols([]);
    setChartData(null);
    setChartReady(false);
    setComputedServerOptions(null);
    setOpenSection("columns");
    // try fetch columns from server if datasetId is present
    if (datasetId) {
      try {
        const colsResp = await fetchSheetColumnsFromServer(datasetId, s);
        setSheetData((p) => ({ ...p, [s]: { headers: colsResp.columns || [], rows: [] } }));
        setRowRange({ from: 1, to: Math.max(1, colsResp.rowsCount || 1) });
      } catch (err) {
        console.warn("fetchSheetColumnsFromServer failed", err);
      }
    }
  }

  function toggleHeader(h) {
    setSelectedCols((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  }

  /* ------------------------- prepare chart ------------------------- */
  async function prepareChart() {
    setError("");
    setIsPreparing(true);
    setChartReady(false);
    setComputedServerOptions(null);
    await new Promise((r) => setTimeout(r, 120));
    const meta = sheetData[selectedSheet];
    if (!meta) {
      setError("No sheet selected");
      setIsPreparing(false);
      return;
    }
    if (!selectedCols.length) {
      setError("Select at least one column.");
      setIsPreparing(false);
      return;
    }

    // If we have datasetId (server), request server chart-config for more robust config
    if (datasetId) {
      const xKey = selectedCols[0];
      const yKeys = selectedCols.slice(1).length ? selectedCols.slice(1) : selectedCols;
      const payload = {
        datasetId,
        sheet: selectedSheet,
        xKey,
        yKeys,
        agg: "sum",
        groupBy: true,
        title: `${selectedSheet} — ${yKeys.join(",")}`,
      };
      try {
        const resp = await requestChartConfigFromServer(payload);
        // server returns { config } where config.data and config.options present
        const cfg = resp?.config || {};
        setChartData(cfg.data || {});
        setComputedServerOptions(cfg.options || null);
        setChartReady(true);
        setOpenSection("preview");
        setIsPreparing(false);
        return;
      } catch (err) {
        console.warn("requestChartConfigFromServer failed, falling back to client build:", err);
        // continue to client-side build
      }
    }

    // Client-side fallback build (existing logic)
    try {
      const rows = meta.rows.slice(Math.max(0, rowRange.from - 1), Math.min(meta.rows.length, rowRange.to));
      if (!rows.length) {
        setError("No rows in selected range.");
        setIsPreparing(false);
        return;
      }

      // PIE
      if (chartType === "pie") {
        if (selectedCols.length < 2) {
          setError("Pie requires label + value columns.");
          setIsPreparing(false);
          return;
        }
        const [labelCol, valueCol] = selectedCols;

        // More robust parsing and color mapping
        const labels = [];
        const dataVals = [];
        for (const r of rows) {
          const label = r[labelCol] === undefined || r[labelCol] === null ? "" : String(r[labelCol]);
          const rawVal = r[valueCol];
          const num = rawVal === "" || rawVal === null || rawVal === undefined ? 0 : Number(parseFloat(rawVal));
          labels.push(label);
          dataVals.push(isNaN(num) ? 0 : num);
        }

        setChartData({
          labels,
          datasets: [
            {
              label: valueCol,
              data: dataVals,
              backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
              hoverOffset: 8,
            },
          ],
        });
      }
      // SCATTER
      else if (chartType === "scatter") {
        if (selectedCols.length < 2) {
          setError("Scatter requires X & Y columns.");
          setIsPreparing(false);
          return;
        }
        const [xCol, yCol] = selectedCols;
        const pts = rows
          .map((r) => {
            const x = parseFloat(r[xCol]);
            const y = parseFloat(r[yCol]);
            return isNaN(x) || isNaN(y) ? null : { x, y };
          })
          .filter(Boolean);

        setChartData({
          datasets: [
            {
              label: `${xCol} vs ${yCol}`,
              data: pts,
              backgroundColor: CHART_COLORS[0],
              pointRadius: 4,
              showLine: false,
            },
          ],
        });
      }
      // LINE / BAR / AREA  <-- **kept exactly as in your original** (no logic changes)
      else {
        const xCol = selectedCols[0];
        const seriesCols = selectedCols.slice(1).length ? selectedCols.slice(1) : selectedCols;
        const labels = rows.map((r, i) => {
          const v = r[xCol];
          if (v === "" || v === undefined) return `#${i + rowRange.from}`;
          return String(v);
        });
        const datasets = seriesCols.map((col, idx) => {
          const vals = rows.map((r) => {
            const v = parseFloat(r[col]);
            return isNaN(v) ? null : v;
          });
          const base = {
            label: col,
            data: vals,
            borderColor: CHART_COLORS[idx % CHART_COLORS.length],
            backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] + (chartType === "area" ? "66" : "33"),
            fill: chartType === "area",
            tension: 0.25,
            borderWidth: 2,
            pointRadius: 0,
          };
          if (chartType === "bar") {
            base.backgroundColor = CHART_COLORS[idx % CHART_COLORS.length];
            base.borderWidth = 1;
            base.pointRadius = 0;
          }
          return base;
        });
        setChartData({ labels, datasets });
      }

      await new Promise((r) => setTimeout(r, 80));
      setChartReady(true);
      setIsPreparing(false);
      setOpenSection("preview");
    } catch (err) {
      console.error(err);
      setError("Failed to build chart data.");
      setIsPreparing(false);
    }
  }

  /* ------------------------- chart options computed ------------------------- */
  const computedOptions = useMemo(() => {
    const opts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        tooltip: { mode: "nearest", intersect: false },
        title: { display: false },
      },
      interaction: { mode: "nearest", axis: "x", intersect: false },
      scales: {},
    };
    if (!chartData) {
      opts.scales.x = { type: "category", ticks: { autoSkip: true, maxTicksLimit: 12 } };
      opts.scales.y = { beginAtZero: true };
      return opts;
    }
    if (chartType === "pie") return opts;
    if (chartType === "scatter") {
      opts.scales.x = { type: "linear", position: "bottom", ticks: { maxTicksLimit: 12 } };
      opts.scales.y = { type: "linear", beginAtZero: false };
      return opts;
    }
    const labels = chartData.labels || [];
    const approxIsDate = labels.length > 0 && labels.every((l) => looksLikeIsoDate(l));
    if (approxIsDate) {
      opts.scales.x = {
        type: "time",
        time: { parser: "iso", unit: "month", tooltipFormat: "YYYY-MM-DD", displayFormats: { month: "YYYY-MM" } },
        ticks: { autoSkip: true, maxTicksLimit: 12 },
      };
    } else {
      opts.scales.x = { type: "category", ticks: { autoSkip: true, maxTicksLimit: 12 } };
    }
    let anyNegative = false;
    if (chartData.datasets && chartData.datasets.length) {
      for (const ds of chartData.datasets) {
        if (Array.isArray(ds.data)) {
          for (const v of ds.data) {
            if (typeof v === "number" && v < 0) {
              anyNegative = true;
              break;
            }
          }
        }
        if (anyNegative) break;
      }
    }
    opts.scales.y = { beginAtZero: !anyNegative };
    return opts;
  }, [chartData, chartType]);

  /* ------------------------- exports & save ------------------------- */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);

  async function exportPNG(scale = 2, filename = `chart_${Date.now()}.png`) {
    // prefer client canvas export if chart already rendered
    const canvas = getCanvasFromChartRef();
    if (canvas) {
      const png = canvasToPngDataUrl(canvas, scale);
      downloadDataUrl(png, filename);
      return;
    }
    // fallback: if we have computedServerOptions (server config), export server-side
    try {
      const cfg = computedServerOptions;
      if (cfg) {
        await exportChartServerSide(cfg, 1200, 800);
        return;
      }
      setError("No canvas available to export. Generate a chart first.");
    } catch (err) {
      console.error(err);
      setError("Export failed.");
    }
  }

  async function exportSVG(filename = `chart_${Date.now()}.svg`, scale = 2) {
    const canvas = getCanvasFromChartRef();
    if (!canvas) {
      setError("Canvas not available (generate a chart first).");
      return;
    }
    const png = canvasToPngDataUrl(canvas, scale);
    const svgUrl = pngDataUrlToSvgDataUrl(png, canvas.width * scale, canvas.height * scale);
    downloadDataUrl(svgUrl, filename);
  }

  async function exportPDF(filename = `chart_${Date.now()}.pdf`, scale = 3) {
    const canvas = getCanvasFromChartRef();
    if (!canvas) {
      setError("Canvas not available (generate a chart first).");
      return;
    }
    const png = canvasToPngDataUrl(canvas, scale);
    const w = window.open("");
    if (!w) {
      setError("Popup blocked. Allow popups to export PDF.");
      return;
    }
    w.document.write(
      `<html>
         <head><title>Export PDF</title>
           <style>body{margin:0;display:flex;align-items:center;justify-content:center;background:#fff} img{max-width:100%;height:auto;display:block}@media print{img{width:100%}}</style>
         </head>
         <body>
           <img src="${png}" />
           <script>setTimeout(()=>{window.print();}, 500)</script>
         </body>
       </html>`
    );
  }

  async function openSaveModal() {
    if (!chartData || !chartReady) {
      setError("No chart to save.");
      return;
    }
    setSaveName(`${chartType.toUpperCase()} ${new Date().toLocaleString()}`);
    setShowSaveModal(true);
  }

  async function confirmSaveChart() {
    if (!chartData || !chartReady) {
      setShowSaveModal(false);
      return;
    }
    setSaving(true);
    const canvas = getCanvasFromChartRef();
    if (!canvas) {
      setError("Canvas not available.");
      setSaving(false);
      setShowSaveModal(false);
      return;
    }
    try {
      const png = canvasToPngDataUrl(canvas, 3);
      const item = {
        id: `hist_${Date.now()}`,
        name: saveName || `${chartType.toUpperCase()} ${new Date().toLocaleString()}`,
        timestamp: new Date().toISOString(),
        chartType,
        selectedCols,
        fileName,
        thumbnail: png,
        chartPayload: { chartType, selectedCols, rowRange, fileName, chartData },
      };
      setHistory((h) => [item, ...h].slice(0, 200));
      setSaving(false);
      setShowSaveModal(false);
      const toast = document.getElementById("save-toast");
      if (toast) {
        toast.innerText = "Saved to history";
        setTimeout(() => (toast.innerText = ""), 1400);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save thumbnail.");
      setSaving(false);
      setShowSaveModal(false);
    }
  }

  function downloadHistoryItem(item) {
    if (!item?.thumbnail) {
      setError("No thumbnail for this item.");
      return;
    }
    downloadDataUrl(item.thumbnail, `${(item.name || "chart").replace(/\s+/g, "_")}_${item.id}.png`);
  }

  function clearHistory() {
    if (!confirm("Clear history? This cannot be undone.")) return;
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  /* ------------------------- preview table ------------------------- */
  function renderPreviewTable() {
    const meta = sheetData[selectedSheet];
    if (!meta) return null;
    const rows = meta.rows?.slice(0, 8) ?? [];
    return (
      <div className="overflow-auto rounded border border-white/6 bg-white/3">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {meta.headers?.map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs text-slate-300 border-b border-white/6">
                  {h}
                </th>
              )) || null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="odd:bg-white/2">
                {meta.headers?.map((h) => (
                  <td key={h} className="px-3 py-2 text-xs text-slate-200">
                    {String(r[h] ?? "")}
                  </td>
                )) || null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ------------------------- chart renderer ------------------------- */
  useEffect(() => {
    if (chartReady && chartRef.current) {
      try {
        const canvas = getCanvasFromChartRef();
        canvas?.focus?.();
      } catch {}
    }
  }, [chartReady]);

  function renderChartJs() {
    if (!chartData || !chartReady) return null;
    const opts = computedServerOptions || computedOptions;
    if (chartType === "pie") return <Pie ref={chartRef} data={chartData} options={opts} />;
    if (chartType === "scatter") return <Scatter ref={chartRef} data={chartData} options={opts} />;
    if (chartType === "bar") return <Bar ref={chartRef} data={chartData} options={opts} />;
    return <Line ref={chartRef} data={chartData} options={opts} />;
  }

  /* ------------------------- load server history when opening ------------------------- */
  useEffect(() => {
    if (!showHistoryView) return;
    (async () => {
      try {
        const items = await fetchHistoryFromServer();
        // map server items to client history minimal shape if desired
        setHistory((prev) => {
          // keep local items, but push server items to top (dedup by datasetId)
          const existingIds = new Set(prev.map((p) => p.datasetId || p.id));
          const serverItems = (items || []).map((it) => ({ ...it, id: it.datasetId }));
          const merged = [...serverItems.filter((s) => !existingIds.has(s.id)), ...prev];
          return merged.slice(0, 200);
        });
      } catch (err) {
        console.warn("fetchHistoryFromServer failed", err);
      }
    })();
  }, [showHistoryView]);

  /* ------------------------- UI render ------------------------- */
  const fadeIn = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 } };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#071228] to-[#020817] text-white p-6"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile({ target: { files: [f] } });
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Exel Analysis (Chart.js)</h1>
            <p className="text-sm text-slate-300 mt-1">Upload Excel → pick sheet/columns → generate → export/save.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 bg-white/6 px-3 py-2 rounded-lg border border-white/8">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center font-bold text-black">
                {currentUser?.name?.split(" ").map((s) => s[0]).slice(0, 2).join("") || "U"}
              </div>
              <div className="text-sm">
                <div className="font-medium">{currentUser?.name}</div>
                <div className="text-xs text-slate-300">{currentUser?.email}</div>
              </div>
            </div>
            <button onClick={() => setShowHistoryView(true)} className="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/8 text-sm"> History ({history.length}) </button>
          </div>
        </header>

        {/* Main: accordion steps */}
        <main className="space-y-6">
          {/* 1 — File */}
          <section className="bg-white/3 border border-white/6 rounded-2xl p-4">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpenSection("file")}>
              <div>
                <div className="text-lg font-semibold">1 — File</div>
                <div className="text-xs text-slate-300">Upload or drag & drop an Excel file (.xlsx/.xls)</div>
              </div>
              <div className="text-xs text-slate-400">{openSection === "file" ? "Open" : "Open section"}</div>
            </div>

            <AnimatePresence>
              {openSection === "file" && (
                <motion.div {...fadeIn} className="mt-4">
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded bg-gradient-to-r from-[#7c3aed] to-[#ffd86b] text-black">Choose file</button>
                    <button onClick={() => resetAll()} className="px-3 py-2 rounded bg-white/6">Reset</button>
                  </div>

                  <div className="mt-3 text-xs text-slate-300">Selected file</div>
                  <div className="text-sm">{fileName || "No file selected"}</div>

                  <div className="mt-3 text-xs text-slate-300">Sheets</div>
                  <div className="mt-1">
                    <select value={selectedSheet} onChange={(e) => handleSelectSheet(e.target.value)} className="w-full bg-transparent border border-white/6 px-3 py-2 rounded" aria-label="Select worksheet">
                      {sheets.length ? sheets.map((s) => <option key={s} value={s}>{s}</option>) : <option value="">No sheets</option>}
                    </select>
                  </div>

                  <div className="mt-2 text-xs text-slate-300">{selectedSheet ? `Rows: ${sheetData[selectedSheet]?.rows?.length ?? sheetData[selectedSheet]?.rows?.length ?? 0}` : "Select a sheet to preview."}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* 2 — Columns & Range */}
          <section className="bg-white/3 border border-white/6 rounded-2xl p-4">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpenSection("columns")}>
              <div>
                <div className="text-lg font-semibold">2 — Columns & Range</div>
                <div className="text-xs text-slate-300">Pick which columns and row-range to visualize</div>
              </div>
              <div className="text-xs text-slate-400">{openSection === "columns" ? "Open" : "Open section"}</div>
            </div>

            <AnimatePresence>
              {openSection === "columns" && (
                <motion.div {...fadeIn} className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <div className="text-xs text-slate-300 mb-2">Preview (first 8 rows)</div>
                      {selectedSheet ? renderPreviewTable() : <div className="text-xs text-slate-300">No sheet selected</div>}
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs text-slate-300">Columns</div>
                      <div className="max-h-56 overflow-auto rounded border border-white/6 p-2 bg-white/4">
                        {selectedSheet ? sheetData[selectedSheet]?.headers?.map((h) => (
                          <label key={h} className="flex items-center gap-2 text-sm py-1">
                            <input type="checkbox" checked={selectedCols.includes(h)} onChange={() => toggleHeader(h)} className="accent-[#7c3aed]" aria-checked={selectedCols.includes(h)} />
                            <span className="truncate">{h}</span>
                          </label>
                        )) : <div className="text-xs text-slate-300">No sheet selected</div>}
                      </div>

                      <div className="text-xs text-slate-300">Row range</div>
                      <div className="flex gap-2 items-center">
                        <input type="number" min={1} value={rowRange.from} onChange={(e) => setRowRange((r) => ({ ...r, from: Math.max(1, Number(e.target.value || 1)) }))} className="w-28 bg-transparent border border-white/6 px-2 py-2 rounded text-sm" aria-label="From row" />
                        <div className="text-xs text-slate-300">to</div>
                        <input type="number" min={1} value={rowRange.to} onChange={(e) => setRowRange((r) => ({ ...r, to: Math.max(1, Number(e.target.value || 1)) }))} className="w-28 bg-transparent border border-white/6 px-2 py-2 rounded text-sm" aria-label="To row" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* 3 — Chart Type & Actions */}
          <section className="bg-white/3 border border-white/6 rounded-2xl p-4">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpenSection("chart")}>
              <div>
                <div className="text-lg font-semibold">3 — Chart Type & Actions</div>
                <div className="text-xs text-slate-300">Choose visualization and generate/export/save</div>
              </div>
              <div className="text-xs text-slate-400">{openSection === "chart" ? "Open" : "Open section"}</div>
            </div>

            <AnimatePresence>
              {openSection === "chart" && (
                <motion.div {...fadeIn} className="mt-4">
                  <div className="flex gap-2 flex-wrap">
                    {["line", "bar", "area", "pie", "scatter"].map((t) => (
                      <button key={t} onClick={() => setChartType(t)} aria-checked={chartType === t} role="radio" className={`px-3 py-2 rounded text-sm ${chartType === t ? "bg-gradient-to-r from-[#7c3aed] to-[#ffd86b] text-black" : "bg-white/6 text-slate-200"}`}>{t.toUpperCase()}</button>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button onClick={prepareChart} className="px-3 py-2 rounded bg-gradient-to-r from-[#7c3aed] to-[#ffd86b] text-black">Generate</button>
                    <button onClick={() => exportPNG(2)} className="px-3 py-2 rounded bg-white/6">Export PNG</button>
                    <button onClick={() => exportSVG()} className="px-3 py-2 rounded bg-white/6">Export SVG</button>
                    <button onClick={() => exportPDF(undefined, 3)} className="px-3 py-2 rounded bg-white/6">Export PDF</button>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button onClick={openSaveModal} className="px-3 py-2 rounded bg-white/6">{saving ? "Saving..." : "Save to history"}</button>
                    <button onClick={() => { setChartData(null); setChartReady(false); setOpenSection("file"); }} className="px-3 py-2 rounded bg-white/6">Clear Chart</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* 4 — Preview */}
          <section className="bg-white/3 border border-white/6 rounded-2xl p-4">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpenSection("preview")}>
              <div>
                <div className="text-lg font-semibold">4 — Preview</div>
                <div className="text-xs text-slate-300">Rendered chart appears here after Generate</div>
              </div>
              <div className="text-xs text-slate-400">{openSection === "preview" ? "Open" : "Open section"}</div>
            </div>

            <AnimatePresence>
              {openSection === "preview" && (
                <motion.div {...fadeIn} className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-slate-300">Preview area</div>
                    <div className="flex gap-2">
                      <button onClick={() => exportPNG(3)} className="text-sm bg-white/6 px-3 py-2 rounded">Download PNG</button>
                      <button onClick={openSaveModal} className="text-sm bg-white/6 px-3 py-2 rounded">Save</button>
                      <button onClick={() => { setChartData(null); setChartReady(false); }} className="text-sm bg-white/6 px-3 py-2 rounded">Clear</button>
                    </div>
                  </div>

                  <div ref={chartWrapperRef} className="bg-white/5 border border-white/6 rounded p-4 min-h-[30rem] flex items-center justify-center">
                    {isPreparing && (
                      <div className="w-full text-center text-slate-300">
                        <div className="h-5 bg-white/6 rounded w-1/3 mx-auto animate-pulse mb-4" />
                        <div className="h-56 bg-white/8 rounded mx-auto animate-pulse" />
                      </div>
                    )}

                    {!isPreparing && chartReady && (
                      <div className="w-full h-[540px]">{renderChartJs()}</div>
                    )}

                    {!isPreparing && !chartReady && (
                      <div className="text-center text-slate-300">
                        <div className="text-lg font-medium">No chart yet</div>
                        <div className="text-xs mt-2">Use the sections above and click <strong>Generate</strong>.</div>
                      </div>
                    )}
                  </div>

                  <div id="save-toast" className="text-xs text-emerald-300 mt-2" />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>

        {/* History modal */}
        <AnimatePresence>
          {showHistoryView && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-6" role="dialog" aria-modal="true" aria-label="History">
              <motion.div initial={{ y: -12 }} animate={{ y: 0 }} exit={{ y: -12 }} className="max-w-5xl w-full bg-[#071425] border border-white/6 rounded-2xl p-6 overflow-auto shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xl font-semibold">History</div>
                    <div className="text-xs text-slate-300">Saved charts (restore, download or clear)</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowHistoryView(false)} className="px-3 py-2 rounded bg-white/6">Close</button>
                    <button onClick={clearHistory} className="px-3 py-2 rounded bg-white/6">Clear</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.length === 0 && <div className="text-sm text-slate-300 p-6 col-span-full">No saved charts yet.</div>}
                  {history.map((it) => (
                    <div key={it.id} className="bg-white/6 border border-white/8 rounded-lg p-3 flex flex-col gap-2">
                      <div className="h-40 bg-white/10 rounded overflow-hidden">
                        {it.thumbnail ? <img src={it.thumbnail} alt={it.name || "chart thumbnail"} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-slate-300">No preview</div>}
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{it.name || it.chartType?.toUpperCase()}</div>
                          <div className="text-xs text-slate-300">{it.selectedCols?.join(", ")}</div>
                          <div className="text-xs text-slate-300">{it.createdAt ? new Date(it.createdAt).toLocaleString() : new Date(it.timestamp).toLocaleString()}</div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button onClick={() => downloadHistoryItem(it)} className="text-xs bg-white/6 px-2 py-1 rounded">Download</button>
                          <button onClick={() => {
                            if (it.chartPayload) {
                              const payload = it.chartPayload;
                              setChartType(payload.chartType || "line");
                              setSelectedCols(payload.selectedCols || []);
                              setChartData(payload.chartData || payload.chartPayload?.chartData || null);
                              setComputedServerOptions(null);
                              setChartReady(true);
                              setShowHistoryView(false);
                              setOpenSection("preview");
                            } else if (it.datasetId) {
                              // basic restore to dataset
                              setDatasetId(it.datasetId);
                              setSelectedSheet(it.sheets?.[0]?.name || "");
                              setShowHistoryView(false);
                              setOpenSection("columns");
                            }
                          }} className="text-xs bg-white/6 px-2 py-1 rounded">Restore</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save modal */}
        <AnimatePresence>
          {showSaveModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="Save chart">
              <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} exit={{ scale: 0.98 }} className="w-full max-w-lg bg-[#071425] border border-white/6 rounded-2xl p-6">
                <div className="text-lg font-semibold mb-2">Save chart</div>
                <div className="text-xs text-slate-300 mb-4">Give the chart a name so you can find it later.</div>
                <input autoFocus value={saveName} onChange={(e) => setSaveName(e.target.value)} className="w-full bg-transparent border border-white/6 px-3 py-2 rounded mb-4" aria-label="Chart name" onKeyDown={(e) => { if (e.key === "Enter") confirmSaveChart(); }} />
                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => setShowSaveModal(false)} className="px-3 py-2 rounded bg-white/6">Cancel</button>
                  <button onClick={() => confirmSaveChart()} className="px-3 py-2 rounded bg-gradient-to-r from-[#7c3aed] to-[#ffd86b] text-black">{saving ? "Saving..." : "Save"}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* hidden file input fallback */}
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />

        {/* error toast */}
        <div aria-live="assertive" className="fixed left-6 bottom-6 z-70">
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="bg-rose-900/80 border border-rose-600 text-rose-200 px-4 py-2 rounded">
                <div className="text-xs">{error}</div>
                <div className="mt-1 text-[10px]"><button onClick={() => setError("")} className="underline">Dismiss</button></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
