import pg from 'pg';
import pgConnectionString from 'pg-connection-string';
import { env } from './env.js';

const { Pool } = pg;
const { parse: parseConnectionString } = pgConnectionString;

/**
 * Compute TLS/SSL configuration securely with server certificate verification.
 * Neon, Render, Supabase, and AWS RDS use public CAs (Let's Encrypt / DigiCert)
 * which are natively verified by Node.js system root CAs.
 * rejectUnauthorized is strictly true in production to prevent MITM attacks.
 */
function getSslConfiguration(connStr) {
  const normalized = (connStr || env.DB.connectionString || '').toLowerCase();
  const isCloudProvider =
    normalized.includes('neon.tech') ||
    normalized.includes('render.com') ||
    normalized.includes('supabase.co') ||
    normalized.includes('amazonaws.com') ||
    normalized.includes('sslmode=require') ||
    normalized.includes('sslmode=verify-full') ||
    normalized.includes('ssl=true');

  const requiresSsl = env.DB.ssl || isCloudProvider;

  if (!requiresSsl) {
    return false; // Local PostgreSQL connections without SSL
  }

  // Enforce secure TLS with strict server certificate verification
  return {
    rejectUnauthorized: true,
  };
}

/**
 * Build pool configuration deterministically.
 * When connectionString is provided, we parse it and explicitly control ssl options
 * so that node-postgres does not override explicit { rejectUnauthorized: true } with an empty object.
 */
function buildPoolConfig() {
  if (env.DB.connectionString) {
    const parsed = parseConnectionString(env.DB.connectionString);
    const ssl = getSslConfiguration(env.DB.connectionString);

    // Remove parsed ssl parameters to avoid node-postgres overriding explicit ssl config
    delete parsed.ssl;
    delete parsed.sslmode;

    return {
      ...parsed,
      ssl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // 10s for serverless cold starts
    };
  }

  return {
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
}

// PostgreSQL connection pool instance
export const pool = new Pool(buildPoolConfig());

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
