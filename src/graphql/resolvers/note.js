import { GraphQLError } from 'graphql';

const noteInclude = {
  images: true,
  note_tag: { include: { tags: true } },
};

function shapeTag(t) {
  return {
    id: t.id,
    name: t.name,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

function shapeImage(i) {
  return {
    id: i.id,
    name: i.name,
    noteId: i.note_id,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  };
}

function shapeNote(n) {
  return {
    id: n.id,
    date: n.date,
    text: n.text,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
    images: (n.images ?? []).map(shapeImage),
    tags: (n.note_tag ?? []).map((nt) => shapeTag(nt.tags)),
  };
}

function normalizePagination({ limit = 20, offset = 0 } = {}) {
  return {
    limit: Math.min(Math.max(limit, 1), 100),
    offset: Math.max(offset, 0),
  };
}

export const noteQueries = {
  notes: async (_, { filter = {}, pagination = {} }, { prisma }) => {
    const { limit, offset } = normalizePagination(pagination);

    const where = {};
    if (filter.tagIds?.length) {
      where.AND = filter.tagIds.map((tag_id) => ({
        note_tag: { some: { tag_id } },
      }));
    }

    const [totalCount, items] = await Promise.all([
      prisma.notes.count({ where }),
      prisma.notes.findMany({
        where,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: limit,
        include: noteInclude,
      }),
    ]);

    return {
      items: items.map(shapeNote),
      pageInfo: {
        totalCount,
        hasNextPage: offset + limit < totalCount,
        hasPreviousPage: offset > 0,
      },
    };
  },

  note: async (_, { id }, { prisma }) => {
    const n = await prisma.notes.findUnique({
      where: { id },
      include: noteInclude,
    });
    return n ? shapeNote(n) : null;
  },
};

export const noteMutations = {
  createNote: async (_, { input }, { prisma }) => {
    const now = new Date();
    const note = await prisma.notes.create({
      data: {
        text: input.text,
        date: input.date ?? now,
        created_at: now,
        updated_at: now,
        note_tag: input.tagIds?.length
          ? {
              create: input.tagIds.map((tag_id) => ({
                tags: { connect: { id: tag_id } },
              })),
            }
          : undefined,
        images: input.imageUrls?.length
          ? {
              create: input.imageUrls.map((url) => ({
                name: url,
                created_at: now,
                updated_at: now,
              })),
            }
          : undefined,
      },
      include: noteInclude,
    });
    return shapeNote(note);
  },

  updateNote: async (_, { id, input }, { prisma }) => {
    const existing = await prisma.notes.findUnique({ where: { id } });
    if (!existing) {
      throw new GraphQLError('Nota no encontrada', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.tagIds !== undefined) {
        await tx.note_tag.deleteMany({ where: { note_id: id } });
      }
      return tx.notes.update({
        where: { id },
        data: {
          text: input.text ?? undefined,
          date: input.date ?? undefined,
          updated_at: new Date(),
          note_tag: input.tagIds?.length
            ? {
                create: input.tagIds.map((tag_id) => ({
                  tags: { connect: { id: tag_id } },
                })),
              }
            : undefined,
        },
        include: noteInclude,
      });
    });

    return shapeNote(updated);
  },

  deleteNote: async (_, { id }, { prisma }) => {
    const existing = await prisma.notes.findUnique({ where: { id } });
    if (!existing) {
      throw new GraphQLError('Nota no encontrada', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    await prisma.notes.delete({ where: { id } });
    return true;
  },

  addImageToNote: async (_, { noteId, url }, { prisma }) => {
    const note = await prisma.notes.findUnique({ where: { id: noteId } });
    if (!note) {
      throw new GraphQLError('Nota no encontrada', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    const now = new Date();
    const image = await prisma.images.create({
      data: {
        name: url,
        note_id: noteId,
        created_at: now,
        updated_at: now,
      },
    });
    return shapeImage(image);
  },

  removeImage: async (_, { imageId }, { prisma }) => {
    const image = await prisma.images.findUnique({ where: { id: imageId } });
    if (!image) {
      throw new GraphQLError('Imagen no encontrada', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    await prisma.images.delete({ where: { id: imageId } });
    return true;
  },

  deleteManyNotes: async (_, { ids }, { prisma }) => {
    if (!ids?.length) return 0;
    const result = await prisma.notes.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  },
};