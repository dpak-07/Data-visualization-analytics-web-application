// controllers/uploadController.js

const xlsx = require('xlsx');
// const File = require('../models/fileModel'); // Uncomment this if you create the optional File model

const processExcelFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File was not uploaded.' });
    }

    // Read the uploaded file from the path where multer saved it
    const workbook = xlsx.readFile(req.file.path);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    // --- Optional: Save file metadata to your database ---
    // const newFile = new File({
    //   fileName: req.file.filename,
    //   originalName: req.file.originalname,
    //   filePath: req.file.path,
    //   fileSize: req.file.size,
    //   uploadedBy: req.user.id, // Associate the file with the logged-in user
    // });
    // await newFile.save();
    // ----------------------------------------------------

    // Send the extracted data back to the frontend
    res.status(200).json({
      message: 'File uploaded and processed successfully!',
      data: jsonData
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ message: 'An error occurred during file processing.' });
  }
};

module.exports = {
  processExcelFile,
};