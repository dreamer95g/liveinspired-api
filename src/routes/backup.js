import express from 'express';
import { spawn } from 'node:child_process';
import { env } from '../lib/env.js';

export const backupRouter = express.Router();

backupRouter.get('/', (req, res) => {
  // Parseamos DATABASE_URL para extraer credenciales
  let url;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    return res.status(500).json({ error: 'DATABASE_URL inválida' });
  }

  const host = url.hostname;
  const port = url.port || '3306';
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const database = url.pathname.replace(/^\//, '');

  if (!database) {
    return res.status(500).json({ error: 'No se pudo determinar el nombre de la base' });
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `liveinspired-backup-${timestamp}.sql`;

  res.setHeader('Content-Type', 'application/sql; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`
  );

  // Pasamos la password por variable de entorno (evita que quede en el listado de procesos)
  const child = spawn(env.MYSQLDUMP_PATH, [
    '-h', host,
    '-P', port,
    '-u', user,
    '--single-transaction',
    '--routines',
    '--triggers',
    '--add-drop-table',
    database,
  ], {
    env: { ...process.env, MYSQL_PWD: password },
    windowsHide: true,
  });

  child.stdout.pipe(res);

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('error', (err) => {
    console.error('[Backup error]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo ejecutar mysqldump' });
    }
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error('[Backup failed]', stderr);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Falló el backup',
          detail: stderr.trim(),
        });
      }
    }
  });
});