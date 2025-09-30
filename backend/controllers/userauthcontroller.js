// controllers/userAuthController.js
const bcrypt = require("bcrypt");
const { getDb } = require("../config/db");
const { generateToken } = require("../utils/jwt");

/**
 * User Signup
 */
async function userSignup(req, res) {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: "All fields required" });

    const db = getDb();
    const col = db.collection("users");

    const existing = await col.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const doc = { username, email, password: hash, role: "user", createdAt: new Date() };

    const result = await col.insertOne(doc);

    const token = generateToken({ id: result.insertedId, email, username, role: "user" });
    return res.status(201).json({ message: "User registered", token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * User Login
 */
async function userLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const db = getDb();
    const col = db.collection("users");

    const user = await col.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken({
      id: user._id,
      email: user.email,
      username: user.username,
      role: "user",
    });

    return res.json({ message: "User login successful", token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = { userSignup, userLogin };
