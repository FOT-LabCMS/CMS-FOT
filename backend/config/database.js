const path = require('node:path');
const dotenv = require('dotenv');

const nodeEnv = process.env.NODE_ENV || 'development';
const allowedEnvironments = new Set(['development', 'test', 'production']);

if (!allowedEnvironments.has(nodeEnv)) {
  throw new Error(`Unsupported NODE_ENV "${nodeEnv}"`);
}

dotenv.config({
  path: path.resolve(process.cwd(), `.env.${nodeEnv}`),
});

const url =
  process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    `MIGRATION_DATABASE_URL or DATABASE_URL is missing from .env.${nodeEnv}`,
  );
}

process.env.SEQUELIZE_DATABASE_URL = url;

const sslEnabled = process.env.DB_SSL === 'true';
const rejectUnauthorized =
  process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';

const common = {
  use_env_variable: 'SEQUELIZE_DATABASE_URL',
  dialect: 'postgres',
  logging: console.log,

  dialectOptions: sslEnabled
    ? {
        ssl: {
          require: true,
          rejectUnauthorized,
        },
      }
    : {},

  migrationStorage: 'sequelize',
  migrationStorageTableName: 'sequelize_meta',

  seederStorage: 'sequelize',
  seederStorageTableName: 'sequelize_seed_meta',

  pool: {
    max: Number.parseInt(process.env.DB_POOL_MAX || '5', 10),
    min: Number.parseInt(process.env.DB_POOL_MIN || '0', 10),
    idle: Number.parseInt(process.env.DB_POOL_IDLE_MS || '10000', 10),
    acquire: Number.parseInt(process.env.DB_POOL_ACQUIRE_MS || '30000', 10),
  },
};

module.exports = {
  development: common,
  test: common,
  production: common,
};