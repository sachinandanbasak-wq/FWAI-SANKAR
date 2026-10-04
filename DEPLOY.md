# DEPLOY — Vercel + Supabase Postgres

Status of the code (already applied and verified locally against Supabase):

- `prisma/schema.prisma` uses `provider = "postgresql"`.
- `lib/storage.ts` stores uploaded artwork and print files in the **`StoredFile` table**, because
  Vercel's filesystem is ephemeral. No bucket is required.
- `package.json` has `"postinstall": "prisma generate"` so Vercel installs the Prisma client.

What is left is the deploy itself, which needs the owner's Vercel account.

---

## 1. Database

- Supabase project ref: `lsdofemyjdklkcrzgkax`
- Tables created with `npx prisma db push`; seeded with `node prisma/seed.mjs`.
- **Use the session pooler (IPv4), not the direct host** — Supabase's direct host is IPv6-only and
  Vercel needs IPv4:
  ```
  postgresql://postgres.lsdofemyjdklkcrzgkax:<DB-PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
  ```
  URL-encode the password: `@` becomes `%40`. Region for this project is `ap-southeast-1`.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Value |
|---|---|
| `DATABASE_URL` | the session-pooler URI above |
| `ADMIN_PASSWORD` | a real admin password (not the default) |
| `SESSION_SECRET` | a long random string |

## 3. Deploy

```powershell
npx.cmd vercel@latest deploy --prod --yes --token <VERCEL_TOKEN>
```

Run from `sweet-ginger-studio`. The CLI deploys the local files directly (no GitHub import needed).

## 4. Verify after deploy (do not skip)

```powershell
Invoke-WebRequest "https://<app>.vercel.app/"             -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest "https://<app>.vercel.app/api/products" -UseBasicParsing | Select-Object StatusCode,Content
```

Then place a test order and refresh `/admin`: if the order is still there, the database is wired.

A 404 or 500 means the deploy is not done, whatever the dashboard says. The usual cause is a
missing/incorrect `DATABASE_URL`.

---

## Known limits of this deploy

- Print-ready PNGs live in Postgres. Fine for a demo; move them to object storage if volume grows.
- Supabase free tier: 500 MB database and it may pause after a week of inactivity.
- The session pooler has a limited number of connections; for real traffic, switch the app to the
  transaction pooler (port 6543, `?pgbouncer=true`) and keep migrations on the direct connection.
