import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { pool, checkDatabaseConnection } from '../config/db.js';
import { UserModel } from '../models/userModel.js';
import { logger } from '../utils/logger.js';

/**
 * Idempotent Administrator Provisioning Script
 * Reads credentials strictly from environment variables
 */
export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || env.ADMIN.email;
  const password = process.env.ADMIN_PASSWORD || env.ADMIN.password;
  const name = process.env.ADMIN_NAME || env.ADMIN.name || 'System Administrator';

  if (!email || !password) {
    logger.error('Admin provisioning aborted: ADMIN_EMAIL and ADMIN_PASSWORD must be configured in environment.');
    return {
      success: false,
      reason: 'Missing ADMIN_EMAIL or ADMIN_PASSWORD in environment',
    };
  }

  // Security Hardening: Disallow insecure default or weak passwords in production
  if (
    env.NODE_ENV === 'production' &&
    (password.length < 10 ||
      password === 'AdminInitialPassword123!' ||
      password === 'AdminPass123!' ||
      password === 'change_this_to_a_secure_admin_password_min_12_chars')
  ) {
    logger.error('Admin provisioning aborted: A strong, non-default password is required in production.');
    return {
      success: false,
      reason: 'Insecure default password rejected in production mode',
    };
  }

  const connCheck = await checkDatabaseConnection();
  if (!connCheck.connected) {
    logger.warn(`Admin seed blocked: ${connCheck.message}`);
    return {
      success: false,
      blocked: true,
      reason: connCheck.message,
    };
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await UserModel.createOrUpdateAdmin({
      full_name: name,
      email,
      password_hash,
    });

    if (result.isNew) {
      logger.info(`Administrator account created successfully for: ${email} (User ID: ${result.user.id})`);
    } else {
      logger.info(`Administrator account updated successfully for: ${email} (User ID: ${result.user.id})`);
    }

    return {
      success: true,
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      isNew: result.isNew,
    };
  } catch (error) {
    logger.error(`Failed to seed administrator account: ${error.message}`);
    throw error;
  }
}

// Execute directly if run via CLI
if (process.argv[1] && process.argv[1].endsWith('seedAdmin.js')) {
  seedAdmin()
    .then((result) => {
      if (result.blocked) {
        console.warn(`[ADMIN SEED]: Database unavailable. Admin seed skipped.`);
        process.exit(0);
      }
      if (!result.success) {
        console.error(`[ADMIN SEED FAILED]: ${result.reason}`);
        process.exit(1);
      }
      console.log(`[ADMIN SEED SUCCESS]: Admin ready (${result.email})`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[ADMIN SEED ERROR]:', err.message);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}
