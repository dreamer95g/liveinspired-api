import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken, verifyToken, extractToken } from '../lib/auth.js';

export const authRouter = express.Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }

  const user = await prisma.users.findFirst({
    where: { email, deleted_at: null },
  });

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = signToken(user);

  res.json({
    token,
    user: {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  });
});

authRouter.get('/me', async (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Token inválido o expirado' });

  const user = await prisma.users.findFirst({
    where: { id: BigInt(payload.sub), deleted_at: null },
  });
  if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

  res.json({
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  });
});