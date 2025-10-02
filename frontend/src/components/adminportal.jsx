// AdminConsole.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Chart } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * AdminConsole.jsx
 * - Integrates frontend Admin dashboard with provided backend controllers.
 * - Features:
 *   • List datasets (admin/user)
 *   • Upload Excel files (POST /api/exel)
 *   • View dataset meta (/api/datasets/:id/meta)
 *   • Build chart config server-side (/api/upload/buildChartConfig)
 *   • Render returned Chart.js config client-side
 *   • Export server-side PNG (/api/upload/exportChartPng)
 *   • Record chart (/api/charts)
 *   • Admin dataset/chart operations (delete, reassign, download)
 *
 * Requirements: react, react-chartjs-2, chart.js, framer-motion, tailwindcss
 */

// ---------- config ----------
const API_BASE = ""; // set if your API is at a different base URL (e.g. "https://api.example.com")
const ENDPOINTS = {
  upload: () => `${API_BASE}/api/exel`, // POST multipart (file)
  meta: (id) => `${API_BASE}/api/datasets/${id}/meta`, // GET
  buildChartConfig: () => `${API_BASE}/api/upload/buildChartConfig`, // POST {datasetId, sheet, xKey, yKeys...}
  exportChartPng: () => `${API_BASE}/api/upload/exportChartPng`, // POST { chartConfig } -> image/png
  recordChart: () => `${API_BASE}/api/charts`, // POST { datasetId, title, chartPayload, thumbnailDataUrl? }
  listHistory: () => `${API_BASE}/api/user/history`, // GET user history (try) / fallback to /api/history
  adminDatasets: () => `${API_BASE}/api/admin/datasets`, // GET admin datasets
  adminGetDataset: (id) => `${API_BASE}/api/admin/datasets/${id}`, // GET admin dataset
  adminDeleteDataset: (id) => `${API_BASE}/api/admin/datasets/${id}`, // DELETE
  adminReassignDataset: (id) => `${API_BASE}/api/admin/datasets/${id}/reassign`, // POST { newUserId }
  adminDownloadDataset: (id) => `${API_BASE}/api/admin/datasets/${id}/download`, // GET
  adminListCharts: () => `${API_BASE}/api/admin/charts`,
  adminDeleteChart: (id) => `${API_BASE}/api/admin/charts/${id}`,
};

// ---------- small helpers ----------
const gradientBtn = "bg-gradient-to-r from-[#2dd4bf] via-[#facc15] to-[#10b981] text-black font-semibold rounded-lg px-4 py-2 shadow-md";
const ghostBtn = "bg-transparent border border-white/20 text-white px-3 py-1 rounded-md";

function rgba(hex, alpha = 0.15) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

async function apiFetchJson(url, opts = {}) {
  const res = await fetch(url, { credentials: "same-origin", ...opts });
  const txt = await res.text();
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let payload = txt;
    try { payload = JSON.parse(txt); } catch {}
    throw { status: res.status, payload };
  }
  if (ct.includes("application/json")) return JSON.parse(txt);
  return txt;
}

// ---------- small fake users generator (keeps your existing UI behaviour) ----------
function randomUsers() {
  const COLORS = ["#ef4444","#10b981","#3b82f6","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316"];
  const arr = [];
  for (let i=1;i<=8;i++){
    arr.push({
      id: i,
      name: ["Kavshik","Santosh","Kishan","Vikash","Vishal","Dinesh","User","Guest"][i-1] || `User${i}`,
      email: `user${i}@example.com`,
      joined: new Date(Date.now()-i*86400000).toISOString().slice(0,10),
      chartsGenerated: Math.floor(Math.random()*20),
      chartsDownloaded: Math.floor(Math.random()*10),
      history: [],
    });
  }
  return arr;
}

