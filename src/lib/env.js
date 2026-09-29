import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);

if (missing.length > 0) {
  console.error(`❌ Faltan variables de entorno: ${missing.join(', ')}`);
  process.exit(1);
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: Number(process.env.PORT ?? 4000),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES ?? '30d',
  MYSQLDUMP_PATH: process.env.MYSQLDUMP_PATH ?? 'mysqldump',
};