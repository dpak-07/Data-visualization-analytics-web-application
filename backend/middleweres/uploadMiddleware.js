import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to build per-user folder (expects req.user.id from auth)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id || req.headers["x-user-id"] || "anonymous";
    const dest = path.join(__dirname, "..", "uploads", "users", userId);
    fs.mkdir(dest, { recursive: true }, (err) => cb(err, dest));
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
  cb(ok ? null : new Error("Only .xlsx, .xls, .csv files are allowed"), ok);
};

export const uploadDisk = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
