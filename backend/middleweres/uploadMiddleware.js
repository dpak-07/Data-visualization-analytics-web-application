// middleweres/uploadMiddleware.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_FOLDER = 'uploads';

// This line ensures the root 'uploads' directory exists.
if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // This assumes your authMiddleware adds a 'user' object with an 'id' to the request.
    // This is the secure way to identify the user.
    const userId = req.user.id; 
    if (!userId) {
        return cb(new Error('Authentication error: User ID not found.'), false);
    }

    const userFolderPath = path.join(UPLOADS_FOLDER, `user_${userId}`);
    // Create the user-specific directory if it doesn't exist.
    fs.mkdirSync(userFolderPath, { recursive: true }); 
    cb(null, userFolderPath);
  },
  filename: (req, file, cb) => {
    // Create a unique filename to avoid naming conflicts.
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, path.basename(file.originalname, fileExtension) + '-' + uniqueSuffix + fileExtension);
  }
});

// File filter to ensure only excel files are uploaded
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only Excel files (.xls, .xlsx) are allowed.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
});

module.exports = upload;