// routes/auth_user_routes.js
const express = require("express");
const { userSignup, userLogin } = require("../controllers/userauthcontroller");
const { verifyToken } = require("../middleweres/authMiddleware");

const router = express.Router();

// Public
router.post("/signup", userSignup);
router.post("/login", userLogin);

// Example protected user route
router.get("/profile", verifyToken, (req, res) => {
  res.json({ message: "Hello User", user: req.user });
});

module.exports = router;
