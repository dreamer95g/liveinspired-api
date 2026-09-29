import { verifyToken, extractToken } from '../lib/auth.js';

export function buildContext({ req }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  return { user: payload ?? null };
}