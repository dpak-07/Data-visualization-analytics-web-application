// config/db.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;   // put your Mongo URI in .env
const DB_NAME = process.env.DB_NAME || "myDatabase"; 

let client;
let db;

/**
 * Connect once at app startup
 */
async function connectDB() {
  if (db) return db; // reuse if already connected

  if (!MONGO_URI) {
    throw new Error("❌ MONGO_URI not found in .env");
  }

  client = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();
  db = client.db(DB_NAME);
  console.log(`✅ Connected to MongoDB: ${DB_NAME}`);
  return db;
}

/**
 * Get DB instance (make sure connectDB() was called in server.js first)
 */
function getDb() {
  if (!db) {
    throw new Error("DB not initialized. Call connectDB() first.");
  }
  return db;
}

module.exports = { connectDB, getDb };
