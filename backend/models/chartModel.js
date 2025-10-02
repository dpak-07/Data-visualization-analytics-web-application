// models/chartModel.js
const { getDb } = require("../config/db");

async function insertChart(doc) {
  const db = getDb();
  await db.collection("charts").insertOne(doc);
  return doc;
}

async function listChartsForUser(userId, projection = {}) {
  const db = getDb();
  return db.collection("charts").find({ userId }).project(projection).sort({ createdAt: -1 }).toArray();
}

module.exports = { insertChart, listChartsForUser };
