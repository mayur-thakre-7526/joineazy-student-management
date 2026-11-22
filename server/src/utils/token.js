import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Signs a new JWT for an authenticated user
 */
export function signToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, env.JWT.secret, {
    expiresIn: env.JWT.expiresIn,
  });
}

/**
 * Verifies a JWT and returns the decoded payload or throws an error
 */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT.secret);
}
