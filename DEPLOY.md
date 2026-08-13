# Deploy runbook — new MongoDB, new GitHub, new Vercel, new Render

Two services: the Next.js frontend (`meridian-logistics`) on Vercel, and the
Express + Mongo API (`meridian-api`) on Render. `meridian-core` is kept as
reference only — it is Prisma/Postgres and is not deployed.

Each service needs the other's URL, so deploy in this order and do one pass back.

## 0. Before anything

Never commit `.env`. All three `.gitignore` files already exclude it — verified.
Real secrets go in the Render and Vercel dashboards, not in the repo.

## 1. Two GitHub repos

`meridian-logistics` and `meridian-api` are separate projects with separate
lockfiles, so they need separate repos. Neither has a `.git` yet.

```bash
cd "C:\Users\ASUS\OneDrive\Desktop\evil-catsite\meridian-api"
git init && git add . && git commit -m "Initial commit"
```

Confirm `.env` is absent from `git status` before the first push.

## 2. Render — deploy the API

New → Blueprint → pick the `meridian-api` repo (`render.yaml` selects the free
plan). Set these in the dashboard:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | your new Atlas connection string |
| `JWT_SECRET` | generated automatically by `render.yaml` |
| `CLIENT_URL` | leave blank for now — filled in at step 4 |
| `NODE_ENV` | `production` (preset) |
| `PORT` | `5000` (preset) |

In Atlas, allow Render's outbound IPs (or `0.0.0.0/0` on the free tier) or the
connection times out.

Verify: `https://<service>.onrender.com/api/health` returns `{"status":"ok"}`.
The free instance sleeps after 15 min idle; first request takes 30–60 s.

## 3. Vercel — deploy the frontend

Add New Project → import the `meridian-logistics` repo → Next.js autodetected.

Set `NEXT_PUBLIC_API_URL` to the Render URL from step 2 **before** the first
build. `NEXT_PUBLIC_*` values are baked into the bundle at build time, so
changing this later requires a redeploy, not just a restart.

## 4. Close the loop

Back in Render, set `CLIENT_URL` to your Vercel URL — comma-separated if you
have a custom domain too:

```
https://your-project.vercel.app,https://yourdomain.com,https://www.yourdomain.com
```

CORS is now driven entirely by this variable (`server.js`), so no code change is
needed for a new domain. An origin not in this list is rejected.

## 5. Seed the admin user

`seed.js` creates `admin@velonex24.com` with the password `admin123`. **Change
both before the site is publicly reachable** — it is a live admin login on a
public URL. Edit `seed.js`, or use `scripts/admin-update.js` to set real
credentials, then run against the new database.

## 6. Verify end to end

- `/tracking` — look up a shipment (needs seeded data)
- `/admin/login` — sign in, confirm the dashboard loads
- `/admin/chat` — send a message; confirms the Socket.IO transport, which is the
  piece most likely to break on CORS

## Still branded "Meridian" / "Velonex24"

Deliberately deferred until the stack is confirmed working. When rebranding:

| File | What |
| --- | --- |
| `meridian-api/socket/chatHandler.js:216` | user-visible chat sign-off |
| `meridian-api/server.js:90` | boot log |
| `meridian-api/seed.js`, `scripts/admin-update.js` | admin email + login URL |
| `meridian-logistics/src/components/Logo.tsx` | wordmark |
| `meridian-logistics/src/**` | `Meridian` copy, accent `#FF4D00` in `globals.css` |
