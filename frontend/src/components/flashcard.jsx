// AdminDashboard.jsx
import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

/*
  Updated AdminDashboard.jsx
  - White X/Y axis labels & ticks on all charts
  - Vibrant, bright bar/line colors
  - User activity preview line uses pure white stroke
  - Keeps CSV/PDF export, chart image downloads, profile modal, history delete, snapshot CSV
*/

const gradientBtn =
  "bg-gradient-to-r from-[#2dd4bf] via-[#facc15] to-[#10b981] text-black font-semibold rounded-lg px-4 py-2 shadow-md";
const ghostBtn = "bg-transparent border border-white/20 text-white px-3 py-1 rounded-md";

// Bright, vibrant palette (reused for bars and lines)
const COLORS = [
  "#ef4444", // red
  "#10b981", // green
  "#3b82f6", // blue
  "#f59e0b", // yellow
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

// Utility: create partially transparent versions for backgrounds
function rgba(hex, alpha = 0.15) {
  // hex like "#rrggbb"
  const bigint = parseInt(hex.replace("#", ""), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function randomChartSnapshot(name) {
  const labels = Array.from({ length: 6 }, (_, i) => `T-${6 - i}`);
  const data = labels.map(() => Math.floor(Math.random() * 100) + 5);
  return {
    labels,
    datasets: [
      {
        label: name,
        data,
        borderColor: "#ffffff", // white line for preview
        backgroundColor: "rgba(255,255,255,0.08)",
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  };
}

function makeUsers() {
  const users = [];
  for (let i = 1; i <= 12; i++) {
    const history = Array.from({ length: Math.floor(Math.random() * 6) }, (_, k) => {
      const action = ["uploaded sheet", "generated chart", "downloaded report"][Math.floor(Math.random() * 3)];
      const item = { ts: new Date(Date.now() - (k + 1) * 3600 * 1000).toISOString(), action, meta: { rows: Math.floor(Math.random() * 1000) } };
      if (action === "generated chart" && Math.random() > 0.4) item.chartSnapshot = randomChartSnapshot(`U${i}-chart-${k}`);
      return item;
    });
    users.push({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      joined: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
      chartsGenerated: Math.floor(Math.random() * 20),
      chartsDownloaded: Math.floor(Math.random() * 10),
      history,
    });
  }
  return users;
}

// Base chart options: white axes/ticks, white legend/tooltips text
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
    x: {
      ticks: { color: "#ffffff" },
      grid: { color: "rgba(255,255,255,0.06)" },
      title: { color: "#ffffff", display: false },
    },
    y: {
      ticks: { color: "#ffffff" },
      grid: { color: "rgba(255,255,255,0.06)" },
      title: { color: "#ffffff", display: false },
    },
  },
};

export default function AdminDashboard() {
  const [users, setUsers] = useState(makeUsers());
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [compact, setCompact] = useState(true);
  const chartRefs = useRef({});

  const filtered = useMemo(
    () => users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())),
    [users, query]
  );

  const totals = useMemo(
    () => ({
      totalUsers: users.length,
      totalChartsGenerated: users.reduce((s, u) => s + u.chartsGenerated, 0),
      totalChartsDownloaded: users.reduce((s, u) => s + u.chartsDownloaded, 0),
    }),
    [users]
  );

  function addUser() {
    if (!newUserEmail) return;
    const id = (users[0]?.id || 0) + 1;
    const newUser = { id, name: newUserEmail.split("@")[0], email: newUserEmail, joined: new Date().toISOString().slice(0, 10), chartsGenerated: 0, chartsDownloaded: 0, history: [] };
    setUsers((prev) => [newUser, ...prev]);
    setNewUserEmail("");
  }

  function deleteUser(id) {
    if (!confirm("Delete user? This action is irreversible.")) return;
    setUsers((prev) => prev.filter((p) => p.id !== id));
    setShowProfile(false);
  }

  function deleteHistoryEntry(userId, idx) {
    if (!confirm("Delete this history entry?")) return;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, history: u.history.filter((_, i) => i !== idx) } : u)));
    if (selectedUser?.id === userId) {
      const updated = users.find((u) => u.id === userId);
      setSelectedUser(updated);
    }
  }

  function openProfile(user) {
    setSelectedUser(user);
    setShowProfile(true);
  }

  function exportCSV() {
    const headers = ["id", "name", "email", "joined", "chartsGenerated", "chartsDownloaded"];
    const rows = users.map((u) => [u.id, u.name, u.email, u.joined, u.chartsGenerated, u.chartsDownloaded]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    try {
      // eslint-disable-next-line
      const jsPDFModule = await import(/* @vite-ignore */ "jspdf");
      const { jsPDF } = jsPDFModule;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Users summary", 14, 20);
      doc.setFontSize(10);
      let y = 30;
      users.slice(0, 30).forEach((u) => {
        doc.text(`${u.id}. ${u.name} (${u.email}) — gen:${u.chartsGenerated} down:${u.chartsDownloaded}`, 14, y);
        y += 6;
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
      });
      doc.save("users_summary.pdf");
    } catch (e) {
      console.warn("jspdf not available:", e);
      alert("PDF export requires jspdf. Install it with: npm i jspdf");
    }
  }

  function downloadChartImage(refKey, filename = "chart.png") {
    const chart = chartRefs.current[refKey];
    if (!chart) return alert("Chart not available");
    try {
      // Chart.js instance provides toBase64Image()
      const url = typeof chart.toBase64Image === "function" ? chart.toBase64Image() : chart.canvas?.toDataURL("image/png");
      if (!url) throw new Error("no image url");
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
    } catch (e) {
      alert("Unable to download chart image.");
      console.error(e);
    }
  }

  function downloadSnapshotCSV(snapshot, name = "snapshot.csv") {
    const headers = ["label", "value"];
    const rows = snapshot.labels.map((l, i) => [l, snapshot.datasets[0].data[i]]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Build chart datasets with vibrant colors
  const chartsData = {
    users: {
      labels: users.map((u) => u.name),
      datasets: [
        {
          label: "Charts Generated",
          data: users.map((u) => u.chartsGenerated),
          backgroundColor: users.map((_, i) => rgba(COLORS[i % COLORS.length], 0.22)),
          borderColor: users.map((_, i) => COLORS[i % COLORS.length]),
          borderWidth: 2,
        },
      ],
    },
    summaryBar: {
      labels: ["Users", "Charts Gen", "Charts Down"],
      datasets: [
        {
          label: "Counts",
          data: [totals.totalUsers, totals.totalChartsGenerated, totals.totalChartsDownloaded],
          backgroundColor: [rgba(COLORS[1], 0.9), rgba(COLORS[0], 0.9), rgba(COLORS[2], 0.9)],
          borderColor: ["#ffffff", "#ffffff", "#ffffff"],
          borderWidth: 2,
        },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071233] to-[#041026] text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-white/70">Manage users, view history, and audit charts.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
              <input className="bg-transparent outline-none text-white placeholder-white/60" placeholder="Search users or email" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button className={ghostBtn} onClick={() => setQuery("")}>
              Clear
            </button>
            <button className={gradientBtn} onClick={() => window.alert("Quick action: View system logs")}>
              System Logs
            </button>
          </div>
        </header>

        <main className="grid grid-cols-12 gap-6">
          <section className="col-span-8 bg-white/4 rounded-2xl p-6 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Overview</h2>
              <div className="flex items-center gap-3">
                <input className="bg-transparent border border-white/10 rounded-md px-3 py-1 text-white placeholder-white/50" placeholder="add new user email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
                <button className="px-4 py-2 rounded-md bg-gradient-to-r from-blue-400 to-indigo-500 font-semibold" onClick={addUser}>Add user</button>
                <button className="px-3 py-1 rounded-md bg-white/6" onClick={() => setCompact((c) => !c)}>{compact ? "Table view" : "Compact view"}</button>
                <button className="px-3 py-1 rounded-md bg-white/6" onClick={exportCSV}>Export CSV</button>
                <button className="px-3 py-1 rounded-md bg-white/6" onClick={exportPDF}>Export PDF</button>
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

            <div className="mb-6">
              <h3 className="mb-2 text-lg font-medium">Activity chart</h3>
              <div className="bg-white/5 rounded-xl p-4">
                <div style={{ height: 320 }}>
                  <Line data={chartsData.users} options={{ ...baseChartOptions, scales: { ...baseChartOptions.scales, y: { ...baseChartOptions.scales.y, beginAtZero: true } } }} />
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-1 rounded-md bg-white/6" onClick={() => downloadChartImage("overview-users", "users_activity.png")}>Download image</button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-medium">Summary</h3>
              <div className="bg-white/5 rounded-xl p-4">
                <div style={{ height: 320 }}>
                  <Bar data={chartsData.summaryBar} options={baseChartOptions} />
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-1 rounded-md bg-white/6" onClick={() => downloadChartImage("summary-bar", "summary_bar.png")}>Download image</button>
                </div>
              </div>
            </div>
          </section>

          <aside className="col-span-4">
            <div className="bg-white/3 rounded-2xl p-4 mb-6">
              <h3 className="text-lg font-semibold mb-2">Users</h3>
              <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
                {compact ? (
                  filtered.map((u) => (
                    <motion.div key={u.id} whileHover={{ scale: 1.02 }} className="flex items-center justify-between bg-white/4 p-3 rounded-md">
                      <div>
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-xs text-white/60">{u.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1 rounded-md bg-white/6 text-sm" onClick={() => openProfile(u)}>Profile</button>
                        <button className="px-3 py-1 rounded-md bg-red-500/80 text-sm" onClick={() => deleteUser(u.id)}>Delete</button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-white/70">
                      <tr><th>Name</th><th>Email</th><th>Gen</th><th>Down</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {filtered.map((u) => (
                        <tr key={u.id} className="border-t border-white/6">
                          <td className="py-2">{u.name}</td>
                          <td>{u.email}</td>
                          <td>{u.chartsGenerated}</td>
                          <td>{u.chartsDownloaded}</td>
                          <td className="py-2">
                            <button className="px-2 py-1 rounded bg-white/6 mr-2" onClick={() => openProfile(u)}>Open</button>
                            <button className="px-2 py-1 rounded bg-red-600" onClick={() => deleteUser(u.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {filtered.length === 0 && <div className="text-sm text-white/60">No users found.</div>}
              </div>
            </div>

            <div className="bg-white/3 rounded-2xl p-4">
              <h3 className="text-lg font-semibold mb-2">Recent charts</h3>
              <ul className="text-sm space-y-2">
                {users.slice(0, 5).map((u) => (
                  <li key={u.id} className="flex items-center justify-between">
                    <div className="text-sm">{u.name}</div>
                    <div className="text-xs text-white/60">{u.chartsGenerated} gen</div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </main>

        {/* off-screen chart renders to capture refs for download */}
        <div style={{ position: "absolute", left: -9999, top: 0, width: 800, height: 600, overflow: "hidden" }} aria-hidden>
          <div>
            <Line
              ref={(el) => { if (el && (el.chartInstance || el.chart)) chartRefs.current["overview-users"] = el.chartInstance || el.chart; }}
              data={chartsData.users}
              options={baseChartOptions}
            />
            <Bar
              ref={(el) => { if (el && (el.chartInstance || el.chart)) chartRefs.current["summary-bar"] = el.chartInstance || el.chart; }}
              data={chartsData.summaryBar}
              options={baseChartOptions}
            />
          </div>
        </div>

        <AnimatePresence>
          {showProfile && selectedUser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-40">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-[920px] max-w-full bg-gradient-to-br from-[#041226] to-[#06243a] rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div style={{ flex: 1 }}>
                    <h2 className="text-2xl font-bold">{selectedUser.name}</h2>
                    <p className="text-sm text-white/60">{selectedUser.email} • Joined {selectedUser.joined}</p>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-white/5">
                        <div className="text-xs text-white/70">Charts generated</div>
                        <div className="font-bold text-lg">{selectedUser.chartsGenerated}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <div className="text-xs text-white/70">Charts downloaded</div>
                        <div className="font-bold text-lg">{selectedUser.chartsDownloaded}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <div className="text-xs text-white/70">History items</div>
                        <div className="font-bold text-lg">{selectedUser.history.length}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <button className={ghostBtn} onClick={() => setShowProfile(false)}>Close</button>
                    <button className="px-4 py-2 rounded-md bg-red-600" onClick={() => deleteUser(selectedUser.id)}>Delete</button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="font-semibold mb-2">User activity</h4>
                    <div className="max-h-[260px] overflow-auto text-sm space-y-2">
                      {selectedUser.history.map((h, idx) => (
                        <div key={idx} className="bg-white/3 p-2 rounded flex items-start gap-3">
                          <div className="flex-1">
                            <div className="text-xs text-white/60">{new Date(h.ts).toLocaleString()}</div>
                            <div className="font-medium">{h.action}</div>
                            <div className="text-xs text-white/60">rows: {h.meta?.rows ?? "-"}</div>

                            {h.chartSnapshot && (
                              <div className="mt-2">
                                <div className="text-xs text-white/60 mb-1">Chart preview</div>
                                <div className="w-full h-32 bg-white/3 rounded flex items-center justify-center">
                                  <div style={{ width: "100%", height: 120 }}>
                                    <Line
                                      ref={(el) => { if (el && (el.chartInstance || el.chart)) chartRefs.current[`u${selectedUser.id}-h${idx}`] = el.chartInstance || el.chart; }}
                                      data={h.chartSnapshot}
                                      options={{
                                        ...baseChartOptions,
                                        plugins: { legend: { display: false } },
                                        elements: { line: { borderColor: "#ffffff", borderWidth: 2 }, point: { radius: 2, backgroundColor: "#ffffff" } },
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="mt-2 flex gap-2">
                                  <button className="px-3 py-1 rounded bg-white/6" onClick={() => downloadChartImage(`u${selectedUser.id}-h${idx}`, `${selectedUser.name}_snapshot_${idx}.png`)}>Download chart</button>
                                  <button className="px-3 py-1 rounded bg-white/6" onClick={() => downloadSnapshotCSV(h.chartSnapshot, `${selectedUser.name}_snapshot_${idx}.csv`)}>Download CSV</button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <button className="px-2 py-1 rounded bg-red-600 text-sm" onClick={() => deleteHistoryEntry(selectedUser.id, idx)}>Delete</button>
                          </div>
                        </div>
                      ))}
                      {selectedUser.history.length === 0 && <div className="text-white/60">No history yet.</div>}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="font-semibold mb-2">Charts snapshot</h4>
                    <div className="h-[260px] flex flex-col gap-3">
                      <div className="flex-1 bg-white/3 rounded p-3 flex items-center justify-center">
                        <Bar
                          data={{
                            labels: ["Generated", "Downloaded"],
                            datasets: [
                              {
                                label: selectedUser.name,
                                data: [selectedUser.chartsGenerated, selectedUser.chartsDownloaded],
                                backgroundColor: [rgba(COLORS[1], 0.9), rgba(COLORS[0], 0.9)],
                                borderColor: ["#ffffff", "#ffffff"],
                                borderWidth: 2,
                              },
                            ],
                          }}
                          options={baseChartOptions}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 rounded bg-white/6" onClick={() => downloadChartImage(`profile-bar-${selectedUser.id}`, `${selectedUser.name}_summary.png`)}>Download summary image</button>
                        <button
                          className="px-3 py-1 rounded bg-white/6"
                          onClick={() => {
                            const csv = `label,value\nGenerated,${selectedUser.chartsGenerated}\nDownloaded,${selectedUser.chartsDownloaded}`;
                            const blob = new Blob([csv], { type: "text/csv" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${selectedUser.name}_summary.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          Download summary CSV
                        </button>
                      </div>
                    </div>

                    {/* hidden render so we can capture ref */}
                    <div style={{ position: "absolute", left: -9999, top: 0 }} aria-hidden>
                      <Bar
                        ref={(el) => { if (el && (el.chartInstance || el.chart)) chartRefs.current[`profile-bar-${selectedUser.id}`] = el.chartInstance || el.chart; }}
                        data={{
                          labels: ["Generated", "Downloaded"],
                          datasets: [
                            {
                              label: selectedUser.name,
                              data: [selectedUser.chartsGenerated, selectedUser.chartsDownloaded],
                              backgroundColor: [rgba(COLORS[1], 0.9), rgba(COLORS[0], 0.9)],
                              borderColor: ["#ffffff", "#ffffff"],
                              borderWidth: 2,
                            },
                          ],
                        }}
                        options={baseChartOptions}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
