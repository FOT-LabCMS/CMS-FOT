import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const migration = require('../src/database/migrations/20261106000000-add-back-image-url-to-chemicals.cjs');

describe('Back image URL migration', () => {
  const Sequelize = {
    STRING: (length) => `STRING(${length})`,
  };

  it('adds only the back_image_url column when missing', async () => {
    const queryInterface = {
      describeTable: vi.fn().mockResolvedValue({ image_url: { type: 'character varying' } }),
      addColumn: vi.fn(),
      removeColumn: vi.fn(),
    };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledTimes(1);
    expect(queryInterface.addColumn).toHaveBeenCalledWith('chemicals', 'back_image_url', {
      type: 'STRING(1024)',
      allowNull: true,
    });
    expect(queryInterface.removeColumn).not.toHaveBeenCalled();
  });

  it('does not add the column again when it already exists', async () => {
    const queryInterface = {
      describeTable: vi.fn().mockResolvedValue({
        image_url: { type: 'character varying' },
        back_image_url: { type: 'character varying' },
      }),
      addColumn: vi.fn(),
      removeColumn: vi.fn(),
    };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).not.toHaveBeenCalled();
  });

  it('removes only the back_image_url column on down', async () => {
    const queryInterface = {
      describeTable: vi.fn().mockResolvedValue({
        image_url: { type: 'character varying' },
        back_image_url: { type: 'character varying' },
      }),
      addColumn: vi.fn(),
      removeColumn: vi.fn(),
    };

    await migration.down(queryInterface);

    expect(queryInterface.removeColumn).toHaveBeenCalledTimes(1);
    expect(queryInterface.removeColumn).toHaveBeenCalledWith('chemicals', 'back_image_url');
    expect(queryInterface.addColumn).not.toHaveBeenCalled();
  });

  it('does nothing on down when the column does not exist', async () => {
    const queryInterface = {
      describeTable: vi.fn().mockResolvedValue({ image_url: { type: 'character varying' } }),
      addColumn: vi.fn(),
      removeColumn: vi.fn(),
    };

    await migration.down(queryInterface);

    expect(queryInterface.removeColumn).not.toHaveBeenCalled();
  });
});
