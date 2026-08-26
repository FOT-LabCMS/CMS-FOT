const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const crypto = require('crypto');

/**
 * Resolve root uploads directory from environment variable or default fallback.
 * Default fallback is backend/uploads (relative to this file: ../../uploads).
 */
const getUploadsRoot = () => {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }
  return path.resolve(__dirname, '../../uploads');
};

/**
 * Get the SDS subfolder path and ensure it exists on disk.
 */
const getSdsUploadDir = () => {
  const sdsDir = path.join(getUploadsRoot(), 'sds');
  if (!fs.existsSync(sdsDir)) {
    fs.mkdirSync(sdsDir, { recursive: true });
  }
  return sdsDir;
};

/**
 * Safely resolve a storage key to an absolute filesystem path within the SDS directory.
 * Prevents directory traversal attacks.
 */
const resolveSdsFilePath = (storageKey) => {
  if (!storageKey || typeof storageKey !== 'string') {
    return null;
  }
  // Strip any directory path components to prevent path traversal
  const safeFilename = path.basename(storageKey.trim());
  if (!safeFilename) {
    return null;
  }

  const sdsDir = getSdsUploadDir();
  const resolvedPath = path.resolve(sdsDir, safeFilename);

  // Security check: ensure resolvedPath is strictly within sdsDir
  const normalizedSdsDir = path.resolve(sdsDir);
  if (!resolvedPath.startsWith(normalizedSdsDir + path.sep) && resolvedPath !== normalizedSdsDir) {
    throw new Error('Security Error: Path traversal attempt detected.');
  }

  return resolvedPath;
};

/**
 * Check if an SDS physical file exists on the server filesystem.
 */
const sdsFileExists = (storageKey) => {
  try {
    const filePath = resolveSdsFilePath(storageKey);
    return filePath ? fs.existsSync(filePath) : false;
  } catch (err) {
    return false;
  }
};

/**
 * Calculate SHA-256 checksum of a file given its absolute path.
 */
const calculateFileChecksum = async (filePath) => {
  const fileBuffer = await fsPromises.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

/**
 * Safely remove an SDS file from disk.
 * Catches errors so server does not crash if file is already missing.
 */
const deleteSdsFile = async (storageKey) => {
  try {
    const filePath = resolveSdsFilePath(storageKey);
    if (filePath && fs.existsSync(filePath)) {
      await fsPromises.unlink(filePath);
      return true;
    }
  } catch (err) {
    console.warn(`[storageService] Warning: Failed to delete SDS file "${storageKey}":`, err.message);
  }
  return false;
};

/**
 * Get the Chemical Images subfolder path and ensure it exists on disk.
 */
const getImageUploadDir = () => {
  const imgDir = path.join(getUploadsRoot(), 'images');
  if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
  }
  return imgDir;
};

/**
 * Safely resolve an image storage path within the images directory.
 */
const resolveImageFilePath = (storageKeyOrUrl) => {
  if (!storageKeyOrUrl || typeof storageKeyOrUrl !== 'string') {
    return null;
  }
  const safeFilename = path.basename(storageKeyOrUrl.trim());
  if (!safeFilename) {
    return null;
  }

  const imgDir = getImageUploadDir();
  const resolvedPath = path.resolve(imgDir, safeFilename);

  const normalizedImgDir = path.resolve(imgDir);
  if (!resolvedPath.startsWith(normalizedImgDir + path.sep) && resolvedPath !== normalizedImgDir) {
    throw new Error('Security Error: Path traversal attempt detected.');
  }

  return resolvedPath;
};

/**
 * Safely remove an image file from disk.
 */
const deleteImageFile = async (storageKeyOrUrl) => {
  try {
    const filePath = resolveImageFilePath(storageKeyOrUrl);
    if (filePath && fs.existsSync(filePath)) {
      await fsPromises.unlink(filePath);
      return true;
    }
  } catch (err) {
    console.warn(`[storageService] Warning: Failed to delete image file "${storageKeyOrUrl}":`, err.message);
  }
  return false;
};

module.exports = {
  getUploadsRoot,
  getSdsUploadDir,
  resolveSdsFilePath,
  sdsFileExists,
  calculateFileChecksum,
  deleteSdsFile,
  getImageUploadDir,
  resolveImageFilePath,
  deleteImageFile,
};


