import { pool } from '../config/db.js';

export const UserModel = {
  /**
   * Find user by email (case-insensitive)
   */
  async findByEmail(email) {
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
   * Create a student user account (enforces STUDENT role)
   */
  async createStudent({ full_name, email, password_hash }) {
    const query = `
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ($1, $2, $3, 'STUDENT')
      RETURNING id, full_name, email, role, created_at, updated_at;
    `;
    const { rows } = await pool.query(query, [
      full_name.trim(),
      email.trim().toLowerCase(),
      password_hash,
    ]);
    return rows[0];
  },

  /**
   * Create or update administrator user (used by admin seed script)
   */
  async createOrUpdateAdmin({ full_name, email, password_hash }) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);

    if (existing) {
      const updateQuery = `
        UPDATE users
        SET full_name = $1, password_hash = $2, role = 'ADMIN', updated_at = NOW()
        WHERE id = $3
        RETURNING id, full_name, email, role, created_at, updated_at;
      `;
      const { rows } = await pool.query(updateQuery, [
        full_name.trim(),
        password_hash,
        existing.id,
      ]);
      return { user: rows[0], isNew: false };
    }

    const insertQuery = `
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ($1, $2, $3, 'ADMIN')
      RETURNING id, full_name, email, role, created_at, updated_at;
    `;
    const { rows } = await pool.query(insertQuery, [
      full_name.trim(),
      normalizedEmail,
      password_hash,
    ]);
    return { user: rows[0], isNew: true };
  },
};
