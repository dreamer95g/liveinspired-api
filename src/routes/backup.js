import express from 'express';
import { spawn, exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { createRequire } from 'node:module';
import { env } from '../lib/env.js';

const require = createRequire(import.meta.url);
const archiver = require('archiver');
const AdmZip = require('adm-zip');

export const backupRouter = express.Router();

const tempDir = path.resolve('temp-backup');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const uploadTemp = multer({ dest: 'temp-backup/' });

// ==========================================
// 1. ENDPOINT DE EXPORTACIÓN
// ==========================================
backupRouter.get('/', (req, res) => {
  const tempSqlPath = path.join(tempDir, `dump-${Date.now()}.sql`);

  try {
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

    if (!database) return res.status(500).json({ error: 'No se pudo determinar el nombre de la base' });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `liveinspired-backup-${timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('[Archiver error]', err);
      if (!res.headersSent) res.status(500).json({ error: 'Error al comprimir el backup' });
    });

    archive.pipe(res);

    const uploadsPath = path.resolve('uploads');
    if (fs.existsSync(uploadsPath)) {
      archive.directory(uploadsPath, 'uploads');
    }

    // Usamos --result-file para que MySQL escriba directo al disco sin pasar por la consola de Windows
    const child = spawn(env.MYSQLDUMP_PATH, [
      '-h', host,
      '-P', port,
      '-u', user,
      '--default-character-set=utf8mb4',
      '--single-transaction',
      '--routines',
      '--triggers',
      '--add-drop-table',
      `--result-file=${tempSqlPath}`,
      database,
    ], {
      env: { ...process.env, MYSQL_PWD: password },
      windowsHide: true,
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => stderr += chunk.toString());

    child.on('error', (err) => {
      console.error('[Backup spawn error]', err);
      archive.abort();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error('[Backup process failed]', stderr);
        archive.abort();
        return;
      }
      // Cuando MySQL termina de escribir el archivo limpio, lo metemos al ZIP
      archive.file(tempSqlPath, { name: `${database}-${timestamp}.sql` });
      archive.finalize();
    });

    // Limpiamos el archivo temporal cuando se termine de descargar
    res.on('finish', () => {
      if (fs.existsSync(tempSqlPath)) fs.unlinkSync(tempSqlPath);
    });

  } catch (error) {
    console.error("[Backup Export Error]:", error);
    if (fs.existsSync(tempSqlPath)) fs.unlinkSync(tempSqlPath);
    if (!res.headersSent) res.status(500).json({ error: error.message || 'Error interno' });
  }
});

// ==========================================
// 2. ENDPOINT DE RESTAURACIÓN (IMPORTACIÓN)
// ==========================================
backupRouter.post('/restore', uploadTemp.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

  try {
    let url;
    try {
      url = new URL(env.DATABASE_URL);
    } catch {
      throw new Error('DATABASE_URL inválida');
    }

    const host = url.hostname;
    const port = url.port || '3306';
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = url.pathname.replace(/^\//, '');

    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();

    const sqlEntry = zipEntries.find(entry => entry.name.endsWith('.sql'));
    if (!sqlEntry) throw new Error('El archivo ZIP no contiene un script .sql válido');

    zip.extractEntryTo(sqlEntry, tempDir, false, true);
    const sqlFilePath = path.join(tempDir, sqlEntry.name);

    const uploadsPath = path.resolve('uploads');
    if (fs.existsSync(uploadsPath)) {
      const files = await fs.promises.readdir(uploadsPath);
      for (const file of files) await fs.promises.unlink(path.join(uploadsPath, file));
    } else {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }

    const uploadsEntry = zipEntries.find(entry => entry.entryName.startsWith('uploads/'));
    if (uploadsEntry) {
      zip.extractEntryTo('uploads/', path.resolve('.'), true, true);
    }

    await new Promise((resolve, reject) => {
      // Usamos SOURCE dentro de MySQL para que lea el archivo nativamente, evadiendo el < de Windows
      const normalizedSqlPath = sqlFilePath.replace(/\\/g, '/');
      const cmd = `mysql -h ${host} -P ${port} -u ${user} --default-character-set=utf8mb4 ${database} -e "SOURCE ${normalizedSqlPath}"`;
      
      exec(cmd, { env: { ...process.env, MYSQL_PWD: password } }, (error, stdout, stderr) => {
        if (error) {
          console.error('[Restore MySQL Error]', stderr);
          reject(new Error('Fallo al volcar la base de datos SQL.'));
        } else {
          resolve();
        }
      });
    });

    await fs.promises.unlink(req.file.path); 
    await fs.promises.unlink(sqlFilePath);   

    res.json({ success: true, message: 'Restauración completada con éxito' });

  } catch (error) {
    console.error('[Restore Endpoint Error]:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message || 'Error interno durante la restauración' });
  }
});