import { verifyToken, extractToken } from '../lib/auth.js';

export function requireAuth(req, res, next) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  req.user = payload;
  next();
}