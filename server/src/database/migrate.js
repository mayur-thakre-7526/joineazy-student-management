import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, checkDatabaseConnection } from '../config/db.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

/**
 * Initializes the schema_migrations tracking table
 */
async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Executes pending database migrations sequentially
 */
export async function runMigrations() {
  logger.info('Checking database connectivity for migrations...');
  const connCheck = await checkDatabaseConnection();
  if (!connCheck.connected) {
    logger.warn(`Migration blocked: ${connCheck.message}`);
    return {
      success: false,
      blocked: true,
      reason: connCheck.message,
    };
  }

  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);

    // Get previously applied migrations
    const { rows: appliedRows } = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version ASC'
    );
    const appliedVersions = new Set(appliedRows.map((r) => r.version));

    // Read migration files in directory
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      logger.info('No migrations directory found.');
      return { success: true, appliedCount: 0 };
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      const version = file.split('_')[0];
      if (appliedVersions.has(version)) {
        logger.info(`Migration ${file} already applied. Skipping.`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      logger.info(`Applying migration: ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
          [version, file]
        );
        await client.query('COMMIT');
        logger.info(`Migration ${file} applied successfully.`);
        appliedCount++;
      } catch (migrationError) {
        await client.query('ROLLBACK');
        logger.error(`Migration ${file} failed: ${migrationError.message}`);
        throw migrationError;
      }
    }

    logger.info(`All migrations complete. ${appliedCount} new migrations applied.`);
    return { success: true, appliedCount };
  } finally {
    client.release();
  }
}

// Execute directly if run via CLI
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then((result) => {
      if (result.blocked) {
        console.warn(`[MIGRATION RUNNER]: Database connection unavailable. Migrations not executed.`);
        process.exit(0);
      }
      console.log(`[MIGRATION RUNNER]: Success. Applied: ${result.appliedCount}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[MIGRATION RUNNER ERROR]:', err.message);
      process.exit(1);
    });
}