// ---------- base chart options ----------
const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#ffffff" } },
    tooltip: {
      titleColor: "#ffffff",
      bodyColor: "#ffffff",
      backgroundColor: "rgba(0,0,0,0.75)",
    },
  },
  scales: {
    x: { ticks: { color: "#ffffff" }, grid: { color: "rgba(255,255,255,0.06)" }, title: { color: "#ffffff", display: false } },
    y: { ticks: { color: "#ffffff" }, grid: { color: "rgba(255,255,255,0.06)" }, title: { color: "#ffffff", display: false } },
  },
};

// ========== Component ==========
export default function AdminConsole() {
  // UI state
  const [users, setUsers] = useState(randomUsers());
  const [datasets, setDatasets] = useState([]); // datasets from server (admin/user)
  const [query, setQuery] = useState("");
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [sheetCols, setSheetCols] = useState([]);
  const [sheetPreviewRows, setSheetPreviewRows] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [xKey, setXKey] = useState("");
  const [yKey, setYKey] = useState(""); // single ykey for simplicity (can extend to multi)
  const [agg, setAgg] = useState("sum");
  const [serverChartConfig, setServerChartConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [adminMode, setAdminMode] = useState(false);
  const chartRef = useRef(null);
  const hiddenCanvasRef = useRef(null);

  // totals (for dashboard widgets)
  const totals = useMemo(() => ({
    totalUsers: users.length,
    totalChartsGenerated: users.reduce((s,u)=>s+u.chartsGenerated,0),
    totalChartsDownloaded: users.reduce((s,u)=>s+u.chartsDownloaded,0),
  }), [users]);

  // load datasets on mount (try user history first otherwise admin listing)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        try {
          const h = await apiFetchJson(ENDPOINTS.listHistory());
          // history endpoint formats vary; handle known shapes
          if (h?.items) {
            setDatasets(h.items.map(it => ({ datasetId: it.datasetId, originalFilename: it.filename, sheets: it.sheets, preview: it.rowsPreview })));
          } else if (Array.isArray(h)) {
            setDatasets(h);
          } else {
            // fallback: try admin list (may require admin token)
            const admin = await apiFetchJson(ENDPOINTS.adminDatasets() + "?page=1&pageSize=50");
            if (admin?.datasets) setDatasets(admin.datasets);
          }
        } catch (e) {
          // fallback to admin list
          try {
            const admin = await apiFetchJson(ENDPOINTS.adminDatasets() + "?page=1&pageSize=50");
            if (admin?.datasets) setDatasets(admin.datasets);
          } catch (err) {
            console.warn("no datasets available or access denied", err);
          }
        }
      } catch (err) {
        console.error("initial datasets fetch failed", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // filtered datasets for side list
  const filteredDatasets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return datasets;
    return datasets.filter(d => (d.originalFilename || "").toLowerCase().includes(q) || (d.datasetId || "").toLowerCase().includes(q));
  }, [datasets, query]);

  // ---------- actions ----------
  async function handleUploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("metadata", JSON.stringify({ uploadedAt: new Date().toISOString() }));
    try {
      const res = await fetch(ENDPOINTS.upload(), { method: "POST", body: fd, credentials: "same-origin" });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Upload failed ${res.status}`);
      }
      const body = await res.json();
      // response shape (your backend) -> { datasetId, sheets, columns: columnsBySheet, preview, file }
      const meta = {
        datasetId: body.datasetId,
        originalFilename: body.file?.originalFilename || `upload-${Date.now()}`,
        sheets: body.sheets || [],
        preview: body.preview || [],
      };
      setDatasets((d) => [meta, ...d]);
      alert("Upload success. DatasetId: " + body.datasetId);
    } catch (err) {
      console.error("upload failed", err);
      alert("Upload failed: " + (err.message || JSON.stringify(err)));
    } finally {
      setUploading(false);
      setFileInputKey(Date.now());
    }
  }

  async function openDataset(dataset) {
    setSelectedDataset(null); // reset
    setSheetCols([]);
    setSheetPreviewRows([]);
    setSelectedDataset(dataset);
    // fetch meta from server for fresh info
    try {
      const meta = await apiFetchJson(ENDPOINTS.meta(dataset.datasetId));
      setSelectedDataset({ ...meta, datasetId: meta.datasetId || dataset.datasetId });
      if (meta.sheets?.[0]) {
        setSelectedSheet(meta.sheets[0].name);
        // request columns for that sheet (if route exists)
        try {
          const q = new URL(ENDPOINTS.buildChartConfig(), window.location.origin); // use endpoint base for query building
        } catch {}
      }
    } catch (err) {
      console.warn("could not fetch dataset meta, using cached meta", err);
    }
  }

  async function fetchSheetColumns(datasetId, sheet) {
    if (!datasetId || !sheet) return;
    setLoading(true);
    try {
      // your server has getSheetColumns controller at GET /api/upload/getSheetColumns?datasetId=...&sheet=...
      const url = `${API_BASE}/api/upload/getSheetColumns?datasetId=${encodeURIComponent(datasetId)}&sheet=${encodeURIComponent(sheet)}`;
      const body = await apiFetchJson(url, { method: "GET" });
      if (body?.columns) {
        setSheetCols(body.columns);
      } else if (body?.columnsBySheet && body.columnsBySheet[sheet]) {
        setSheetCols(body.columnsBySheet[sheet]);
      } else {
        // fallback: use selectedDataset.preview rows to infer columns
        const rows = selectedDataset?.preview || [];
        const cols = rows.length ? Object.keys(rows[0]) : [];
        setSheetCols(cols);
      }
      // fetch first page preview rows
      const rowsUrl = `${API_BASE}/api/upload/getRows?datasetId=${encodeURIComponent(datasetId)}&sheet=${encodeURIComponent(sheet)}&page=1&pageSize=20`;
      try {
        const rowsBody = await fetch(rowsUrl, { method: "GET", credentials: "same-origin" });
        if (rowsBody.ok) {
          const rowsJson = await rowsBody.json();
          setSheetPreviewRows(rowsJson.rows || rowsJson);
        } else {
          setSheetPreviewRows(selectedDataset?.preview || []);
        }
      } catch {
        setSheetPreviewRows(selectedDataset?.preview || []);
      }
    } catch (err) {
      console.error("getSheetColumns failed", err);
      setSheetCols(selectedDataset?.columns?.[sheet] || selectedDataset?.columnsBySheet?.[sheet] || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedDataset?.datasetId && selectedSheet) {
      fetchSheetColumns(selectedDataset.datasetId, selectedSheet);
    }
  }, [selectedDataset, selectedSheet]);

  async function buildServerChart() {
    if (!selectedDataset?.datasetId || !selectedSheet || !xKey || !yKey) {
      alert("select dataset, sheet, xKey and yKey");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        datasetId: selectedDataset.datasetId,
        sheet: selectedSheet,
        xKey,
        yKeys: [yKey],
        agg: agg || "sum",
        groupBy: true,
        title: `${selectedSheet} — ${yKey}`,
      };
      const res = await fetch(ENDPOINTS.buildChartConfig(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `buildChartConfig failed ${res.status}`);
      }
      const body = await res.json();
      // server returns { config }
      if (body?.config) {
        setServerChartConfig(body.config);
        // scroll to chart (optional)
        setTimeout(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, 150);
      } else {
        throw new Error("no config returned");
      }
    } catch (err) {
      console.error("buildServerChart failed", err);
      alert("buildServerChart failed: " + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  }

  // export server-side png
  async function exportServerPng(width = 1200, height = 800) {
    if (!serverChartConfig) return alert("Build chart first");
    try {
      const url = ENDPOINTS.exportChartPng() + `?width=${width}&height=${height}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartConfig: serverChartConfig }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `exportChartPng failed ${res.status}`);
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${selectedDataset?.datasetId || "chart"}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("exportServerPng failed", err);
      alert("exportServerPng failed: " + (err.message || JSON.stringify(err)));
    }
  }

  // record chart metadata to server
  async function recordChartOnServer() {
    if (!serverChartConfig || !selectedDataset?.datasetId) return alert("build chart and select dataset first");
    try {
      // create a thumbnail dataURL from canvas if chartRef available
      let thumbnailDataUrl = null;
      try {
        const canvas = document.querySelector("#rendered-chart canvas");
        if (canvas) thumbnailDataUrl = canvas.toDataURL("image/png");
      } catch (e) {}
      const payload = {
        datasetId: selectedDataset.datasetId,
        title: serverChartConfig?.options?.plugins?.title?.text || `chart-${Date.now()}`,
        chartConfig: serverChartConfig,
        configSummary: `${selectedSheet}:${yKey}`,
        downloadUrl: null,
        thumbnailDataUrl,
      };
      const res = await fetch(ENDPOINTS.recordChart(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `recordChart failed ${res.status}`);
      }
      const body = await res.json();
      alert("Chart recorded: " + (body.chartId || "ok"));
    } catch (err) {
      console.error("recordChart failed", err);
      alert("recordChart failed: " + (err.message || JSON.stringify(err)));
    }
  }

  // admin actions: delete dataset
  async function adminDeleteDataset(datasetId, unlink = false) {
    if (!window.confirm("Delete dataset? This will remove DB record and optionally delete file from disk.")) return;
    try {
      const url = ENDPOINTS.adminDeleteDataset(datasetId) + (unlink ? "?unlink=true" : "");
      const res = await fetch(url, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) throw new Error(await res.text());
      setDatasets(prev => prev.filter(d => d.datasetId !== datasetId));
      alert("Deleted dataset " + datasetId);
    } catch (err) {
      console.error("adminDeleteDataset failed", err);
      alert("adminDeleteDataset failed: " + (err.message || JSON.stringify(err)));
    }
  }

  async function adminReassign(datasetId) {
    const newUserId = prompt("New userId to assign dataset to (string)");
    if (!newUserId) return;
    try {
      const res = await fetch(ENDPOINTS.adminReassignDataset(datasetId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUserId }),
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(await res.text());
      alert("Reassigned dataset");
    } catch (err) {
      console.error("adminReassign failed", err);
      alert("adminReassign failed: " + (err.message || JSON.stringify(err)));
    }
  }

  async function adminDownloadDataset(datasetId) {
    try {
      const url = ENDPOINTS.adminDownloadDataset(datasetId);
      const res = await fetch(url, { method: "GET", credentials: "same-origin" });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${datasetId}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("adminDownloadDataset failed", err);
      alert("adminDownloadDataset failed: " + (err.message || JSON.stringify(err)));
    }
  }

  // ---------- small UI helpers ----------
  const COLORS = ["#ef4444","#10b981","#3b82f6","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316"];

  // ---------- render ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071233] to-[#041026] text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Admin Console</h1>
            <p className="text-sm text-white/70">Manage datasets, upload Excel files, build server-side charts and export.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
              <input className="bg-transparent outline-none text-white placeholder-white/60" placeholder="Search datasets or filename" value={query} onChange={(e)=>setQuery(e.target.value)} />
            </div>
            <button className={ghostBtn} onClick={()=>setQuery("")}>Clear</button>
            <button className={gradientBtn} onClick={()=>{ setAdminMode(m=>!m); }}>{adminMode ? "User view" : "Admin view"}</button>
          </div>
        </header>

        <main className="grid grid-cols-12 gap-6">
          {/* Left: Overview + Chart builder */}
          <section className="col-span-8 bg-white/4 rounded-2xl p-6 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Overview</h2>
              <div className="flex items-center gap-3">
                <label className="text-xs text-white/70 mr-2">Upload excel</label>
                <input key={fileInputKey} type="file" accept=".xlsx,.xls" onChange={handleUploadFile} className="text-sm text-white bg-white/5 rounded p-1" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <motion.div whileHover={{ y: -6 }} className="p-4 rounded-xl bg-gradient-to-br from-[#06132a] to-[#062443]">
                <div className="text-sm text-white/70">Total users</div>
                <div className="text-2xl font-bold">{totals.totalUsers}</div>
              </motion.div>
              <motion.div whileHover={{ y: -6 }} className="p-4 rounded-xl bg-gradient-to-br from-[#06132a] to-[#062443]">
                <div className="text-sm text-white/70">Charts generated</div>
                <div className="text-2xl font-bold">{totals.totalChartsGenerated}</div>
              </motion.div>
              <motion.div whileHover={{ y: -6 }} className="p-4 rounded-xl bg-gradient-to-br from-[#06132a] to-[#062443]">
                <div className="text-sm text-white/70">Charts downloaded</div>
                <div className="text-2xl font-bold">{totals.totalChartsDownloaded}</div>
              </motion.div>
            </div>

            {/* Chart builder */}
            <div className="mb-6">
              <h3 className="mb-2 text-lg font-medium">Build chart (server-side)</h3>
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <div className="flex gap-2">
                  <select className="bg-transparent border border-white/10 rounded px-3 py-1" value={selectedDataset?.datasetId || ""} onChange={(e)=>{
                    const ds = datasets.find(d=>d.datasetId === e.target.value);
                    if (ds) openDataset(ds);
                  }}>
                    <option value="">Select dataset</option>
                    {datasets.map(d => <option key={d.datasetId} value={d.datasetId}>{d.originalFilename || d.filename || d.datasetId}</option>)}
                  </select>

                  <select className="bg-transparent border border-white/10 rounded px-3 py-1" value={selectedSheet} onChange={(e)=>setSelectedSheet(e.target.value)}>
                    <option value="">Select sheet</option>
                    {selectedDataset?.sheets?.map(s => <option key={s.name} value={s.name}>{s.name} ({s.rows} rows)</option>)}
                  </select>

                  <select className="bg-transparent border border-white/10 rounded px-3 py-1" value={xKey} onChange={(e)=>setXKey(e.target.value)}>
                    <option value="">X key (column)</option>
                    {sheetCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select className="bg-transparent border border-white/10 rounded px-3 py-1" value={yKey} onChange={(e)=>setYKey(e.target.value)}>
                    <option value="">Y key (column)</option>
                    {sheetCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-white/60">Agg</label>
                  <select className="bg-transparent border border-white/10 rounded px-3 py-1" value={agg} onChange={(e)=>setAgg(e.target.value)}>
                    <option value="sum">sum</option>
                    <option value="avg">avg</option>
                    <option value="count">count</option>
                    <option value="none">none</option>
                  </select>

                  <button className="px-3 py-1 rounded bg-white/6" onClick={buildServerChart}>Build chart</button>
                  <button className="px-3 py-1 rounded bg-white/6" onClick={()=>exportServerPng()}>Export PNG (server)</button>
                  <button className="px-3 py-1 rounded bg-white/6" onClick={recordChartOnServer}>Record chart</button>
                </div>

                <div>
                  <div id="rendered-chart" style={{ height: 360 }} className="bg-white/3 rounded p-3">
                    {serverChartConfig ? (
                      <Chart
                        ref={chartRef}
                        type={serverChartConfig.type || "line"}
                        data={serverChartConfig.data}
                        options={{ ...serverChartConfig.options, ...baseChartOptions }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-white/60">No chart built yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick summary */}
            <div>
              <h3 className="mb-2 text-lg font-medium">Summary</h3>
              <div className="bg-white/5 rounded-xl p-4">
                <div style={{ height: 240 }}>
                  <Chart
                    type="bar"
                    data={{
                      labels: ["Users","Charts Gen","Charts Down"],
                      datasets: [{
                        label: "Counts",
                        data: [totals.totalUsers, totals.totalChartsGenerated, totals.totalChartsDownloaded],
                        backgroundColor: [rgba(COLORS[1],0.9), rgba(COLORS[0],0.9), rgba(COLORS[2],0.9)],
                        borderColor: ["#ffffff","#ffffff","#ffffff"],
                        borderWidth: 2,
                      }]
                    }}
                    options={baseChartOptions}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Right: datasets list + admin operations */}
          <aside className="col-span-4">
            <div className="bg-white/3 rounded-2xl p-4 mb-6">
              <h3 className="text-lg font-semibold mb-2">Datasets {loading && <span className="text-xs text-white/60">loading…</span>}</h3>
              <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
                {filteredDatasets.length === 0 && <div className="text-sm text-white/60">No datasets found.</div>}
                {filteredDatasets.map(d => (
                  <motion.div key={d.datasetId} whileHover={{ scale: 1.01 }} className="bg-white/4 p-3 rounded-md flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{d.originalFilename || d.filename || d.datasetId}</div>
                      <div className="text-xs text-white/60">{d.datasetId}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-1">
                        <button className="px-2 py-1 rounded bg-white/6 text-sm" onClick={()=>openDataset(d)}>Open</button>
                        <button className="px-2 py-1 rounded bg-white/6 text-sm" onClick={()=>fetchSheetColumns(d.datasetId, d.sheets?.[0]?.name || selectedSheet)}>Cols</button>
                      </div>
                      <div className="flex gap-1">
                        <button className="px-2 py-1 rounded bg-white/6 text-sm" onClick={()=>adminDownloadDataset(d.datasetId)}>Download</button>
                        {adminMode && <button className="px-2 py-1 rounded bg-red-600 text-sm" onClick={()=>adminDeleteDataset(d.datasetId, true)}>Delete</button>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-white/3 rounded-2xl p-4">
              <h3 className="text-lg font-semibold mb-2">Dataset details</h3>
              {selectedDataset ? (
                <>
                  <div className="text-sm text-white/70 mb-2">{selectedDataset.originalFilename || selectedDataset.filename}</div>
                  <div className="text-xs text-white/60 mb-2">DatasetId: {selectedDataset.datasetId}</div>

                  <div className="mb-2">
                    <div className="text-xs text-white/60">Sheets</div>
                    <div className="flex flex-col gap-1 mt-1">
                      {(selectedDataset.sheets || []).map(s => (
                        <button key={s.name} onClick={()=>setSelectedSheet(s.name)} className={`text-sm text-left px-2 py-1 rounded ${selectedSheet===s.name ? "bg-white/6" : ""}`}>{s.name} <span className="text-xs text-white/50">({s.rows})</span></button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="text-xs text-white/60">Columns (sheet: {selectedSheet || "—"})</div>
                    <div className="text-sm mt-1 max-h-28 overflow-auto">
                      {sheetCols.length ? sheetCols.map(c => <div key={c} className="text-sm text-white/70">{c}</div>) : <div className="text-xs text-white/50">No columns loaded</div>}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button className="px-3 py-1 rounded bg-white/6" onClick={()=>setServerChartConfig(null)}>Clear chart</button>
                    {adminMode && <button className="px-3 py-1 rounded bg-white/6" onClick={()=>adminReassign(selectedDataset.datasetId)}>Reassign</button>}
                  </div>
                </>
              ) : (
                <div className="text-sm text-white/60">Open a dataset to see details.</div>
              )}
            </div>

            <div className="bg-white/3 rounded-2xl p-4 mt-4">
              <h3 className="text-lg font-semibold mb-2">Sheet preview</h3>
              <div className="max-h-40 overflow-auto text-sm">
                {sheetPreviewRows.length ? (
                  <table className="w-full text-left text-xs">
                    <thead className="text-white/60">
                      <tr>
                        {Object.keys(sheetPreviewRows[0] || {}).slice(0,6).map(k => <th key={k} className="pr-2">{k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetPreviewRows.slice(0,6).map((r, idx) => (
                        <tr key={idx} className="border-t border-white/6">
                          {Object.keys(sheetPreviewRows[0] || {}).slice(0,6).map((k) => <td key={k} className="py-1">{String(r[k] ?? "")}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <div className="text-xs text-white/50">No preview rows</div>}
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
