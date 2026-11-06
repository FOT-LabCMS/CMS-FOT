import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import uploadSds from '../src/middlewares/uploadMiddleware.js';
import { getImageUploadDir } from '../src/services/storageService.js';

describe('Chemical front and back image upload fields', () => {
  let tempUploadDir;
  let app;
  const originalEnvUploadsDir = process.env.UPLOADS_DIR;

  beforeEach(() => {
    tempUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-fot-image-upload-'));
    process.env.UPLOADS_DIR = tempUploadDir;

    app = express();
    app.post('/upload', uploadSds, (req, res) => {
      res.status(200).json({
        success: true,
        imageFile: req.imageFile?.filename || null,
        backImageFile: req.backImageFile?.filename || null,
      });
    });
  });

  afterEach(() => {
    if (originalEnvUploadsDir !== undefined) {
      process.env.UPLOADS_DIR = originalEnvUploadsDir;
    } else {
      delete process.env.UPLOADS_DIR;
    }

    try {
      if (fs.existsSync(tempUploadDir)) {
        fs.rmSync(tempUploadDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it('accepts independent front and back image files', async () => {
    const response = await request(app)
      .post('/upload')
      .attach('imageFile', Buffer.from('front-image'), {
        filename: 'front.png',
        contentType: 'image/png',
      })
      .attach('backImageFile', Buffer.from('back-image'), {
        filename: 'back.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(200);
    expect(response.body.imageFile).toMatch(/^chemical-\d+-\d+\.png$/);
    expect(response.body.backImageFile).toMatch(/^chemical-back-\d+-\d+\.png$/);

    const imageDir = getImageUploadDir();
    expect(fs.existsSync(path.join(imageDir, response.body.imageFile))).toBe(true);
    expect(fs.existsSync(path.join(imageDir, response.body.backImageFile))).toBe(true);
  });

  it('accepts only a back image without requiring a front image', async () => {
    const response = await request(app)
      .post('/upload')
      .attach('backImageFile', Buffer.from('back-image'), {
        filename: 'back.webp',
        contentType: 'image/webp',
      });

    expect(response.status).toBe(200);
    expect(response.body.imageFile).toBeNull();
    expect(response.body.backImageFile).toMatch(/^chemical-back-\d+-\d+\.webp$/);
  });

  it('rejects unsupported back image file types', async () => {
    const response = await request(app)
      .post('/upload')
      .attach('backImageFile', Buffer.from('not-an-image'), {
        filename: 'back.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Image file type not supported');
  });
});
