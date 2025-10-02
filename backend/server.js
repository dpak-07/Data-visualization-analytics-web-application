// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { connectDB } = require("./config/db");
const apiRouter = require("./routes");

const app = express();

// === Hit tracker state ===
let hitCount = 0;
const logFile = path.join(__dirname, "hitlog.txt");

// middleware
app.use(cors());

// Increase JSON and urlencoded limits for large chart payloads (adjust if necessary)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// 🔥 Request logger / hit tracker
app.use((req, res, next) => {
  hitCount++;

  const logEntry = `[${new Date().toISOString()}] #${hitCount} ${req.method} ${req.originalUrl}\n`;
  fs.appendFile(logFile, logEntry, (err) => {
    if (err) console.error("❌ Error writing hit log:", err);
  });

  console.log(logEntry.trim());
  next();
});

// serve uploads folder (dev only — protect in production)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// mount API routes
app.use("/api", apiRouter);

// health check
app.get("/health", (req, res) => res.json({ ok: true, hits: hitCount }));

// global error handler (simple JSON response)
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
