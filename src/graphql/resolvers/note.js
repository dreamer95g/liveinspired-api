import { GraphQLError } from 'graphql';
import fs from 'node:fs/promises';
import path from 'node:path';

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

// Helper para borrar archivo físico
async function deletePhysicalFile(imageUrl) {
  if (!imageUrl) return;
  try {
    const filename = imageUrl.split('/').pop();
    const filePath = path.resolve('uploads', filename);
    await fs.unlink(filePath);
  } catch (err) {
    console.error(`No se pudo borrar físicamente la imagen ${imageUrl}:`, err.message);
  }
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
    const existing = await prisma.notes.findUnique({ 
      where: { id },
      include: { images: true } 
    });
    
    if (!existing) {
      throw new GraphQLError('Nota no encontrada', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Eliminamos de la base de datos
    await prisma.notes.delete({ where: { id } });

    // Eliminamos los archivos físicos asociados
    for (const img of existing.images) {
      await deletePhysicalFile(img.name);
    }

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
    
    // 1. Borrar de la BD
    await prisma.images.delete({ where: { id: imageId } });
    
    // 2. Borrar del disco
    await deletePhysicalFile(image.name);

    return true;
  },

  deleteManyNotes: async (_, { ids }, { prisma }) => {
    if (!ids?.length) return 0;

    // Buscamos las notas con sus imágenes antes de borrarlas
    const notesToDelete = await prisma.notes.findMany({
      where: { id: { in: ids } },
      include: { images: true }
    });

    const result = await prisma.notes.deleteMany({
      where: { id: { in: ids } },
    });

    // Borramos físicamente todas las imágenes de las notas seleccionadas
    for (const note of notesToDelete) {
      for (const img of note.images) {
        await deletePhysicalFile(img.name);
      }
    }

    return result.count;
  },
};