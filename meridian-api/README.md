# Meridian API

Express + Socket.IO backend for the Meridian logistics platform: shipments,
public tracking, authentication, live chat with bot and admin takeover.

## Deploy on Render (free tier, $0)

1. Render dashboard → New → **Blueprint** → pick this repo (`render.yaml` sets
   the free plan automatically). Or New → Web Service → this repo → Instance
   type **Free**.
2. Set the `MONGODB_URI` environment variable to the Atlas connection string
   (include the `/test` database path so it matches the shared data).
3. Deploy. The service sleeps after 15 minutes idle and wakes on the first
   request (roughly 30 to 60 seconds); no card, no monthly charge.

Then point the frontend's `NEXT_PUBLIC_API_URL` at the new service URL.

## Develop

```bash
npm install
npm run dev   # http://localhost:5000
```

`.env`: `MONGODB_URI`, `JWT_SECRET`, `PORT=5000`, optional `CLIENT_URL`
(comma-separated allowed origins).
