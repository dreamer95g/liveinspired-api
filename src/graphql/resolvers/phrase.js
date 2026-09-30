import { GraphQLError } from 'graphql';

const phraseInclude = {
  phrase_tag: { include: { tags: true } },
};

function shapeTag(t) {
  return {
    id: t.id,
    name: t.name,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

function shapePhrase(p) {
  return {
    id: p.id,
    text: p.text,
    author: p.author,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    tags: (p.phrase_tag ?? []).map((pt) => shapeTag(pt.tags)),
  };
}

function normalizePagination({ limit = 1000, offset = 0 } = {}) {
  return {
    limit: Math.min(Math.max(limit, 1), 1000),
    offset: Math.max(offset, 0),
  };
}

export const phraseQueries = {
  randomPhrase: async (_, __, { prisma }) => {
    const count = await prisma.phrases.count();
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const p = await prisma.phrases.findFirst({
      skip,
      include: phraseInclude,
    });
    return p ? shapePhrase(p) : null;
  },

  phrases: async (_, { filter = {}, pagination = {} }, { prisma }) => {
    const { limit, offset } = normalizePagination(pagination);

    const where = {};
if (filter.text) {
  where.text = { contains: filter.text };
}
if (filter.author) {
  where.author = { contains: filter.author };
}
if (filter.tagIds?.length) {
  where.AND = filter.tagIds.map((tag_id) => ({
    phrase_tag: { some: { tag_id } },
  }));
}

    const [totalCount, items] = await Promise.all([
      prisma.phrases.count({ where }),
      prisma.phrases.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: offset,
        take: limit,
        include: phraseInclude,
      }),
    ]);

    return {
      items: items.map(shapePhrase),
      pageInfo: {
        totalCount,
        hasNextPage: offset + limit < totalCount,
        hasPreviousPage: offset > 0,
      },
    };
  },

  phrase: async (_, { id }, { prisma }) => {
    const p = await prisma.phrases.findUnique({
      where: { id },
      include: phraseInclude,
    });
    return p ? shapePhrase(p) : null;
  },
};

export const phraseMutations = {

  deleteManyPhrases: async (_, { ids }, { prisma }) => {
    if (!ids?.length) return 0;
    const result = await prisma.phrases.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  },

  createPhrase: async (_, { input }, { prisma }) => {
    const now = new Date();
    const p = await prisma.phrases.create({
      data: {
        text: input.text,
        author: input.author,
        created_at: now,
        updated_at: now,
        phrase_tag: input.tagIds?.length
          ? {
              create: input.tagIds.map((tag_id) => ({
                tags: { connect: { id: tag_id } },
              })),
            }
          : undefined,
      },
      include: phraseInclude,
    });
    return shapePhrase(p);
  },

  updatePhrase: async (_, { id, input }, { prisma }) => {
    const existing = await prisma.phrases.findUnique({ where: { id } });
    if (!existing) {
      throw new GraphQLError('Frase no encontrada', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.tagIds !== undefined) {
        await tx.phrase_tag.deleteMany({ where: { phrase_id: id } });
      }
      return tx.phrases.update({
        where: { id },
        data: {
          text: input.text ?? undefined,
          author: input.author ?? undefined,
          updated_at: new Date(),
          phrase_tag: input.tagIds?.length
            ? {
                create: input.tagIds.map((tag_id) => ({
                  tags: { connect: { id: tag_id } },
                })),
              }
            : undefined,
        },
        include: phraseInclude,
      });
    });

    return shapePhrase(updated);
  },

  deletePhrase: async (_, { id }, { prisma }) => {
    const existing = await prisma.phrases.findUnique({ where: { id } });
    if (!existing) {
      throw new GraphQLError('Frase no encontrada', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    await prisma.phrases.delete({ where: { id } });
    return true;
  },
};