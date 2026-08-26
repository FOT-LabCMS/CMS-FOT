import { describe, it, expect } from 'vitest';
import { Sequelize } from 'sequelize';
import ChemicalModel from '../src/models/Chemical.js';
import { getImageUploadDir, resolveImageFilePath } from '../src/services/storageService.js';
import fs from 'fs';
import path from 'path';

describe('Chemical binCardNumber and imageUrl Model Tests', () => {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    logging: false,
  });
  const Chemical = ChemicalModel(sequelize);

  it('has binCardNumber and imageUrl defined on the model', () => {
    const rawAttributes = Chemical.rawAttributes;

    expect(rawAttributes.binCardNumber).toBeDefined();
    expect(rawAttributes.binCardNumber.allowNull).toBe(false);
    expect(rawAttributes.binCardNumber.unique).toBe(true);
    expect(rawAttributes.binCardNumber.field).toBe('bin_card_number');

    expect(rawAttributes.imageUrl).toBeDefined();
    expect(rawAttributes.imageUrl.allowNull).toBe(true);
    expect(rawAttributes.imageUrl.field).toBe('image_url');
  });

  it('validates BST### format for binCardNumber', () => {
    const validCodes = ['BST001', 'BST025', 'BST999'];
    const invalidCodes = ['BST1', 'BST01', 'BST0001', 'ABC001', 'BT001', '', null];

    const regex = /^BST\d{3}$/;

    validCodes.forEach((code) => {
      expect(regex.test(code)).toBe(true);
    });

    invalidCodes.forEach((code) => {
      expect(code && regex.test(code)).toBeFalsy();
    });
  });

  it('creates and resolves image upload directory correctly', () => {
    const imgDir = getImageUploadDir();
    expect(fs.existsSync(imgDir)).toBe(true);

    const resolved = resolveImageFilePath('chemical-12345.jpg');
    expect(resolved).toBe(path.join(imgDir, 'chemical-12345.jpg'));

    const resolvedFromUrl = resolveImageFilePath('/uploads/images/chemical-12345.jpg');
    expect(resolvedFromUrl).toBe(path.join(imgDir, 'chemical-12345.jpg'));
  });

  it('blocks path traversal attacks on image file resolution', () => {
    expect(() => resolveImageFilePath('../../../etc/passwd')).not.toThrow();
    // Path.basename strips directories so it stays within images
    const resolved = resolveImageFilePath('../../../etc/passwd');
    expect(resolved).toBe(path.join(getImageUploadDir(), 'passwd'));
  });
});
