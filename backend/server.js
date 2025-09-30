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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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

// connect DB once at startup
connectDB().catch((err) => {
  console.error("Mongo connection failed:", err);
  process.exit(1);
});

// routes
app.use("/api", apiRouter);

// health check
app.get("/health", (req, res) => res.json({ ok: true, hits: hitCount }));

// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API running at http://localhost:${PORT}`);
});
