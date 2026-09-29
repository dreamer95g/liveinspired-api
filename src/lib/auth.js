import jwt from 'jsonwebtoken';
import { env } from './env.js';

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id.toString(),
      email: user.email,
      name: user.name,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function extractToken(req) {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}