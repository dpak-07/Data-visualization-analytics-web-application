// routes/exel.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const { v4: uuid } = require("uuid");
const { insertDataset } = require("../models/datasetmodel");

const router = express.Router();

// helpers (normalize etc.)
function normalizeValue(v) {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "boolean") return v;
  const n = Number(v);
  if (!Number.isNaN(n) && v !== "") return n;
  const d = new Date(v);
  if (!isNaN(d.getTime()) && /[-/T]/.test(String(v))) return d;
  return String(v);
}

function getNormalizedRows(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: null, raw: true });
  return rows.map((r) => {
    const o = {};
    for (const k of Object.keys(r)) o[k] = normalizeValue(r[k]);
    return o;
  });
}

function listColumnsFromRows(rows) {
  const set = rows.reduce((s, r) => {
    Object.keys(r).forEach((k) => s.add(k));
    return s;
  }, new Set());
  return Array.from(set);
}

router.post("/", async (req, res) => {
  // this route expects multer middleware to have placed file in req.file
  try {
    if (!req.file || !req.file.path) return res.status(400).json({ error: "No file uploaded (field 'file')" });

    const filePath = req.file.path;
    const originalFilename = req.file.originalname || req.file.filename || "upload";
    const datasetId = uuid();

    const buf = fs.readFileSync(filePath);
    const wb = xlsx.read(buf, { type: "buffer", cellDates: true });

    const sheets = [];
    const columnsBySheet = {};
    const preview = [];

    for (const sheetName of wb.SheetNames) {
      const rows = getNormalizedRows(wb, sheetName);
      const columns = listColumnsFromRows(rows);
      sheets.push({ name: sheetName, rows: rows.length });
      columnsBySheet[sheetName] = columns;
      if (preview.length < 10) {
        const needed = 10 - preview.length;
        preview.push(...rows.slice(0, needed).map((r) => {
          const out = {};
          for (const k of Object.keys(r)) out[k] = r[k] instanceof Date ? r[k].toISOString() : r[k];
          return out;
        }));
      }
    }

    let parsedMetadata = null;
    if (req.body?.metadata) {
      try { parsedMetadata = JSON.parse(req.body.metadata); } catch { parsedMetadata = req.body.metadata; }
    }

    const doc = {
      datasetId,
      userId: req.userId,
      originalFilename,
      filePath,
      sheets,
      columnsBySheet,
      preview,
      metadata: parsedMetadata || null,
      createdAt: new Date(),
    };

    await insertDataset(doc);

    return res.json({ datasetId, sheets, columnsBySheet, preview, file: { filePath, originalFilename } });
  } catch (err) {
    console.error("exel POST failed:", err);
    return res.status(500).json({ error: "exel POST failed", details: err.message });
  }
});

module.exports = router;
