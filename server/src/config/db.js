import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

// PostgreSQL connection pool configuration
export const pool = new Pool(
  env.DB.connectionString
    ? { connectionString: env.DB.connectionString }
    : {
        host: env.DB.host,
        port: env.DB.port,
        database: env.DB.database,
        user: env.DB.user,
        password: env.DB.password,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

// Pool event listeners for diagnostic logging
pool.on('error', (err) => {
  console.error('[Database Pool Error]: Unexpected error on idle client', err.message);
});

/**
 * Diagnostic helper to check database connectivity without unhandled rejection
 */
export async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() AS current_time');
    client.release();
    return {
      connected: true,
      timestamp: result.rows[0].current_time,
      message: 'PostgreSQL database connected successfully',
    };
  } catch (error) {
    const errorDetail = error.message || error.code || 'Host unreachable or server not running';
    return {
      connected: false,
      message: `Database connection unavailable: ${errorDetail}`,
    };
  }
}
