import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Uso: node scripts/set-password.js <email> <nueva_password>');
  process.exit(1);
}

const hash = await bcrypt.hash(newPassword, 10);
const user = await prisma.users.update({
  where: { email },
  data: { password: hash, updated_at: new Date() },
});

console.log(`✅ Contraseña actualizada para ${user.email}`);
await prisma.$disconnect();