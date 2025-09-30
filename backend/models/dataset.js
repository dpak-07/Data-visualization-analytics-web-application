import mongoose from "mongoose";

const DatasetSchema = new mongoose.Schema({
  datasetId: { type: String, unique: true },
  userId: { type: String, index: true },          // e.g., "deepak"
  originalFilename: String,
  filePath: String,                                // absolute/relative disk path
  sheets: [{ name: String, rows: Number }],
  columnsBySheet: mongoose.Schema.Types.Mixed,     // { [sheetName]: string[] }
  preview: { type: Array, default: [] },           // first ~10 rows for UI
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Dataset", DatasetSchema);
