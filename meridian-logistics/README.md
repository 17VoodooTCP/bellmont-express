# Meridian — The Future of Freight

A next-generation logistics platform: white, minimal, orange-accented, cinematic.
Built as a fresh flagship product (separate from the Velonex24 codebase) intended
for resale — new repo, new Vercel frontend, new Render backend.

> **Brand note:** "Meridian" is a working name — search/replace `Meridian` and the
> `Logo` component to rebrand for the buyer.

## Stack

- **Next.js 15** (App Router) · TypeScript · TailwindCSS 4
- **GSAP + ScrollTrigger** for the cinematic scroll scenes
- **next/font** (Space Grotesk display + Inter body)
- Hidden **Google Translate** driven by a flag-based language selector
- Phase 2: **NestJS + Prisma + PostgreSQL** backend on Render

## Delivered in Phase 1

- Cinematic landing: orange container ship sails an ambient ocean, recedes into
  the horizon on scroll while a container-port scene (gantry crane + truck)
  flips into view. Reduced-motion safe.
- Rewritten brand copy, services (ocean/air/road/rail), stats, human imagery,
  CTA — pure white / ink black / orange `#FF4D00`.
- Redesigned tracking (`/tracking`): animated route arc with a moving vessel,
  milestone rail, fact cards, journey log. Wired to the existing shipment API
  for business continuity (`NEXT_PUBLIC_API_URL`).
- Global language switcher: country flags, `googtrans` cookie, Google widget
  fully hidden — only translated content ever shows.

## Roadmap

| Phase | Scope |
| --- | --- |
| 1 (this) | Brand, landing experience, tracking experience, i18n |
| 2 | NestJS + Prisma + PostgreSQL backend on new Render; auth; real-time chat; data migration |
| 3 | Admin suite (dashboard, fleet, packages, invoices, roles, audit logs…) + CMS so every page section is editable |
| 4 | 3D upgrades (R3F ship/port), AI-generated media via Hugging Face MCP, Lighthouse 95+ hardening |

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://velonex24-api.onrender.com   # Phase 2: new Render URL
```

## Deploy

**Vercel (new project):** vercel.com → Add New Project → import
`meridian-logistics` repo → framework auto-detects Next.js → set
`NEXT_PUBLIC_API_URL` → Deploy.

**Render (Phase 2 backend):** created when the NestJS service lands; until then
the frontend consumes the existing shipment API so tracking works on day one.
