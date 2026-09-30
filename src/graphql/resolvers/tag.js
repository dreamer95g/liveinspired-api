import { GraphQLError } from 'graphql';

function shapeTag(t) {
  return {
    id: t.id,
    name: t.name,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

function normalizePagination({ limit = 10, offset = 0 } = {}) {
  return {
    limit: Math.min(Math.max(limit, 1), 1000),
    offset: Math.max(offset, 0),
  };
}

export const tagQueries = {
  tags: async (_, { filter = {}, pagination = {} }, { prisma }) => {
    const { limit, offset } = normalizePagination(pagination);

    const where = {};
    if (filter.search) {
      where.name = { contains: filter.search };
    }

    const [totalCount, items] = await Promise.all([
      prisma.tags.count({ where }),
      prisma.tags.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
    ]);

    return {
      items: items.map(shapeTag),
      pageInfo: {
        totalCount,
        hasNextPage: offset + limit < totalCount,
        hasPreviousPage: offset > 0,
      },
    };
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