// routes/upload_routes.js

const express = require('express');
const router = express.Router();

const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleweres/authMiddleware'); // Your existing authentication middleware
const uploadMiddleware = require('../middleweres/uploadMiddleware'); // The upload middleware we just created

// Define the file upload route
// This route is protected, meaning a user must be logged in.
// The flow is: 1. authMiddleware -> 2. uploadMiddleware -> 3. uploadController
router.post(
  '/upload',
  authMiddleware, 
  uploadMiddleware.single('excelFile'), // 'excelFile' must match the form field name on the frontend
  uploadController.processExcelFile
);

module.exports = router;