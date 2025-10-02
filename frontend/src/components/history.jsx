// HistoryPanel.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * HistoryPanel (forceful background + animations)
 *
 * If Tailwind is available this will use it. If not, add the CSS fallback below.
 */

export default function HistoryPanel({
  apiBaseUrl = "",
  currentUser = {},
  onClose = () => {},
  onRestoreChart = (payload) => {},
}) {
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [charts, setCharts] = useState([]);
  const [error, setError] = useState("");

  const [activeDatasetMeta, setActiveDatasetMeta] = useState(null);
  const [activeChart, setActiveChart] = useState(null);

  const [openPanel, setOpenPanel] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const HISTORY_URL = `${apiBaseUrl}/uploads/history`;
  const META_URL = (id) => `${apiBaseUrl}/uploads/datasets/${encodeURIComponent(id)}/meta`;
  const DOWNLOAD_URL = (id) => `${apiBaseUrl}/uploads/datasets/${encodeURIComponent(id)}/download`;

  function getAuthHeaders() {
    const token = currentUser?.authToken || localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setError("");
      setLoading(true);
      try {
        const res = await fetch(HISTORY_URL, { headers: { Accept: "application/json", ...getAuthHeaders() } });
        if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);
        const body = await res.json();
        if (!mounted) return;
        setDatasets(Array.isArray(body.datasets) ? body.datasets : []);
        setCharts(Array.isArray(body.charts) ? body.charts : []);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError(err.message || "Failed to fetch history");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [HISTORY_URL, refreshKey]);

  async function openDataset(datasetId) {
    setActiveChart(null);
    setActiveDatasetMeta(null);
    setError("");
    try {
      const res = await fetch(META_URL(datasetId), { headers: { Accept: "application/json", ...getAuthHeaders() } });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Meta fetch failed: ${res.status} ${txt}`);
      }
      const meta = await res.json();
      setActiveDatasetMeta(meta);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load dataset meta");
    }
  }

  function openChart(chart) {
    setActiveDatasetMeta(null);
    setActiveChart(chart);
  }

  async function downloadDatasetFile(datasetId, meta) {
    setError("");
    try {
      const res = await fetch(DOWNLOAD_URL(datasetId), { headers: { ...getAuthHeaders() } });
      if (res.ok) {
        const blob = await res.blob();
        const filename = (meta && meta.filename) ? meta.filename : `dataset_${datasetId}.xlsx`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }
    } catch (err) {
      console.warn("download endpoint failed, falling back", err);
    }

    if (meta?.filePath) {
      const p = String(meta.filePath);
      const idx = p.indexOf("uploads/");
      if (idx >= 0) {
        const publicPath = p.slice(idx);
        const url = `${apiBaseUrl}/${publicPath}`;
        const w = window.open(url, "_blank");
        if (!w) setError("Popup blocked. Allow popups to download file.");
        return;
      } else {
        setError("No downloadable path available for this file.");
      }
    } else {
      setError("No file available to download.");
    }
  }

  async function downloadChartThumbnail(chart) {
    setError("");
    if (chart?.thumbnailPath) {
      const p = String(chart.thumbnailPath);
      const idx = p.indexOf("uploads/");
      if (idx >= 0) {
        const publicPath = p.slice(idx);
        const url = `${apiBaseUrl}/${publicPath}`;
        const w = window.open(url, "_blank");
        if (!w) setError("Popup blocked. Allow popups to download file.");
        return;
      }
    }
    if (chart?.chartPayload?.thumbnailDataUrl) {
      const a = document.createElement("a");
      a.href = chart.chartPayload.thumbnailDataUrl;
      a.download = `${(chart.name || "chart").replace(/\s+/g, "_")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    setError("No thumbnail available for this chart.");
  }

  function restoreChart(chart) {
    if (chart?.chartPayload) {
      onRestoreChart(chart.chartPayload);
    } else {
      setError("Chart payload not available to restore.");
    }
  }

  function closePreview() {
    setActiveChart(null);
    setActiveDatasetMeta(null);
  }

  // framer-motion variants
  const listItem = {
    hidden: { opacity: 0, y: 8, scale: 0.995 },
    enter: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 22 } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
  };
  const panel = {
    hidden: { opacity: 0, scale: 0.99 },
    enter: { opacity: 1, scale: 1, transition: { duration: 0.18 } },
    exit: { opacity: 0, scale: 0.99, transition: { duration: 0.12 } },
  };

  // Root wrapper uses forced inline style fallback as well as Tailwind classes
  return (
    <div
      className="history-root min-h-screen p-6"
      style={{
        background:
          "linear-gradient(180deg, rgba(7,18,40,1) 0%, rgba(2,8,23,1) 100%)",
        // fallback color if Tailwind not present
        color: "#E6EEF6",
        minHeight: "100vh",
      }}
    >
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">History</h2>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded bg-gradient-to-r from-indigo-600 to-cyan-400 text-black text-sm shadow-sm hover:brightness-105"
              onClick={() => { setRefreshKey(k => k + 1); }}
            >
              Refresh
            </button>
            <button
              className="px-3 py-1 rounded bg-slate-700 text-sm hover:bg-slate-600"
              onClick={() => { setOpenPanel(o => !o); }}
            >
              {openPanel ? "Hide" : "Show"}
            </button>
            <button
              className="px-3 py-1 rounded bg-rose-600 text-white text-sm hover:rose-500"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        {!openPanel && <div className="text-sm text-slate-400">Panel hidden</div>}

        <AnimatePresence>
          {openPanel && (
            <motion.div variants={panel} initial="hidden" animate="enter" exit="exit">
              {loading && <div className="text-sm text-slate-300 mb-2">Loading...</div>}
              {error && <div className="text-sm text-rose-300 mb-2">{error}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Datasets */}
                <div className="rounded-lg p-4 shadow" style={{ background: "linear-gradient(180deg,#0f1724 0%, #0b1220 100%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-slate-100">Uploaded Excel files</div>
                    <div className="text-xs text-slate-300">{datasets.length} files</div>
                  </div>

                  {datasets.length === 0 && <div className="text-sm text-slate-300">No uploads yet.</div>}

                  <div className="space-y-3">
                    <AnimatePresence>
                      {datasets.map((d) => (
                        <motion.div
                          key={d.datasetId}
                          className="p-3 rounded flex items-start justify-between gap-3"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.03)" }}
                          variants={listItem}
                          initial="hidden"
                          animate="enter"
                          exit="exit"
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-50">{d.originalFilename || d.filename || d.datasetId}</div>
                            <div className="text-xs text-slate-300">{d.sheets?.map(s => s.name).join(", ")}</div>
                            <div className="text-xs text-slate-400">{d.createdAt ? new Date(d.createdAt).toLocaleString() : ""}</div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
                              className="text-xs px-2 py-1 rounded"
                              style={{ background: "linear-gradient(90deg,#6366f1,#06b6d4)", color: "#000" }}
                              onClick={() => openDataset(d.datasetId)}
                            >
                              Open
                            </button>
                            <button
                              className="text-xs px-2 py-1 rounded"
                              style={{ background: "rgba(255,255,255,0.04)", color: "#E6EEF6" }}
                              onClick={async () => {
                                try {
                                  const res = await fetch(META_URL(d.datasetId), { headers: { Accept: "application/json", ...getAuthHeaders() }});
                                  if (res.ok) {
                                    const meta = await res.json();
                                    await downloadDatasetFile(d.datasetId, meta);
                                  } else {
                                    await downloadDatasetFile(d.datasetId, null);
                                  }
                                } catch (err) {
                                  console.error(err);
                                  setError("Download failed");
                                }
                              }}
                            >
                              Download
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Charts */}
                <div className="rounded-lg p-4 shadow" style={{ background: "linear-gradient(180deg,#0f1724 0%, #0b1220 100%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-slate-100">Generated Charts</div>
                    <div className="text-xs text-slate-300">{charts.length} charts</div>
                  </div>

                  {charts.length === 0 && <div className="text-sm text-slate-300">No charts generated yet.</div>}

                  <div className="space-y-3">
                    <AnimatePresence>
                      {charts.map((c) => (
                        <motion.div
                          key={c.chartId}
                          className="p-3 rounded flex items-start gap-3"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.03)" }}
                          variants={listItem}
                          initial="hidden"
                          animate="enter"
                          exit="exit"
                        >
                          <div className="w-20 h-14 rounded overflow-hidden flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                            {c.thumbnailPath ? (() => {
                              const idx = String(c.thumbnailPath).indexOf("uploads/");
                              const url = idx >= 0 ? `${apiBaseUrl}/${String(c.thumbnailPath).slice(idx)}` : null;
                              return url ? <img src={url} alt={c.name} className="w-full h-full object-cover" /> : <div className="text-xs text-slate-300">Preview</div>;
                            })() : c.chartPayload?.thumbnail ? (
                              <img src={c.chartPayload.thumbnail} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-xs text-slate-300">No preview</div>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-50">{c.name || c.chartType || c.chartId}</div>
                            <div className="text-xs text-slate-300">{c.chartType} • {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}</div>
                            <div className="text-xs text-slate-300">{c.datasetId ? `From: ${c.datasetId}` : ""}</div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button className="text-xs px-2 py-1 rounded" style={{ background: "linear-gradient(90deg,#FDE68A,#FB923C)", color: "#000" }} onClick={() => openChart(c)}>Open</button>
                            <button className="text-xs px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#E6EEF6" }} onClick={() => downloadChartThumbnail(c)}>Download</button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Preview area */}
              <AnimatePresence>
                {(activeDatasetMeta || activeChart) && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="mt-6 rounded p-4 shadow-lg"
                    style={{ background: "linear-gradient(180deg,#0b1220 0%, #08101a 100%)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <button onClick={closePreview} className="px-2 py-1 rounded bg-slate-700 text-xs">← Back</button>
                        <h3 className="text-lg font-medium text-white">{activeDatasetMeta ? (activeDatasetMeta.filename || activeDatasetMeta.datasetId) : (activeChart?.name || activeChart?.chartId)}</h3>
                      </div>
                      <div className="flex gap-2">
                        {activeDatasetMeta && <button className="px-3 py-1 rounded" style={{ background: "linear-gradient(90deg,#6366F1,#06B6D4)", color: "#000" }} onClick={() => downloadDatasetFile(activeDatasetMeta.datasetId, activeDatasetMeta)}>Download file</button>}
                        {activeChart && <button className="px-3 py-1 rounded" style={{ background: "#34D399", color: "#000" }} onClick={() => restoreChart(activeChart)}>Restore</button>}
                      </div>
                    </div>

                    {activeDatasetMeta && (
                      <div>
                        <div className="text-sm text-slate-300 mb-2">Sheets: {activeDatasetMeta.sheets?.map(s => s.name).join(", ")}</div>

                        <div className="overflow-auto border rounded p-2" style={{ background: "rgba(255,255,255,0.01)" }}>
                          {activeDatasetMeta.preview && activeDatasetMeta.preview.length ? (
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr>
                                  {Object.keys(activeDatasetMeta.preview[0]).map((k) => (
                                    <th key={k} className="text-left px-2 py-1 text-xs text-slate-300 border-b">{k}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {activeDatasetMeta.preview.map((row, i) => (
                                  <tr key={i} className="odd:bg-slate-900">
                                    {Object.keys(activeDatasetMeta.preview[0]).map((k) => (
                                      <td key={k} className="px-2 py-1 text-xs">{String(row[k] ?? "")}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-xs text-slate-300 p-4">No preview rows available.</div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeChart && (
                      <div className="flex gap-6">
                        <div className="w-96 h-64 rounded overflow-hidden border">
                          {(() => {
                            if (activeChart.thumbnailPath) {
                              const idx = String(activeChart.thumbnailPath).indexOf("uploads/");
                              const url = idx >= 0 ? `${apiBaseUrl}/${String(activeChart.thumbnailPath).slice(idx)}` : null;
                              if (url) return <img src={url} alt={activeChart.name} className="w-full h-full object-cover" />;
                            }
                            if (activeChart.chartPayload?.thumbnail) {
                              return <img src={activeChart.chartPayload.thumbnail} alt={activeChart.name} className="w-full h-full object-cover" />;
                            }
                            return <div className="p-4 text-xs text-slate-300">No thumbnail</div>;
                          })()}
                        </div>

                        <div className="flex-1">
                          <div className="text-sm text-slate-300 mb-2">Chart type: {activeChart.chartType}</div>
                          <div className="text-xs text-slate-300 mb-2">From dataset: {activeChart.datasetId || "—"}</div>

                          <div className="text-xs text-slate-300">Payload preview</div>
                          <pre className="mt-2 p-2 rounded bg-black/60 text-xs overflow-auto max-h-64 text-white">{JSON.stringify(activeChart.chartPayload || activeChart, null, 2)}</pre>

                          <div className="mt-3 flex gap-2">
                            <button className="px-3 py-1 rounded" style={{ background: "#FDE68A", color: "#000" }} onClick={() => restoreChart(activeChart)}>Restore chart</button>
                            <button className="px-3 py-1 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#fff" }} onClick={() => downloadChartThumbnail(activeChart)}>Download thumbnail</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
