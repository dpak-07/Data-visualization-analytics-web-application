// models/datasetModel.js
const { getDb } = require("../config/db");

async function insertDataset(doc) {
  const db = getDb();
  await db.collection("datasets").insertOne(doc);
  return doc;
}

async function findDatasetById(datasetId) {
  const db = getDb();
  return db.collection("datasets").findOne({ datasetId });
}

async function pushChartRefToDataset(datasetId, chartRef) {
  const db = getDb();
  return db.collection("datasets").updateOne(
    { datasetId },
    { $push: { charts: chartRef } }
  );
}

async function listDatasetsForUser(userId, projection = {}) {
  const db = getDb();
  return db.collection("datasets").find({ userId }).project(projection).sort({ createdAt: -1 }).toArray();
}

module.exports = {
  insertDataset,
  findDatasetById,
  pushChartRefToDataset,
  listDatasetsForUser,
};
