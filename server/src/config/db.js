import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

/**
 * Compute TLS/SSL configuration securely with server certificate verification.
 * Neon, Render, Supabase, and AWS RDS use public CAs (Let's Encrypt / DigiCert)
 * which are natively verified by Node.js system root CAs.
 * rejectUnauthorized is strictly true in production to prevent MITM attacks.
 */
function getSslConfiguration() {
  const connStr = (env.DB.connectionString || '').toLowerCase();
  const isCloudProvider =
    connStr.includes('neon.tech') ||
    connStr.includes('render.com') ||
    connStr.includes('supabase.co') ||
    connStr.includes('amazonaws.com') ||
    connStr.includes('sslmode=require') ||
    connStr.includes('ssl=true');

  const requiresSsl = env.DB.ssl || isCloudProvider;

  if (!requiresSsl) {
    return false; // Local PostgreSQL connections without SSL
  }

  // Enforce secure TLS with strict server certificate verification
  return {
    rejectUnauthorized: true,
  };
}

const poolConfig = env.DB.connectionString
  ? {
      connectionString: env.DB.connectionString,
      ssl: getSslConfiguration(),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // 10s for serverless cold starts
    }
  : {
      host: env.DB.host,
      port: env.DB.port,
      database: env.DB.database,
      user: env.DB.user,
      password: env.DB.password,
      ssl: getSslConfiguration(),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

// PostgreSQL connection pool instance
export const pool = new Pool(poolConfig);

// Pool event listeners for diagnostic logging without credential exposure
pool.on('error', (err) => {
  console.error('[Database Pool Error]: Unexpected error on idle client:', err.message);
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
