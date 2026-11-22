import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root or local .env if present
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || (isProduction ? undefined : 'http://localhost:5173'),
  DB: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'joineazy_db',
    user: process.env.DB_USER || 'joineazy_user',
    password: process.env.DB_PASSWORD || 'joineazy_password',
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true',
  },
  JWT: {
    secret: process.env.JWT_SECRET || 'joineazy_jwt_secret_dev_key_do_not_use_in_prod_min32chars!',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  CSRF: {
    secret: process.env.CSRF_SECRET || 'joineazy_csrf_secret_dev_key_min32chars!',
  },
  ADMIN: {
    email: process.env.ADMIN_EMAIL || process.env.ADMIN_SEED_EMAIL,
    password: process.env.ADMIN_PASSWORD || process.env.ADMIN_SEED_PASSWORD,
    name: process.env.ADMIN_NAME || process.env.ADMIN_SEED_NAME || 'System Administrator',
  },
  // Backwards-compatible alias for earlier scripts
  get ADMIN_SEED() {
    return this.ADMIN;
  },
};
