const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Use memory storage for serverless (Vercel has read-only filesystem)
const storage = multer.memoryStorage();

// File filter (optional: limit types)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/webm'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, WEBP, MP3, WAV, WEBM are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;
