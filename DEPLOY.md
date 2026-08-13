# Bellmont Express deployment runbook

The production path is:

- Neon PostgreSQL is the primary database.
- `meridian-core` is the production NestJS and Prisma API on Render.
- MongoDB Atlas is retained as the existing data source for the one-time migration.
- `meridian-logistics` is the Next.js frontend on Vercel.

## Database setup

Create a Neon project and copy both connection strings:

- `DATABASE_URL`: pooled connection string for the application.
- `DIRECT_URL`: direct connection string for Prisma migrations.

Keep the MongoDB Atlas connection available for the migration only. The migration script expects the variable name `MONGO_URI`:

```powershell
$env:MONGO_URI = "mongodb+srv://..."
$env:DATABASE_URL = "postgresql://..."
$env:DIRECT_URL = "postgresql://..."
npx ts-node scripts/migrate-from-mongo.ts
```

Run that command from `meridian-core` after installing its dependencies.

## Render Blueprint

The repository root contains `render.yaml`. It deploys `meridian-core` from the `meridian-core` subdirectory using Render's monorepo `rootDir` setting.

Create a new Render Blueprint from this repository. Provide these values when prompted:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL URL |
| `DIRECT_URL` | Neon direct PostgreSQL URL |
| `JWT_SECRET` | generated automatically by Render |
| `CLIENT_URL` | Vercel project URL, added after the frontend is deployed |

`NODE_ENV` is set to `production`. Render provides `PORT` automatically.

The service starts with Prisma migrations and then runs `node dist/main.js`. Verify:

```text
https://<service>.onrender.com/api/health
```

## Vercel frontend

Import the `meridian-logistics` project from this repository. If Vercel asks for the project root, set it to `meridian-logistics`.

Set this environment variable before the first production build:

```env
NEXT_PUBLIC_API_URL=https://<service>.onrender.com
```

`NEXT_PUBLIC_API_URL` is compiled into the frontend, so changes require a new Vercel deployment.

After Vercel provides its URL, add the same URL to Render as `CLIENT_URL`. Add a custom domain as another comma-separated origin if needed.

## Secrets

Never commit `.env` files. Generate a local secret with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"
```

Change the seeded administrator credentials before making the admin routes public.

## Legacy Express API

`meridian-api` is the earlier Express and MongoDB implementation. Its nested `render.yaml` remains available for a temporary rollback deployment, but it is not part of the root production Blueprint.
