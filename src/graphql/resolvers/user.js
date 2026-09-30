import bcrypt from 'bcryptjs';
import { GraphQLError } from 'graphql';
import fs from 'node:fs/promises';
import path from 'node:path';

function requireUser(user) {
  if (!user) {
    throw new GraphQLError('No autenticado', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return user;
}

function shapeUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
  };
}

export const userQueries = {
  me: async (_, __, { prisma, user }) => {
    const payload = requireUser(user);
    const u = await prisma.users.findFirst({
      where: { id: BigInt(payload.sub), deleted_at: null },
    });
    return u ? shapeUser(u) : null;
  },
};

export const userMutations = {
  updateProfile: async (_, { input }, { prisma, user }) => {
    const payload = requireUser(user);

    // Buscamos el usuario actual para obtener su avatar viejo
    const currentUser = await prisma.users.findFirst({
      where: { id: BigInt(payload.sub) }
    });

    const data = { updated_at: new Date() };
    if (input.name !== undefined) data.name = input.name;
    if (input.avatar !== undefined) data.avatar = input.avatar;

    if (Object.keys(data).length === 1) {
      throw new GraphQLError('Nada que actualizar', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const u = await prisma.users.update({
      where: { id: BigInt(payload.sub) },
      data,
    });

    // Si se envió un avatar nuevo y había uno viejo, lo borramos del disco
    if (input.avatar !== undefined && currentUser.avatar && currentUser.avatar !== input.avatar) {
      try {
        const filename = currentUser.avatar.split('/').pop();
        const filePath = path.resolve('uploads', filename);
        await fs.unlink(filePath);
      } catch (err) {
        console.error('No se pudo borrar el avatar anterior:', err.message);
      }
    }

    return shapeUser(u);
  },

  changePassword: async (_, { input }, { prisma, user }) => {
    const payload = requireUser(user);

    const u = await prisma.users.findFirst({
      where: { id: BigInt(payload.sub), deleted_at: null },
    });
    if (!u) {
      throw new GraphQLError('Usuario no encontrado', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const ok = await bcrypt.compare(input.currentPassword, u.password);
    if (!ok) {
      throw new GraphQLError('Contraseña actual incorrecta', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    if (input.newPassword.length < 6) {
      throw new GraphQLError('La contraseña debe tener al menos 6 caracteres', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const hash = await bcrypt.hash(input.newPassword, 10);
    await prisma.users.update({
      where: { id: u.id },
      data: { password: hash, updated_at: new Date() },
    });
    return true;
  },
};