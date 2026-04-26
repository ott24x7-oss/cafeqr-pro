# ☕ CafeQR Pro

> Production-ready SaaS for QR-based cafe & restaurant ordering. Customers scan,
> order and pay from their seat. Owners manage everything from a beautiful
> coffee-themed dashboard.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5-darkgreen)](https://prisma.io)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-cyan)](https://tailwindcss.com)
[![Railway](https://img.shields.io/badge/Deploy-Railway-purple)](https://railway.app)

---

## ✨ Features

- **Customer side** — QR menu, cart with variants/add-ons/notes, WhatsApp OTP login, live order tracking, UPI payment, post-meal review.
- **Owner dashboard** — Live order board (NEW → COMPLETED), menu manager, table & QR generation/printing, payments verification, reviews, multi-staff with roles, analytics with charts, billing/plan switcher, settings.
- **Super-admin** — All cafes, suspend/activate, manage users, manage public pricing plans.
- **WhatsApp** — Pluggable provider: `manual` (wa.me), `cloud_api`, `baileys`. Ready-made templates for new orders, status updates, payment requests, reviews.
- **Bills/Invoices** — Print + PDF export with GST, service charge, packing.
- **PWA-ready** — Manifest, service worker (via `next-pwa`), installable on mobile/desktop.
- **Coffee + cream design system** — Tailwind tokens, dark-mode-ready, fluid responsive UI.

## 🛠 Tech stack

| Layer       | Tech                                     |
| ----------- | ---------------------------------------- |
| Framework   | Next.js 14 (App Router) · TypeScript     |
| UI          | Tailwind CSS · Radix · lucide-react      |
| State       | React Server Components + Zustand        |
| ORM         | Prisma                                   |
| Database    | PostgreSQL                               |
| Auth        | NextAuth.js (credentials + WhatsApp OTP) |
| Charts      | Recharts                                 |
| QR / PDF    | qrcode.react · jsPDF · html2canvas       |
| PWA         | next-pwa                                 |

---

## 🚀 Local development

> **New here?** See [SETUP.md](./SETUP.md) for a quick-start checklist and troubleshooting guide.

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ (20 recommended) | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Bundled with Node.js |
| PostgreSQL | 14+ | Local install **or** Docker (see below) **or** a free cloud DB |

You do **not** need PostgreSQL installed locally if you use Docker or a cloud provider.

---

### Step 1 — Clone & install

```bash
git clone https://github.com/your-org/cafeqr-pro.git
cd cafeqr-pro
npm install
```

---

### Step 2 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the required values. At minimum you need:

| Variable | What to put |
|----------|-------------|
| `DATABASE_URL` | Your PostgreSQL connection string (see options below) |
| `NEXTAUTH_SECRET` | A random 32-byte secret (see generation instructions below) |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |
| `APP_URL` | `http://localhost:3000` for local dev |
| `ENCRYPTION_KEY` | A random 32-byte hex key (see generation instructions below) |
| `SUPER_ADMIN_EMAIL` | Email for the super-admin account created by the seed |
| `SUPER_ADMIN_PASSWORD` | Password for the super-admin account |

#### Database options

**Option A — Local PostgreSQL**

If you have PostgreSQL installed:

```bash
# Create the database
createdb cafeqr
```

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/cafeqr?schema=public"
```

**Option B — Docker (no local PostgreSQL needed)**

```bash
docker run -d \
  --name cafeqr-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cafeqr \
  -p 5432:5432 \
  postgres:16-alpine
```

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cafeqr?schema=public"
```

**Option C — Free cloud database**

| Provider | Free tier | Notes |
|----------|-----------|-------|
| [Neon](https://neon.tech) | ✅ 0.5 GB | Serverless Postgres, instant setup |
| [Supabase](https://supabase.com) | ✅ 500 MB | Postgres + extras |
| [Railway](https://railway.app) | ✅ $5 credit | Same platform as production |

Copy the connection string from your provider's dashboard and paste it as `DATABASE_URL`.

#### Generating secrets

```bash
# NEXTAUTH_SECRET — base64-encoded random string
openssl rand -base64 32

# ENCRYPTION_KEY — 64 hex characters (32 bytes)
openssl rand -hex 32
```

On Windows (PowerShell):

```powershell
# NEXTAUTH_SECRET
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# ENCRYPTION_KEY
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

Or use the online generator at [generate-secret.vercel.app](https://generate-secret.vercel.app/32).

---

### Step 3 — Set up the database

```bash
# Push the Prisma schema to your database (creates all tables)
npm run db:push

# Seed the database with plans, a super-admin account, and a demo cafe
npm run db:seed
```

> **Tip:** Use `npm run db:migrate` instead of `db:push` if you want a proper
> migration history tracked in `prisma/migrations/`. For local dev, `db:push`
> is faster and simpler.

The seed creates:

| Account | Email | Password |
|---------|-------|----------|
| Super admin | *(your `SUPER_ADMIN_EMAIL`)* | *(your `SUPER_ADMIN_PASSWORD`)* |
| Demo cafe owner | `owner@mocha.cafe` | `Owner@123` |

It also creates **Cafe Mocha** — a demo cafe with 5 tables, 5 categories, 12 menu items, and 3 subscription plans.

---

### Step 4 — Start the dev server

```bash
npm run dev
# → http://localhost:3000
```

| URL | What you'll find |
|-----|-----------------|
| `http://localhost:3000` | Public landing page |
| `http://localhost:3000/login` | Login (use super-admin or demo owner credentials) |
| `http://localhost:3000/dashboard` | Cafe owner dashboard |
| `http://localhost:3000/admin` | Super-admin panel |
| `http://localhost:3000/cafe/cafe-mocha` | Demo customer menu |

---

### Useful dev commands

```bash
npm run dev          # Start Next.js dev server with hot reload
npm run db:push      # Sync Prisma schema → database (no migration files)
npm run db:migrate   # Create a new migration and apply it
npm run db:seed      # Seed plans, super-admin, and demo cafe
npm run db:studio    # Open Prisma Studio (visual DB browser) at localhost:5555
npm run build        # Production build
npm run lint         # ESLint
```

---

## 🚂 Deploying on Railway

> One-click ready. Railway auto-detects Next.js + injects PostgreSQL.

### Step 1 — Create the Railway project

1. Push this repo to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Pick this repository.

### Step 2 — Add PostgreSQL plugin

- Inside the project → **+ New** → **Database** → **PostgreSQL**.
- Railway automatically injects `DATABASE_URL` into the web service.

### Step 3 — Add environment variables

In the web service → **Variables**, paste these (replace placeholders):

```
NEXTAUTH_SECRET=         # openssl rand -base64 32
NEXTAUTH_URL=https://YOUR-APP.up.railway.app
APP_URL=https://YOUR-APP.up.railway.app
APP_NAME=CafeQR Pro

SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=AStrongPassword!
SUPER_ADMIN_NAME=Super Admin

WHATSAPP_PROVIDER=manual
# WHATSAPP_CLOUD_TOKEN=        (only for cloud_api)
# WHATSAPP_CLOUD_PHONE_ID=

# SMTP_HOST= …                 (optional — for password resets / receipts)
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM="CafeQR Pro <no-reply@yourdomain.com>"

ENCRYPTION_KEY=                # 64 hex chars: openssl rand -hex 32
```

### Step 4 — Deploy & seed

The default `build` script runs:

```
prisma generate && prisma migrate deploy && next build
```

So tables are created on every deploy. To seed plans + super admin **once**, run a one-off command:

```bash
# In Railway dashboard → service → ⚙ Settings → "Run command"
npm run db:seed
```

(or open Railway shell: `railway run npm run db:seed`)

### Step 5 — Open your app

Railway gives you a URL like `https://cafeqr-pro.up.railway.app`.
- Sign in with `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` → manage plans/cafes from `/admin`.
- Or sign up a fresh cafe at `/signup`.

### Custom domain

Railway → service → **Settings** → **Domains** → add your domain → update DNS CNAME → set `NEXTAUTH_URL` and `APP_URL` env vars.

### Optional companion services

Two optional long-running workers live under `worker/`. Each can be deployed as a *separate* Railway service from the same repo.

#### Payment auto-verify poller (`worker/payment-poller.ts`)

Polls every cafe with Gmail credentials configured and auto-verifies UPI payments by reading bank credit-alert emails. The same matcher backs the dashboard's "Verify from email" button.

1. Railway → New service → connect this repo.
2. Override start command: `npx prisma generate && npx tsx worker/payment-poller.ts`
3. Share `DATABASE_URL` and `ENCRYPTION_KEY` env vars with the main app. Optional: `POLL_INTERVAL_SEC` (default 60), `POLL_CONCURRENCY` (default 3).

The cafe owner adds Gmail address + [app password](https://myaccount.google.com/apppasswords) under **Settings → Payment → Auto-verify**.

#### Baileys WhatsApp worker (`worker/baileys-server.ts`)

Hosts WhatsApp-Web sockets so cafes that don't want Cloud API can pair their phone with a QR scan. The file is currently a scaffold — the comments at the top describe the remaining `@whiskeysockets/baileys` integration. The main app already calls this worker via `BAILEYS_WORKER_URL` when a cafe selects the `baileys` provider.

1. Railway → New service → start command: `npx tsx worker/baileys-server.ts`
2. Mount a Railway volume at `/data` so pairing state survives restarts.
3. Set `BAILEYS_WORKER_TOKEN` to a random secret. Add the same value + `BAILEYS_WORKER_URL=https://<this-service>.up.railway.app` to the main app's env.

For most cafes Cloud API is the recommended choice — official, no QR pairing, runs entirely inside Next.js.

---

## 🗂 Environment variables

| Variable                       | Required | Description                                                |
| ------------------------------ | -------- | ---------------------------------------------------------- |
| `DATABASE_URL`                 | ✅       | PostgreSQL connection string                                |
| `NEXTAUTH_SECRET`              | ✅       | Session encryption key (`openssl rand -base64 32`)          |
| `NEXTAUTH_URL`                 | ✅       | Public URL of your app (e.g. `https://cafeqr.pro`)          |
| `APP_URL`                      | ✅       | Same as `NEXTAUTH_URL` — used inside QR codes & WhatsApp    |
| `SUPER_ADMIN_EMAIL`            | ✅       | Created on first seed                                       |
| `SUPER_ADMIN_PASSWORD`         | ✅       | First-login password (change immediately after)             |
| `SUPER_ADMIN_NAME`             |          | Display name for super admin                                |
| `WHATSAPP_PROVIDER`            |          | `manual` *(default)* / `cloud_api` / `baileys` (env-level fallback) |
| `WHATSAPP_CLOUD_TOKEN`         |          | Cloud API token used when a cafe doesn't set its own         |
| `WHATSAPP_CLOUD_PHONE_ID`      |          | Cloud API phone-number ID used when a cafe doesn't set its own |
| `BAILEYS_WORKER_URL`           |          | URL of the Baileys companion worker (provider = baileys)    |
| `BAILEYS_WORKER_TOKEN`         |          | Bearer token shared between main app and Baileys worker     |
| `POLL_INTERVAL_SEC`            |          | Payment poller interval in seconds (default 60, worker only) |
| `POLL_CONCURRENCY`             |          | Cafes processed in parallel by the poller (default 3)        |
| `SMTP_HOST` …                  |          | Optional outgoing email (resets, receipts)                  |
| `ENCRYPTION_KEY`               | ✅       | 64-hex-char AES-256-GCM key — required for storing WA tokens, Gmail app passwords |

---

## 📂 Project structure

```
src/
├── app/                       # Next.js App Router
│   ├── page.tsx               # Landing page
│   ├── how-it-works/          # Marketing
│   ├── pricing/               # Public pricing (plans from DB)
│   ├── login/  signup/        # Auth
│   ├── cafe/[slug]/table/[code] # Customer menu
│   ├── order/[id]             # Live order tracker
│   ├── pay/[id]               # UPI payment
│   ├── review/[id]            # Customer review
│   ├── dashboard/             # Owner / staff
│   ├── admin/                 # Super admin
│   └── api/                   # All API routes
├── components/
│   ├── public/                # Navbar, footer
│   ├── customer/              # Menu, cart, tracker, pay, review
│   ├── dashboard/             # Sidebar, order-board, menu manager…
│   ├── admin/                 # Cafes table, plans editor
│   └── ui/                    # Button, Input, Card, Toaster…
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   ├── auth.ts                # NextAuth config (creds + WA OTP)
│   ├── guards.ts              # requireRole / requireSuperAdmin / getOwnerCafe
│   ├── whatsapp.ts            # waLink, message templates, sendMessage()
│   ├── invoice.ts             # billHtml() — PDF/print template
│   ├── mail.ts                # Nodemailer transporter + templates
│   ├── crypto.ts              # AES-256-GCM encrypt/decrypt
│   ├── order-utils.ts         # calcCart() — taxes / charges
│   └── utils.ts               # cn, formatCurrency, slugify, genCode
└── types/                     # next-auth.d.ts
prisma/
├── schema.prisma              # 17 models
└── seed.ts                    # Plans + super admin + demo cafe
```

## 🎨 Design system

- **Coffee** brown palette (`coffee-50…950`) for primary surfaces
- **Cream** (`cream-50…300`) for backgrounds
- **Caramel** for accent / CTAs
- **WhatsApp green** (`wagreen`) for WhatsApp-specific actions
- Fonts: **Inter** (body) + **Playfair Display** (headlines)

---

## ✅ What's complete vs placeholder

### Fully working

- ✅ Next.js 14 App Router app (TypeScript)
- ✅ Prisma schema (17 models) + Postgres
- ✅ NextAuth credentials login + WhatsApp OTP login (manual mode)
- ✅ Public landing, how-it-works, pricing (plans from DB)
- ✅ Cafe owner signup → trial period (14d) → cafe + settings auto-created
- ✅ Customer menu, cart, variants/add-ons/notes, WhatsApp OTP verify, place order
- ✅ Live order board (5-second polling)
- ✅ Order detail with print, PDF download, send-bill via WhatsApp, mark-paid
- ✅ Menu management (categories + items + availability toggle)
- ✅ Tables & QR generator (single + bulk + print all)
- ✅ Payments verification UI
- ✅ Reviews collection + display
- ✅ Multi-staff with roles (OWNER/MANAGER/CASHIER/KITCHEN/WAITER) + sidebar gating
- ✅ Analytics: revenue trend, top items, table performance, GST collected, CSV export
- ✅ Settings (profile, tax & charges, WhatsApp, payment, branding)
- ✅ Billing page with plan switcher (manual mode)
- ✅ Super-admin: cafes table with suspend/activate, users list, plans CRUD, dashboard
- ✅ Notifications bell with browser notification + sound
- ✅ PWA manifest + service worker (auto via `next-pwa`)
- ✅ Coffee/cream theme + responsive (mobile-first)

### Phase-2 placeholders (structure ready, swap implementation in)

- 🔧 **WhatsApp Cloud API** — `sendMessage()` already routes to Cloud API; just set `WHATSAPP_CLOUD_TOKEN` + `WHATSAPP_CLOUD_PHONE_ID` and switch provider in settings.
- 🔧 **Baileys** — provider hook ready; drop in your session manager and wire the `baileys` branch in `src/lib/whatsapp.ts`.
- 🔧 **Stripe / Razorpay billing** — `/dashboard/billing` switches plans manually today. Wire a webhook to `/api/dashboard/billing/select` for real payments.
- 🔧 **Image uploads** — menu items currently take an image URL. Plug in S3/Cloudinary upload at `src/app/api/upload`.
- 🔧 **Custom subdomain** — DB field `customSubdomain` stored; serve cafe via middleware in production.
- 🔧 **Multi-language** — `language` setting persisted; add `next-intl` for runtime translations.

---

## 🛟 Troubleshooting

**`Cannot find module '@prisma/client'`**
Run `npm install` then `npm run postinstall` (which runs `prisma generate`).

**`Error: P1001 — Can't reach database server`**
Your `DATABASE_URL` is wrong or the database isn't running. Double-check the host, port, username, and password. If using Docker, make sure the container is running (`docker ps`).

**`Error: P3005 — The database schema is not empty`**
Use `npm run db:push --force-reset` to wipe and recreate all tables (⚠️ destroys all data), or use `npm run db:migrate` to apply incremental migrations.

**Prisma migration fails on first run**
Try `npm run db:push` instead of `db:migrate` — it's simpler for a fresh database with no migration history.

**`NEXTAUTH_SECRET` error / session not working**
Make sure `NEXTAUTH_SECRET` is set in `.env` and is at least 32 characters. Generate one with `openssl rand -base64 32`.

**`ENCRYPTION_KEY` must be 64 hex characters**
Generate a valid key with `openssl rand -hex 32` and paste the output (no quotes, no spaces) as the value.

**Customer OTP not arriving**
In development, the OTP is returned directly in the API response body so you can fill it in manually — no WhatsApp delivery needed. In production, set `WHATSAPP_PROVIDER=cloud_api` and configure `WHATSAPP_CLOUD_TOKEN` + `WHATSAPP_CLOUD_PHONE_ID`.

**Email not sending**
SMTP is optional. If the `SMTP_*` variables are not set, the app skips email sends silently. Check your SMTP credentials and make sure `SMTP_HOST` is reachable.

**Build error on Railway / production**
The build command runs `prisma generate && next build`. Make sure `DATABASE_URL` is set as an environment variable in your Railway service before deploying.

> See [SETUP.md](./SETUP.md) for a full troubleshooting guide and database connection examples.

---

## 📝 License

MIT — build a beautiful cafe with it. ☕
