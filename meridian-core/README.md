# Meridian Core

Phase 2 backend for the Meridian logistics platform: **NestJS + Prisma +
PostgreSQL**. Replaces the interim Express/Mongo API with the same wire
contract, so the frontend and admin console connect unchanged.

## Modules

- **auth** – JWT login/register, admin guard (`/api/auth/*`)
- **shipments** – public tracking (`/api/shipments/track/:id`), admin CRUD,
  automatic timeline entries on status change, embedded invoices
- **reviews** – public list + admin CRUD (makes the homepage reviews editor
  globally persistent)
- **chat** – Socket.IO gateway with the legacy event contract (`joinSession`,
  `userMessage`, `botReply`, `adminJoin`, `typing`, …) plus the Meridian
  support bot
- **cms** – `CmsBlock` model ready for the Phase 3 page-builder admin

## Free-tier deployment

1. **Database:** create a free project at [neon.tech](https://neon.tech) and
   copy the connection string.
2. **Migrate data:** `MONGO_URI=<old mongo uri> DATABASE_URL=<neon url> npx ts-node scripts/migrate-from-mongo.ts`
3. **API:** Render → New → Blueprint → this repo (free instance). Set
   `DATABASE_URL`. Migrations run automatically on deploy.
4. Point the frontend's `NEXT_PUBLIC_API_URL` at the new service.

## Develop

```bash
npm install
npx prisma migrate dev   # against DATABASE_URL in .env
npm run start:dev        # http://localhost:5000/api/health
```
