import { describe, it, expect } from 'vitest';

describe('Scan Code Resolver Logic Tests', () => {
  it('extracts batch UUID from URL', () => {
    const rawQuery = 'http://localhost:5173/stock/batches/88776655-4433-2211-00aa-bbccddeeff00';
    const batchUrlMatch = rawQuery.match(/\/stock\/batches\/([0-9a-fA-F-]{36}|[^\/\?\#]+)/);

    expect(batchUrlMatch).not.toBeNull();
    expect(batchUrlMatch[1]).toBe('88776655-4433-2211-00aa-bbccddeeff00');
  });

  it('extracts chemical UUID from URL', () => {
    const rawQuery = 'https://campus.edu/chemicals/11223344-5566-7788-99aa-bbccddeeff00';
    const chemicalUrlMatch = rawQuery.match(/\/chemicals\/([0-9a-fA-F-]{36}|[^\/\?\#]+)/);

    expect(chemicalUrlMatch).not.toBeNull();
    expect(chemicalUrlMatch[1]).toBe('11223344-5566-7788-99aa-bbccddeeff00');
  });

  it('identifies UUID vs regular code', () => {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    
    expect(uuidRegex.test('88776655-4433-2211-00aa-bbccddeeff00')).toBe(true);
    expect(uuidRegex.test('CHE-000001')).toBe(false);
    expect(uuidRegex.test('BST001')).toBe(false);
    expect(uuidRegex.test('BATCH-2026-001')).toBe(false);
  });
});

