import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

export const UserModel = {
  /**
   * Find user by email (case-insensitive)
   */
  async findByEmail(email) {
    if (!email) return null;
    const query = `
      SELECT id, full_name, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [email.trim()]);
    return rows[0] || null;
  },

  /**
   * Find user by UUID primary key (safe fields only)
   */
  async findById(id) {
    if (!id) return null;
    const query = `
      SELECT id, full_name, email, role, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  },

  /**
   * Create a generic user (STUDENT or ADMIN)
   */
  async create({ full_name, fullName, email, password, password_hash, role = 'STUDENT' }) {
    const name = (full_name || fullName || '').trim();
    const normalizedEmail = (email || '').trim().toLowerCase();
    let hash = password_hash;
    if (!hash && password) {
      const salt = await bcrypt.genSalt(10);
      hash = await bcrypt.hash(password, salt);
    }
    const safeRole = role === 'ADMIN' ? 'ADMIN' : 'STUDENT';
    const query = `
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, email, role, created_at, updated_at;
    `;
    const { rows } = await pool.query(query, [name, normalizedEmail, hash, safeRole]);
    return rows[0];
  },

  /**
   * Create a student user account (enforces STUDENT role)
   */
  async createStudent({ full_name, fullName, email, password, password_hash }) {
    return this.create({
      full_name: full_name || fullName,
      email,
      password,
      password_hash,
      role: 'STUDENT',
    });
  },

  /**
   * Create or update administrator user (used by admin seed script)
   */
  async createOrUpdateAdmin({ full_name, fullName, email, password, password_hash }) {
    const name = (full_name || fullName || '').trim();
    const normalizedEmail = (email || '').trim().toLowerCase();
    let hash = password_hash;
    if (!hash && password) {
      const salt = await bcrypt.genSalt(10);
      hash = await bcrypt.hash(password, salt);
    }
    const existing = await this.findByEmail(normalizedEmail);

    if (existing) {
      const updateQuery = `
        UPDATE users
        SET full_name = $1, password_hash = $2, role = 'ADMIN', updated_at = NOW()
        WHERE id = $3
        RETURNING id, full_name, email, role, created_at, updated_at;
      `;
      const { rows } = await pool.query(updateQuery, [name, hash, existing.id]);
      const user = rows[0];
      return Object.assign({}, user, { user, isNew: false });
    }

    const insertQuery = `
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ($1, $2, $3, 'ADMIN')
      RETURNING id, full_name, email, role, created_at, updated_at;
    `;
    const { rows } = await pool.query(insertQuery, [name, normalizedEmail, hash]);
    const user = rows[0];
    return Object.assign({}, user, { user, isNew: true });
  },
};
