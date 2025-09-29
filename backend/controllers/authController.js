// controllers/authController.js
const bcrypt = require('bcrypt');
const { getAdminDb } = require('../config/config');
const { generateToken } = require('../utils/jwt');

// REGISTER
async function register(req, res) {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    const db = getAdminDb();
    const existing = await db.collection('admins').findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = {
      username,
      email,
      password: hashedPassword,
      role: 'admin'
    };

    const result = await db.collection('admins').insertOne(admin);

    const token = generateToken({ id: result.insertedId, email, username });

    return res.status(201).json({ message: 'Registered successfully', token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// LOGIN
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const db = getAdminDb();
    const admin = await db.collection('admins').findOne({ email });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken({ id: admin._id, email: admin.email, username: admin.username });

    return res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { register, login };
