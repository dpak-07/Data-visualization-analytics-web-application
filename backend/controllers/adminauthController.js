// controllers/adminAuthController.js
const bcrypt = require("bcrypt");
const { getDb } = require("../config/db");
const { generateToken } = require("../utils/jwt");

/**
 * Admin Signup
 */
async function adminSignup(req, res) {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: "All fields required" });

    const db = getDb();
    const col = db.collection("admins");

    const existing = await col.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const doc = { username, email, password: hash, role: "admin", createdAt: new Date() };

    const result = await col.insertOne(doc);

    const token = generateToken({ id: result.insertedId, email, username, role: "admin" });
    return res.status(201).json({ message: "Admin registered", token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * Admin Login
 */
async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const db = getDb();
    const col = db.collection("admins");

    const admin = await col.findOne({ email });
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken({
      id: admin._id,
      email: admin.email,
      username: admin.username,
      role: "admin",
    });

    return res.json({ message: "Admin login successful", token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = { adminSignup, adminLogin };
