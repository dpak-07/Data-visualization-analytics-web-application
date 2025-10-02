// middleware/multerConfig.js
const multer = require("multer");
const path = require("path");
const { v4: uuid } = require("uuid");
const { ensureDirSync } = require("./_utils"); // small helper below
const fs = require("fs");

// fallback ensureDir util (if you don't want separate file)
function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
}

function sanitizeName(name = "") {
  return String(name).replace(/[^\w.\- ]+/g, "_");
}

function buildExcelUploader(EXCEL_ROOT) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const userId = req.userId || "anonymous";
      const dest = path.join(EXCEL_ROOT, String(userId));
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const safe = sanitizeName(file.originalname || `upload_${Date.now()}`);
      cb(null, `${Date.now()}_${safe}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname || file.mimetype || "");
    cb(ok ? null : new Error("Only .xlsx .xls .csv allowed for Excel upload"), ok);
  };

  return multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });
}

function buildChartUploader(GENCHARTS_ROOT) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const userId = req.userId || "anonymous";
      const dest = path.join(GENCHARTS_ROOT, String(userId));
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      const safe = sanitizeName(file.originalname || `thumb_${Date.now()}${ext}`);
      cb(null, `${Date.now()}_${uuid()}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const ok = /image\/(png|jpeg|jpg|webp)/i.test(file.mimetype || "") || /\.(png|jpe?g|webp)$/i.test(file.originalname || "");
    cb(ok ? null : new Error("Only image files (png/jpg/webp) allowed for thumbnail"), ok);
  };

  return multer({ storage, fileFilter, limits: { fileSize: 6 * 1024 * 1024 } });
}

module.exports = { buildExcelUploader, buildChartUploader };
