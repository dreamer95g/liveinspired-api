import { GraphQLError } from 'graphql';

function shapeTag(t) {
  return {
    id: t.id,
    name: t.name,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export const tagQueries = {
  tags: async (_, __, { prisma }) => {
    const tags = await prisma.tags.findMany({
      orderBy: { name: 'asc' },
    });
    return tags.map(shapeTag);
  },

  tag: async (_, { id }, { prisma }) => {
    const t = await prisma.tags.findUnique({ where: { id } });
    return t ? shapeTag(t) : null;
  },
};

export const tagMutations = {

  deleteManyTags: async (_, { ids }, { prisma }) => {
    if (!ids?.length) return 0;
    const result = await prisma.tags.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  },
  
  createTag: async (_, { name }, { prisma }) => {
    const t = await prisma.tags.create({
      data: {
        name,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    return shapeTag(t);
  },

  updateTag: async (_, { id, name }, { prisma }) => {
    const existing = await prisma.tags.findUnique({ where: { id } });
    if (!existing) {
      throw new GraphQLError('Tag no encontrado', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    const t = await prisma.tags.update({
      where: { id },
      data: { name, updated_at: new Date() },
    });
    return shapeTag(t);
  },

  deleteTag: async (_, { id }, { prisma }) => {
    const existing = await prisma.tags.findUnique({ where: { id } });
    if (!existing) {
      throw new GraphQLError('Tag no encontrado', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    await prisma.tags.delete({ where: { id } });
    return true;
  },
};