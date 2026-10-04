# DEPLOY — putting the studio on Vercel

**Read this first: the app cannot work on Vercel as it stands.** It runs on a local SQLite
file and writes uploads to local disk. Vercel's functions have an **ephemeral, per-request
filesystem**, so:

- the SQLite database would reset (or be unreadable/writable) on every request, and
- uploaded artwork and print files would vanish.

So a deploy is **two code changes + credentials**, then Vercel. This file is the exact procedure.
Nothing here was run for you because it needs the owner's accounts and keys.

---

## What you need (owner's accounts)

1. A **Vercel** account — https://vercel.com (free Hobby is fine for a test).
2. A hosted **PostgreSQL** database — Supabase (https://supabase.com) or Neon (https://neon.tech).
3. A **storage bucket** for artwork/print files on the same host (Supabase Storage) or S3.
4. This repo pushed to GitHub: https://github.com/sachinandanbasak-wq/FWAI-SANKAR

---

## Step 1 — switch the database to Postgres

1. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. Put the Postgres connection string in `.env` (local) and later in Vercel:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
   ```
3. Apply the schema to the new database:
   ```powershell
   npx prisma db push
   # or, for a tracked migration:  npx prisma migrate dev --name init
   node prisma/seed.mjs
   ```

The tables and SQL do not change — only the provider and the URL.

## Step 2 — move uploads off local disk

`lib/storage.ts` currently writes to `./data/uploads` and `app/api/files/[...path]/route.ts`
serves it. Replace those two bodies with your bucket (Supabase Storage or S3). The rest of the
app calls `saveBytes()` / `readBytes()` and does not care where the bytes live.

## Step 3 — deploy

Either import the repo in the Vercel dashboard (Add New → Project → Import Git Repository),
or use the CLI:

```powershell
npx.cmd vercel@latest login      # opens a browser; needs the owner to sign in
npx.cmd vercel@latest --prod     # run from the sweet-ginger-studio folder
```

> **The CLI login is the wall described in `REPORT.md`.** It needs a human to sign in; it cannot
> be done from an automated shell.

## Step 4 — set environment variables in Vercel

Vercel → Project → Settings → Environment Variables (Production **and** Preview):

| Name | Value |
|---|---|
| `DATABASE_URL` | the Postgres connection string |
| `ADMIN_PASSWORD` | a real admin password |
| `SESSION_SECRET` | a long random string |

`.env` is **not** uploaded — these must be set in Vercel. Every environment variable the app reads
is in the list above (checked against the code).

## Step 5 — verify after deploy (do not skip)

Per `AGENTS.md`, a deploy is only done when the live URL is fetched and works:

```powershell
# 1. The site loads
Invoke-WebRequest "https://<your-app>.vercel.app/" -UseBasicParsing | Select-Object StatusCode

# 2. The database is reachable and seeded
Invoke-WebRequest "https://<your-app>.vercel.app/api/products" -UseBasicParsing | Select-Object StatusCode,Content

# 3. Place a test order and confirm it persists (refresh /admin and see it still there)
```

A 404 or 500 means the deploy is not done, whatever the dashboard says. The most common failure
on Vercel is a missing/incorrect `DATABASE_URL` or the provider still set to `sqlite`.

---

## Build notes already handled

- `package.json` has `"postinstall": "prisma generate"`, so Vercel generates the Prisma client
  during install (without it, the build can fail with "Prisma client not generated").
- The pages are dynamic, so `next build` does not need a live database.
- `prisma/dev.db`, `.env`, `node_modules/`, `.next/` and `data/uploads/` are git-ignored, so none
  of them reach Vercel.
