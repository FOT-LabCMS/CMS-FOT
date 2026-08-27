const multer = require('multer');
const path = require('path');
const { getSdsUploadDir, getImageUploadDir } = require('../services/storageService.js');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (file.fieldname === 'sdsFile') {
        cb(null, getSdsUploadDir());
      } else if (file.fieldname === 'imageFile' || file.fieldname === 'image') {
        cb(null, getImageUploadDir());
      } else {
        cb(new Error(`Unexpected upload field: ${file.fieldname}`));
      }
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'sdsFile') {
      cb(null, `sds-${uniqueSuffix}${ext}`);
    } else {
      cb(null, `chemical-${uniqueSuffix}${ext}`);
    }
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'sdsFile') {
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

    const err = new Error('File type not supported. Only PDF and Word documents are allowed for SDS.');
    err.code = 'UNSUPPORTED_FILE_TYPE';
    return cb(err, false);
  }

  if (file.fieldname === 'imageFile' || file.fieldname === 'image') {
    const allowedImageMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'image/bmp',
      'image/avif',
    ];
    const allowedImageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.avif'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedImageMimeTypes.includes(file.mimetype) || allowedImageExts.includes(ext)) {
      return cb(null, true);
    }

    const err = new Error('Image file type not supported. Allowed formats: JPG, PNG, WEBP, GIF, SVG, BMP, AVIF.');
    err.code = 'UNSUPPORTED_IMAGE_TYPE';
    return cb(err, false);
  }

  const err = new Error(`Unexpected form field: ${file.fieldname}`);
  err.code = 'UNEXPECTED_FIELD';
  cb(err, false);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: fileFilter,
}).fields([
  { name: 'sdsFile', maxCount: 1 },
  { name: 'imageFile', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

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

    // Set convenience references on req for backward compatibility and clean access
    if (req.files) {
      if (req.files.sdsFile && req.files.sdsFile.length > 0) {
        req.file = req.files.sdsFile[0];
        req.sdsFile = req.files.sdsFile[0];
      }
      if (req.files.imageFile && req.files.imageFile.length > 0) {
        req.imageFile = req.files.imageFile[0];
      } else if (req.files.image && req.files.image.length > 0) {
        req.imageFile = req.files.image[0];
      }
    }

    next();
  });
};

module.exports = uploadSds;