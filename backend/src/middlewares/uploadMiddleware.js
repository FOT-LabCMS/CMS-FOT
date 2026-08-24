const multer = require('multer');
const path = require('path');
const { getSdsUploadDir } = require('../services/storageService.js');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const sdsDir = getSdsUploadDir();
      cb(null, sdsDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `sds-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const allowedExts = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    return cb(null, true);
  }

  const err = new Error('File type not supported. Only PDF and Word documents are allowed.');
  err.code = 'UNSUPPORTED_FILE_TYPE';
  cb(err, false);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: fileFilter,
}).single('sdsFile'); // 'sdsFile' is the name of the form field

const uploadSds = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the 10 MB limit.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.',
      });
    }
    next();
  });
};

module.exports = uploadSds;