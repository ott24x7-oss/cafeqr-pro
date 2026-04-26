# ☕ CafeQR Pro — Setup Guide

This guide gets you from a fresh clone to a running local environment. Most
developers are up and running in under 5 minutes.

---

## Quick-start checklist

```
□ 1. Node.js 18+ installed
□ 2. PostgreSQL available (local, Docker, or cloud)
□ 3. npm install
□ 4. cp .env.example .env  →  fill in DATABASE_URL, secrets
□ 5. npm run db:push
□ 6. npm run db:seed
□ 7. npm run dev  →  http://localhost:3000
```

---

## 1. Prerequisites

### Node.js

CafeQR Pro requires **Node.js 18 or later** (Node 20 LTS recommended).

```bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x.x or higher
```

Download from [nodejs.org](https://nodejs.org) or use a version manager:

```bash
# nvm (macOS / Linux)
nvm install 20
nvm use 20

# fnm (cross-platform, faster)
fnm install 20
fnm use 20
```

### PostgreSQL

You need a PostgreSQL 14+ database. Pick whichever option suits you:

| Option | Best for |
|--------|----------|
| [Local install](#option-a--local-postgresql) | Full offline dev, no internet needed |
| [Docker](#option-b--docker) | Clean environment, easy teardown |
| [Neon](#option-c--neon-free-cloud) | Zero install, free tier, instant |
| [Supabase](#option-d--supabase-free-cloud) | Free tier + extra tooling |
| [Railway](#option-e--railway) | Same platform as production |

---

## 2. Install dependencies

```bash
git clone https://github.com/your-org/cafeqr-pro.git
cd cafeqr-pro
npm install
```

`npm install` also runs `prisma generate` automatically via the `postinstall`
script, so the Prisma client is ready immediately.

---

## 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` in your editor. The sections below explain each variable.

### Required variables

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://...` | See database options below |
| `NEXTAUTH_SECRET` | `abc123...` | 32-byte random string |
| `NEXTAUTH_URL` | `http://localhost:3000` | Public URL of the app |
| `APP_URL` | `http://localhost:3000` | Same as `NEXTAUTH_URL` locally |
| `ENCRYPTION_KEY` | `a1b2c3...` | 64 hex chars (32 bytes) |
| `SUPER_ADMIN_EMAIL` | `admin@cafeqr.pro` | Created by `npm run db:seed` |
| `SUPER_ADMIN_PASSWORD` | `ChangeMe@123` | Change after first login |

### Generating secrets

Open a terminal and run:

```bash
# NEXTAUTH_SECRET (base64, ~44 chars)
openssl rand -base64 32

# ENCRYPTION_KEY (hex, exactly 64 chars)
openssl rand -hex 32
```

Copy each output value directly into `.env`. Do not add quotes around the
value if it already has them in the file.

**Windows (PowerShell):**

```powershell
# NEXTAUTH_SECRET
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# ENCRYPTION_KEY
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

**Online generator (no terminal needed):**
[generate-secret.vercel.app/32](https://generate-secret.vercel.app/32)

---

## 4. Database setup

### Option A — Local PostgreSQL

**macOS (Homebrew):**

```bash
brew install postgresql@16
brew services start postgresql@16

# Create the database
createdb cafeqr
```

**Ubuntu / Debian:**

```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb cafeqr
```

**`.env` value:**

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/cafeqr?schema=public"
```

Replace `password` with your local postgres user's password (or leave it
blank if your local setup has no password: `postgresql://postgres@localhost:5432/cafeqr`).

---

### Option B — Docker

No PostgreSQL installation needed. Just Docker Desktop.

**One-liner:**

```bash
docker run -d \
  --name cafeqr-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cafeqr \
  -p 5432:5432 \
  postgres:16-alpine
```

**Or with Docker Compose** — create `docker-compose.yml` in the project root:

```yaml
version: '3.9'
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cafeqr
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```bash
docker compose up -d
```

**`.env` value:**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cafeqr?schema=public"
```

**Useful Docker commands:**

```bash
docker ps                        # check the container is running
docker stop cafeqr-postgres      # stop the database
docker start cafeqr-postgres     # start it again
docker rm -f cafeqr-postgres     # destroy it (data is lost)
```

---

### Option C — Neon (free cloud)

1. Sign up at [neon.tech](https://neon.tech) (free, no credit card).
2. Create a new project → copy the **Connection string** from the dashboard.
3. It looks like:

```env
DATABASE_URL="postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

Paste it into `.env` as `DATABASE_URL`.

---

### Option D — Supabase (free cloud)

1. Sign up at [supabase.com](https://supabase.com) (free, no credit card).
2. Create a new project → **Settings** → **Database** → copy the **Connection string** (URI format).
3. It looks like:

```env
DATABASE_URL="postgresql://postgres:your-password@db.abcdefghijkl.supabase.co:5432/postgres"
```

Paste it into `.env` as `DATABASE_URL`.

> **Note:** Supabase connection strings use port `5432` for direct connections
> and `6543` for the connection pooler (PgBouncer). Use `5432` for Prisma.

---

### Option E — Railway

1. Go to [railway.app](https://railway.app) → New Project → **+ New** → **Database** → **PostgreSQL**.
2. Click the PostgreSQL service → **Connect** tab → copy the **Postgres Connection URL**.
3. Paste it into `.env` as `DATABASE_URL`.

This is the same database you'll use in production, so it's a great option
if you want parity between local and deployed environments.

---

## 5. Run migrations

```bash
# Recommended for local dev — fast, no migration files created
npm run db:push

# Alternative — creates migration files in prisma/migrations/ (good for teams)
npm run db:migrate
```

`db:push` introspects your schema and creates/updates tables directly. It's
the fastest way to get started. Use `db:migrate` when you want a tracked
migration history (required for production deployments via `prisma migrate deploy`).

---

## 6. Seed the database

```bash
npm run db:seed
```

This creates:

| What | Details |
|------|---------|
| **3 subscription plans** | Starter (free), Pro (₹499/mo), Business (₹1499/mo) |
| **Super admin account** | Email/password from your `.env` `SUPER_ADMIN_*` vars |
| **Demo cafe owner** | `owner@mocha.cafe` / `Owner@123` |
| **Demo cafe** | "Cafe Mocha" — 5 tables, 5 categories, 12 menu items |

The seed is **idempotent** — running it multiple times is safe. It uses
`upsert` so existing records are updated, not duplicated.

---

## 7. Start the dev server

```bash
npm run dev
```

The app starts at **http://localhost:3000**.

| URL | Description |
|-----|-------------|
| `/` | Public landing page |
| `/login` | Login page |
| `/signup` | New cafe owner registration |
| `/dashboard` | Cafe owner dashboard (login as `owner@mocha.cafe`) |
| `/admin` | Super-admin panel (login with your `SUPER_ADMIN_EMAIL`) |
| `/cafe/cafe-mocha` | Demo customer-facing menu |
| `/cafe/cafe-mocha/table/TMOC-01xxx` | Customer ordering flow (scan a QR or use a table code from Prisma Studio) |

---

## 8. Explore the database (optional)

Prisma Studio gives you a visual browser for all your database tables:

```bash
npm run db:studio
# → http://localhost:5555
```

---

## Troubleshooting

### `Cannot find module '@prisma/client'`

The Prisma client wasn't generated. Run:

```bash
npm install
# postinstall runs `prisma generate` automatically
```

Or manually:

```bash
npx prisma generate
```

---

### `Error: P1001 — Can't reach database server at localhost:5432`

The database isn't running or the connection string is wrong.

1. Check that PostgreSQL is running:
   - Local: `pg_isready` or `brew services list | grep postgresql`
   - Docker: `docker ps | grep postgres`
2. Verify the host, port, username, and password in `DATABASE_URL`.
3. Try connecting manually: `psql "your-DATABASE_URL"`.

---

### `Error: P3005 — The database schema is not empty`

You're running `db:migrate` on a database that already has tables (e.g. from
a previous `db:push`). Options:

```bash
# Option 1: Use db:push (skips migration history, just syncs schema)
npm run db:push

# Option 2: Reset the database (⚠️ destroys all data)
npx prisma migrate reset
```

---

### `NEXTAUTH_SECRET` is missing or invalid

Make sure `.env` exists (not just `.env.example`) and contains:

```env
NEXTAUTH_SECRET="your-generated-secret-here"
```

Generate one with `openssl rand -base64 32`.

---

### `ENCRYPTION_KEY` error

The key must be exactly 64 hexadecimal characters. Generate one:

```bash
openssl rand -hex 32
```

The output is exactly 64 characters. Paste it directly — no quotes needed
inside the value (the `.env` file already wraps it in quotes).

---

### Customer OTP not working in development

This is expected. In development mode, the OTP is returned in the API
response JSON so you can copy-paste it without needing a real WhatsApp
delivery. Check the browser Network tab or server logs for the OTP value.

To enable real WhatsApp delivery, set:

```env
WHATSAPP_PROVIDER="cloud_api"
WHATSAPP_CLOUD_TOKEN="your-meta-token"
WHATSAPP_CLOUD_PHONE_ID="your-phone-id"
```

---

### Seed fails with `Unique constraint failed`

The seed uses `upsert` so it should be safe to re-run. If you see this error,
it usually means a unique field (like `cafe.slug`) already exists with
different data. Reset the database and re-seed:

```bash
npx prisma migrate reset   # drops all tables and re-runs migrations
npm run db:seed
```

---

### Port 3000 already in use

```bash
# Find what's using port 3000
lsof -i :3000        # macOS / Linux
netstat -ano | findstr :3000   # Windows

# Or just run on a different port
npm run dev -- -p 3001
```

---

## Environment variable reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | — | Session signing key (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | ✅ | — | Public app URL (`http://localhost:3000` locally) |
| `APP_URL` | ✅ | — | Same as `NEXTAUTH_URL` — used in QR codes & WA links |
| `APP_NAME` | ⬜ | `CafeQR Pro` | App display name |
| `SUPER_ADMIN_EMAIL` | ✅ | — | Super-admin email (created by seed) |
| `SUPER_ADMIN_PASSWORD` | ✅ | — | Super-admin password (created by seed) |
| `SUPER_ADMIN_NAME` | ⬜ | `Super Admin` | Super-admin display name |
| `ENCRYPTION_KEY` | ✅ | — | 64 hex chars — AES-256-GCM key for sensitive DB fields |
| `WHATSAPP_PROVIDER` | ⬜ | `manual` | `manual` / `cloud_api` / `baileys` |
| `WHATSAPP_CLOUD_TOKEN` | ⬜ | — | Meta Cloud API token (provider = `cloud_api`) |
| `WHATSAPP_CLOUD_PHONE_ID` | ⬜ | — | Meta Cloud API phone-number ID |
| `SMTP_HOST` | ⬜ | — | SMTP server hostname |
| `SMTP_PORT` | ⬜ | `587` | SMTP port |
| `SMTP_USER` | ⬜ | — | SMTP username |
| `SMTP_PASS` | ⬜ | — | SMTP password |
| `SMTP_FROM` | ⬜ | — | From address for outgoing emails |

---

## What the seed creates

Running `npm run db:seed` populates the database with everything you need to
explore the full app:

```
Plans
  ├── Starter   — Free, 5 tables, 30 items, 2 staff
  ├── Pro       — ₹499/mo, 30 tables, 200 items, 10 staff  ← most popular
  └── Business  — ₹1499/mo, 200 tables, 2000 items, 50 staff

Users
  ├── Super Admin  (your SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD)
  └── Riya Mehta   owner@mocha.cafe / Owner@123

Cafe: Cafe Mocha  →  /cafe/cafe-mocha
  ├── 5 tables (3 Indoor, 2 Outdoor)
  ├── Categories: Coffee, Tea, Pastry, Breakfast, Mains
  └── 12 menu items (Cappuccino, Cold Brew, Masala Chai, Avocado Toast, …)
```

The seed is safe to re-run — it uses `upsert` throughout.

---

*For deployment instructions, see the [Railway deployment section in README.md](./README.md#-deploying-on-railway).*
