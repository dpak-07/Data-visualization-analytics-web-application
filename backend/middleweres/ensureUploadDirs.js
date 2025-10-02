// middleware/ensureUploadDirs.js
const fs = require("fs");
const path = require("path");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const EXCEL_ROOT = path.join(UPLOAD_ROOT, "exel_uploads");
const GENCHARTS_ROOT = path.join(UPLOAD_ROOT, "gencharts");

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* ignore */ }
}

function ensureUploadDirs(req, res, next) {
  for (const p of [UPLOAD_ROOT, EXCEL_ROOT, GENCHARTS_ROOT]) ensureDir(p);
  // export roots to req for convenience
  req._uploadRoots = { UPLOAD_ROOT, EXCEL_ROOT, GENCHARTS_ROOT };
  next();
}

module.exports = ensureUploadDirs;
