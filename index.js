import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

import { env } from './src/lib/env.js';
import { prisma } from './src/lib/prisma.js';
import { upload } from './src/lib/upload.js';
import { typeDefs } from './src/graphql/typeDefs.js';
import { resolvers } from './src/graphql/resolvers/index.js';
import { buildContext } from './src/graphql/context.js';
import { authRouter } from './src/routes/auth.js';
import { requireAuth } from './src/middleware/requireAuth.js';
import { authPlugin } from './src/graphql/authPlugin.js';
import { backupRouter } from './src/routes/backup.js';

const app = express();



app.use(
  cors({
    origin: env.NODE_ENV === 'production'
      ? env.CORS_ORIGIN.split(',').map((s) => s.trim())
      : true,
    credentials: true,
  })
);

app.use(express.json());

// Archivos estáticos
app.use('/uploads', express.static(path.resolve('uploads')));

// Rutas de auth (públicas)
app.use('/auth', authRouter);

app.use('/backup', requireAuth, backupRouter);

// Upload (protegido)
app.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }
  res.json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

// Apollo
const server = new ApolloServer(
  { typeDefs, 
    resolvers,
    plugins: [authPlugin],
   });
await server.start();

app.use(
  '/graphql',
  expressMiddleware(server, {
    context: async ({ req }) => {
      const base = buildContext({ req });
      return { ...base, prisma };
    },
  })
);

// Manejador de errores (multer, etc.)
app.use((err, _req, res, _next) => {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.listen(env.PORT, () => {
  console.log(`🚀 Servidor listo en http://localhost:${env.PORT}/graphql`);
});