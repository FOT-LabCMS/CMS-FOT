import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import { fileURLToPath } from 'url';
import {
  getUploadsRoot,
  getSdsUploadDir,
  resolveSdsFilePath,
  sdsFileExists,
  calculateFileChecksum,
  deleteSdsFile,
} from '../src/services/storageService.js';
import uploadSds from '../src/middlewares/uploadMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SDS Storage Service & Security Tests', () => {
  let tempUploadDir;
  const originalEnvUploadsDir = process.env.UPLOADS_DIR;

  beforeEach(() => {
    tempUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-fot-test-uploads-'));
    process.env.UPLOADS_DIR = tempUploadDir;
  });

  afterEach(async () => {
    if (originalEnvUploadsDir !== undefined) {
      process.env.UPLOADS_DIR = originalEnvUploadsDir;
    } else {
      delete process.env.UPLOADS_DIR;
    }

    try {
      if (fs.existsSync(tempUploadDir)) {
        await fsPromises.rm(tempUploadDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error
    }
  });

  it('resolves uploads root and creates SDS directory if missing', () => {
    const root = getUploadsRoot();
    expect(root).toBe(path.resolve(tempUploadDir));

    const sdsDir = getSdsUploadDir();
    expect(sdsDir).toBe(path.join(path.resolve(tempUploadDir), 'sds'));
    expect(fs.existsSync(sdsDir)).toBe(true);
  });

  it('falls back to default directory when UPLOADS_DIR is not set', () => {
    delete process.env.UPLOADS_DIR;
    const root = getUploadsRoot();
    expect(root).toBe(path.resolve(__dirname, '../uploads'));
  });

  it('calculates SHA-256 checksum correctly', async () => {
    const testFile = path.join(tempUploadDir, 'test-sds.pdf');
    await fsPromises.writeFile(testFile, 'PDF-Sample-Content-For-Testing-12345');

    const checksum = await calculateFileChecksum(testFile);
    expect(checksum).toBeTypeOf('string');
    expect(checksum.length).toBe(64);
  });

  it('safely resolves storage key and detects existing files', async () => {
    const sdsDir = getSdsUploadDir();
    const storageKey = 'sds-123456789.pdf';
    const filePath = path.join(sdsDir, storageKey);
    await fsPromises.writeFile(filePath, '%PDF-1.4 dummy content');

    expect(sdsFileExists(storageKey)).toBe(true);
    expect(resolveSdsFilePath(storageKey)).toBe(filePath);

    expect(sdsFileExists('non-existent-file.pdf')).toBe(false);
  });

  it('prevents path traversal attacks with directory traversal characters', () => {
    const sdsDir = getSdsUploadDir();
    const maliciousKey1 = '../../../etc/passwd';
    const maliciousKey2 = '..\\..\\windows\\system32';
    const maliciousKey3 = 'folder/nested-file.pdf';

    const resolvedPath1 = resolveSdsFilePath(maliciousKey1);
    expect(resolvedPath1).toBe(path.join(sdsDir, 'passwd'));

    const resolvedPath2 = resolveSdsFilePath(maliciousKey2);
    expect(resolvedPath2.startsWith(sdsDir)).toBe(true);

    const resolvedPath3 = resolveSdsFilePath(maliciousKey3);
    expect(resolvedPath3).toBe(path.join(sdsDir, 'nested-file.pdf'));
  });

  it('safely deletes existing SDS files and handles non-existent files gracefully', async () => {
    const sdsDir = getSdsUploadDir();
    const storageKey = 'sds-to-delete.pdf';
    const filePath = path.join(sdsDir, storageKey);
    await fsPromises.writeFile(filePath, 'temp content');

    expect(fs.existsSync(filePath)).toBe(true);

    const deleted = await deleteSdsFile(storageKey);
    expect(deleted).toBe(true);
    expect(fs.existsSync(filePath)).toBe(false);

    const deleteNonExistent = await deleteSdsFile('already-deleted.pdf');
    expect(deleteNonExistent).toBe(false);
  });

  it('adapts dynamically when UPLOADS_DIR changes without code changes', () => {
    const secondaryTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-fot-secondary-uploads-'));
    process.env.UPLOADS_DIR = secondaryTempDir;

    expect(getUploadsRoot()).toBe(path.resolve(secondaryTempDir));
    expect(getSdsUploadDir()).toBe(path.join(path.resolve(secondaryTempDir), 'sds'));
    expect(fs.existsSync(path.join(secondaryTempDir, 'sds'))).toBe(true);

    try {
      fs.rmSync(secondaryTempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('uploadMiddleware is exported as an Express middleware function', () => {
    expect(typeof uploadSds).toBe('function');
  });
});

