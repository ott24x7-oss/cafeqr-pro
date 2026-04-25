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

## 🚀 Quick start (local)

### 1. Prerequisites

- Node 20+ and npm
- PostgreSQL 14+ (local) — or use Railway/Neon/Supabase free DB

### 2. Install & configure

```bash
# 1. Install
npm install

# 2. Copy env template
cp .env.example .env

# 3. Edit .env and set DATABASE_URL + NEXTAUTH_SECRET (any 32-char random)
#    On macOS/Linux:
#    openssl rand -base64 32
```

### 3. Run migrations & seed

```bash
# Sync Prisma client + run first migration
npm run db:push     # OR for proper migration history: npm run db:migrate

# Seed plans, super admin, and a demo cafe with sample menu
npm run db:seed
```

The seed creates:

- **Super admin** → `admin@cafeqr.pro` / `ChangeMe@123` *(or whatever you set in `.env`)*
- **Demo cafe owner** → `owner@mocha.cafe` / `Owner@123`
- A demo cafe **Cafe Mocha** with 5 tables, 5 categories, 12 menu items, 3 plans
- Public menu lives at `http://localhost:3000/cafe/cafe-mocha`

### 4. Start dev server

```bash
npm run dev
# → http://localhost:3000
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
| `WHATSAPP_PROVIDER`            |          | `manual` *(default)* / `cloud_api` / `baileys`              |
| `WHATSAPP_CLOUD_TOKEN`         |          | Meta Cloud API token (provider = cloud_api)                 |
| `WHATSAPP_CLOUD_PHONE_ID`      |          | Meta Cloud API phone-number ID                              |
| `SMTP_HOST` …                  |          | Optional outgoing email (resets, receipts)                  |
| `ENCRYPTION_KEY`               |          | 64-hex-char AES-256-GCM key for sensitive fields            |

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

- **Prisma migration fails** — `npm run db:push` instead of `migrate` for first-time dev.
- **Build error: cannot find module `@prisma/client`** — run `npm install` again, or `npm run postinstall`.
- **Customer OTP** — in development, the API returns the OTP in the response so you can auto-fill. In prod, switch `WHATSAPP_PROVIDER` to `cloud_api` or `baileys` to actually deliver.
- **Email not sending** — SMTP is optional; if vars not set, the app skips sends gracefully.

---

## 📝 License

MIT — build a beautiful cafe with it. ☕
