# LiveInspired — Backend

API REST + GraphQL para la gestión de notas, frases y categorías (tags), con autenticación JWT, subida de imágenes y respaldo de base de datos.

## 👤 Autor

**Gabry95g**
- GitHub: [@Gabry95g](https://github.com/Gabry95g)

## 🛠️ Tecnologías

- **Node.js** (v20+) con ES Modules
- **Express 5** — servidor HTTP
- **Apollo Server 4** — GraphQL
- **Prisma 5** — ORM
- **MySQL** — base de datos
- **JWT** (`jsonwebtoken`) — autenticación
- **bcryptjs** — hashing de contraseñas
- **Multer** — subida de archivos
- **CORS**, **dotenv**

## 📋 Requisitos previos

- Node.js 20 o superior
- MySQL 8 o superior instalado y corriendo
- `mysqldump` disponible (viene con MySQL; necesario para el endpoint de backup)
- Git

## 🚀 Instalación desde cero

### 1. Clonar el repositorio

```bash
git clone https://github.com/Gabry95g/liveinspired.git
cd liveinspired
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear la base de datos en MySQL

Ingresá a MySQL:

```bash
mysql -u root -p
```

Y creá la base de datos:

```sql
CREATE DATABASE liveinspired CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 4. Configurar variables de entorno

Creá un archivo `.env` en la raíz del proyecto con el siguiente contenido (ajustá los valores):

```env
DATABASE_URL="mysql://root:tu_password@localhost:3306/liveinspired"
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:4000

JWT_SECRET=pon_aqui_un_string_largo_aleatorio
JWT_EXPIRES=30d

# Opcional: si mysqldump no está en el PATH del sistema, poné la ruta completa
# MYSQLDUMP_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe
```

Para generar un `JWT_SECRET` aleatorio:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 5. Aplicar el esquema de Prisma a la base de datos

```bash
npx prisma migrate deploy
npx prisma generate
```

> **Nota:** si es una base nueva y no tenés migraciones versionadas, usá:
> ```bash
> npx prisma db push
> npx prisma generate
> ```

### 6. Crear el primer usuario

Insertá un usuario manualmente desde Prisma Studio o MySQL, con la contraseña hasheada. Opción rápida con un script:

```bash
node scripts/set-password.js tu@email.com TuPassword123
```

> Si el usuario no existe, creálo primero desde Prisma Studio (`npx prisma studio`) con un email, name, y password placeholder, y luego corré el script.

### 7. Crear la carpeta de uploads

```bash
mkdir uploads
```

### 8. Correr el proyecto

```bash
npm run dev
```

El servidor arranca en `http://localhost:4000`.

## 🔧 Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Arranca el server en modo desarrollo (con `--watch`) |
| `npm start` | Arranca el server en modo producción |
| `npm run db:studio` | Abre Prisma Studio (interfaz visual de la BD) |
| `npm run db:push` | Sincroniza el schema con la BD sin migraciones |
| `npm run db:migrate` | Crea y aplica una migración |
| `npm run db:generate` | Regenera el cliente de Prisma |

## 📡 Endpoints

### REST

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/login` | ❌ | Login con email y password. Devuelve JWT |
| GET | `/auth/me` | ✅ | Devuelve el usuario del token |
| POST | `/upload` | ✅ | Sube una imagen (multipart, campo `file`) |
| GET | `/backup` | ✅ | Descarga un `.sql` con el backup completo |
| GET | `/uploads/:filename` | ❌ | Sirve las imágenes subidas |
| POST | `/graphql` | ✅ | Endpoint GraphQL |

### GraphQL

El schema completo se puede explorar en `http://localhost:4000/graphql` (Apollo Sandbox) con el header:

```
Authorization: Bearer <tu_token>
```

**Entidades principales:**

- **User** — perfil del usuario autenticado (`me`, `updateProfile`, `changePassword`)
- **Tag** — categorías (`tags`, `tag`, `createTag`, `updateTag`, `deleteTag`, `deleteManyTags`)
- **Phrase** — frases (`phrases`, `phrase`, `randomPhrase`, `createPhrase`, `updatePhrase`, `deletePhrase`, `deleteManyPhrases`)
- **Note** — notas (`notes`, `note`, `createNote`, `updateNote`, `deleteNote`, `deleteManyNotes`)
- **Image** — imágenes asociadas a notas (`addImageToNote`, `removeImage`)

**Filtros:**

- `phrases(filter: { author, tagIds })` — combina autor y categorías (AND: la frase debe tener **todas** las categorías pasadas)
- `notes(filter: { tagIds })` — filtra por categorías (AND)

**Paginación:**

Todas las listas aceptan `pagination: { limit, offset }` y devuelven:

```graphql
{
  items { ... }
  pageInfo { totalCount hasNextPage hasPreviousPage }
}
```

## 📁 Estructura del proyecto

```
liveinspired/
├── prisma/
│   ├── schema.prisma        # Modelos de la BD
│   └── migrations/          # Migraciones versionadas
├── scripts/
│   └── set-password.js      # Utilidad para resetear contraseñas
├── src/
│   ├── lib/
│   │   ├── auth.js          # Firmar/verificar JWT
│   │   ├── env.js           # Validación de variables de entorno
│   │   ├── prisma.js        # Singleton de PrismaClient
│   │   └── upload.js        # Configuración de Multer
│   ├── middleware/
│   │   └── requireAuth.js   # Middleware de autenticación REST
│   ├── routes/
│   │   ├── auth.js          # /auth/login, /auth/me
│   │   └── backup.js        # /backup
│   └── graphql/
│       ├── authPlugin.js    # Plugin de Apollo para bloquear sin token
│       ├── context.js       # Contexto de Apollo (usuario del JWT)
│       ├── scalars.js       # Scalar BigInt personalizado
│       ├── typeDefs.js      # Schema GraphQL
│       └── resolvers/
│           ├── index.js
│           ├── note.js
│           ├── phrase.js
│           ├── tag.js
│           └── user.js
├── uploads/                 # Imágenes subidas (ignorado por git)
├── .env                     # Variables de entorno (ignorado por git)
├── .gitignore
├── index.js                 # Punto de entrada
├── package.json
└── README.md
```

## 🔒 Seguridad

- Las contraseñas se guardan hasheadas con **bcrypt** (10 rondas).
- El JWT expira en **30 días** (configurable con `JWT_EXPIRES`).
- Todos los endpoints excepto `/auth/login` y `/uploads/*` requieren token.
- El endpoint GraphQL bloquea cualquier operación sin token excepto la introspección del schema.
- El `.env` **nunca** se sube al repositorio.
- El endpoint `/backup` pasa la contraseña de MySQL por variable de entorno, no como argumento del comando.

## 📝 Licencia

Proyecto personal. Todos los derechos reservados.