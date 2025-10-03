// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { connectDB } = require("./config/db");

// NOTE: your repo uses the folder name "middleweres" — keep that to avoid breaking requires
const ensureUploadDirs = require("./middleweres/ensureUploadDirs");
const { buildExcelUploader, buildChartUploader } = require("./middleweres/multerConfig");

const apiRouter = require("./routes");

const app = express();

// === Hit tracker state ===
let hitCount = 0;
const logFile = path.join(__dirname, "hitlog.txt");

// middleware
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// request logger / hit tracker
app.use((req, res, next) => {
  hitCount++;
  const logEntry = `[${new Date().toISOString()}] #${hitCount} ${req.method} ${req.originalUrl}\n`;
  fs.appendFile(logFile, logEntry, (err) => { if (err) console.error("Error writing hit log:", err); });
  console.log(logEntry.trim());
  next();
});

// ensure upload dirs exist and expose them via req._uploadRoots
app.use(ensureUploadDirs);

// serve uploads (dev only)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// build multer uploaders pointing at the ensured upload roots.
// We can't access req._uploadRoots here synchronously, so use the known upload folder structure you have in repo.
const EXCEL_ROOT = path.join(__dirname, "uploads", "users"); // your repo uses uploads/users/anonymous currently
const GENCHARTS_ROOT = path.join(__dirname, "uploads", "gencharts");
const excelUploader = buildExcelUploader(path.join(EXCEL_ROOT));
const chartUploader = buildChartUploader(path.join(GENCHARTS_ROOT));

// IMPORTANT: mount multer middleware directly on the exact paths that accept form-data
// so req.file is available in the route handlers.
app.use("/api/exel", excelUploader.single("file"), require("./routes/exel"));
app.use("/api/charts", chartUploader.single("file"), require("./routes/charts"));

// Mount the rest of the API (datasets, upload helpers, history, admin, auth)
app.use("/api", apiRouter);

// health
app.get("/health", (req, res) => res.json({ ok: true, hits: hitCount }));

// global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// start server only after DB is connected
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 API running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Mongo connection failed:", err);
    process.exit(1);
  }
}

start();
