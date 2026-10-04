# REPORT — Sweet Ginger Design Studio

Deliverables first: `PRD.md`, `TECH-STACK.md`, `IMPLEMENTATION-PLAN.md` are in this folder, followed
by working code, this report, and `README.md` (beginner setup + test checklist).

---

## Status per part

**Phase 0 — Foundation: DONE**
  evidence: `npx.cmd prisma generate` -> "Generated Prisma Client (v6.1.0)"; `npx.cmd prisma db push`
  -> "Your database is now in sync with your Prisma schema. Done in 142ms."; `node prisma/seed.mjs`
  -> "Seeded 3 products, 13 settings."

**Phase 1 — Product picker + pricing: DONE**
  evidence: `GET /` -> "200 ... home contains product name: yes"; `GET /api/products` -> "200, count=3
  ... tiers=3".

**Phase 2 — Canvas + live preview: DONE (logic proven; pixel behaviour UNVERIFIED see below)**
  evidence: build compiles the `react-konva` canvas; `lib/geometry.ts` clamp logic proven by 6 tests
  (`tests/geometry.test.ts` all pass). Real browser drag/rotate/multiply rendering: **UNVERIFIED — no
  browser tool available in this environment.**

**Phase 3 — Order, cart, checkout (single + bulk): DONE**
  evidence: valid 70-piece order -> "C valid-bulk -> 200 {"ok":true,...,"totalPaise":2023000}"; empty
  design -> "A empty-design -> 400 ... An order cannot be placed without a design."; DB shows exactly
  one order with the design attached.

**Phase 4 — Admin + print files: PARTIAL**
  - Admin login, list, filter, status update, artwork download, design-JSON download: **DONE**.
    evidence: "without login -> 401", "wrong password -> 401", "correct -> 200", "PATCH -> 200",
    "filter PRINTED -> orders=1 firstStatus=PRINTED", "invalid status -> 400".
  - Print-ready PNG export (transparent PNG per side at print DPI): **UNVERIFIED** — this runs in the
    browser (`lib/print-export.ts`) and needs a real browser to prove. The code path is wired into
    checkout; it was not executed in this environment.

**Deployment (Vercel + Supabase Postgres): DONE and verified live**
  - Live: https://sweet-ginger-studio-pied.vercel.app
  - Supabase project `lsdofemyjdklkcrzgkax` (region ap-southeast-1); tables pushed and seeded.
  - Files are stored in the `StoredFile` table because Vercel's filesystem is ephemeral.
  - evidence (fetched live): `/api/products` → "200 products=3"; upload → stored in Postgres and
    served back "200 image/png bytes=70"; a 30-piece order → "200 totalPaise:987000" (30 × ₹329,
    10–49 tier); pages `/`,`/studio/...`,`/cart`,`/checkout`,`/account/login`,`/admin/login` → all 200;
    admin login → 200, 2 orders listed, status updated to IN_PRODUCTION → 200.

**AI generation + sleeve print areas: DONE and verified live**
  - Four print areas per product: front, back, left sleeve, right sleeve (geometry in the DB).
  - AI: short text prompt → image via Pollinations (no API key) → stored in `StoredFile` → added to
    the selected side. Route: `app/api/generate/route.ts`.
  - evidence (local): `/api/generate` → "200 provider=pollinations ... 70554 bytes"; short prompt →
    "400"; product → "printLeftSleeve=2.4x2.4in at (0.9,4.6)"; left-sleeve order → "200"; db-report →
    "left_sleeve=1 ... print: leftSleeve=yes".
  - evidence (live Vercel): studio markers AI panel/Left sleeve/Right sleeve True; `/api/generate` →
    "200 ... 39044 bytes"; right-sleeve order → "200 totalPaise:79800"; admin → "rightSleevePrintUrl
    set: True, right=1". Tests 31 passed; build ✓.

**AI generation resilience: DONE (with a documented limit)**
  - Cause of the user's error found: Pollinations' free tier exposes only the `sana` model; the default
    model is token-gated, so a Vercel (datacenter) IP gets one free image then **402**.
  - Fix: request the free `sana` model, retry, and fall back to **AI Horde** (free, keyless) with the
    job polled by the client so generation is non-blocking and repeatable on any side.
  - evidence (live): forced fallback -> call 1 `done provider=pollinations`; call 2 `pending provider=horde`;
    job followed -> `DONE after ~420s -> /api/files/...webp (image/webp, 33436 bytes)`; fast path re-test
    -> `200 image/jpeg 45517 bytes`.
  - **Honest limit:** there is no fast, unlimited, keyless image generator. The fast path is a small
    free allowance; the free fallback is queued (minutes). For fast/unlimited, set a free
    `POLLINATIONS_TOKEN` or a paid key — the code already supports both.

**Admin privacy: DONE**
  - The admin link is removed from the public navigation; `/admin` is reached by its URL + password.
  - `app/admin/layout.tsx` sets `robots: noindex`; `app/robots.ts` disallows `/admin` and `/api/admin/`.
  - `/api/admin/login` rate-limits attempts (8 per 10 min per IP, best-effort) and delays failures 500 ms.
  - Password rotated in Vercel. evidence: home `href="/admin"` False; robots.txt "Disallow: /admin";
    `/admin` 200 with noindex; old password → 401; new password → 200; admin orders listed (4).
  - NOTE: hiding the link and noindex are *obscurity*, not access control. The real gate is the
    password on the API; the admin API returns 401 without a valid signed cookie.

**Phase 5 — Optional extras (background removal, saved designs): PARTIAL**
  - Customer accounts — profile (name/phone/email/address, editable) and order history with current
    status: **DONE and verified.** evidence: register → 200; `/api/account/me` without cookie → 401,
    with cookie → 200; duplicate register → 409; wrong password → 401; `PATCH` profile → 200 and
    persists; short address → 400; new signed-in order → linked; `GET /api/account/orders` → 2 orders
    (NEW and PRINTED); DB shows `customers: 1`, `linked orders: 2`.
  - AI design generation and background removal: **NOT BUILT** (still out of scope).

---

## What broke and how I fixed it

1. **`npm` refused to run in PowerShell** ("running scripts is disabled"). Used `npm.cmd`, which is
   the supported Windows entry point. No code change.
2. **`prisma db push` failed: "Environment variable not found: DATABASE_URL".** Cause: the Prisma CLI
   reads `.env`, not Next's `.env.local`. Fix: added a `.env` containing `DATABASE_URL` (safe to
   commit) and kept secrets in `.env.local` (git-ignored). Re-ran; schema created.
3. **First order-API test returned 400 "Expected string, received number".** Cause: I named the
   payload variable `$pid`, which PowerShell treats as read-only (process id), so the real product id
   was never used. Fix: renamed to `$productId` and re-ran. This was a test-script bug, not an app bug.
4. **`next build` and `next dev` both use `.next/`.** Stopped the dev server before building to avoid
   the two writing the same folder. Ran tests + build together afterwards; both pass.

No check was weakened, no test deleted, nothing swallowed in a try/catch to make an error disappear.

---

## Claims ledger

Every claim, with the command that proves it. Anything not proven is marked UNVERIFIED.

| Claim | Proof (real output) |
|---|---|
| 23→29 unit tests pass | `npx.cmd vitest run` -> "Test Files 3 passed (3) / Tests 29 passed (29)" |
| App compiles for production | `npm.cmd run build` -> "✓ Compiled successfully" + 15 routes |
| Products come from the database | `GET /api/products` -> "count=3 ... tiers=3" |
| Home page renders products | `GET /` -> "200 ... contains product name: yes" |
| Studio page renders | `GET /studio/crew-neck-tshirt` -> "200" |
| **Rule 3:** bulk tier applied | 70 pieces -> `"totalPaise":2023000` = 70 × ₹289 (50+ tier) |
| **Rule 4:** empty design rejected, nothing saved | `400 {"error":"Add text or artwork before ordering. An order cannot be placed without a design."}`; `scripts/db-report.mjs` -> "order count: 1" |
| **Rule 4:** bad phone rejected | `400 {"error":"Enter a valid 10-digit Indian mobile number ..."}` |
| Order carries its design | `scripts/db-report.mjs` -> "design front=1 back=0" |
| **Rule 2 (logic):** element cannot leave print area | `tests/geometry.test.ts` 6 tests pass |
| **Rule 1 (logic):** clamp never changes id/text/rotation | same test file |
| Upload accept / reject / serve | png -> 200 url; `.txt` -> 400; `GET` file -> "200 content-type=image/png" |
| Admin gate | no cookie -> 401; wrong pw -> 401; right pw -> 200 |
| Status workflow + filter | PATCH -> 200; `?status=PRINTED` -> orders=1 |
| Customer register/login gate | register → `200`; `/api/account/me` no cookie → `401`; wrong password → `401`; duplicate email → `409` |
| Customer profile edit persists | `PATCH /api/account/me` → `200 savedName=Ravi Sharma`; short address → `400` |
| Order history with current status | `GET /api/account/orders` → `orders=2` (`SG-20261004-8IJR` NEW, `SG-20261004-N8SU` PRINTED) |
| Past guest orders claimed by email | register with `orders@example.com` → the earlier PRINTED order appears; DB "linked orders: 2 guest orders: 0" |
| Account pages load | `/account/login`, `/account/register`, `/account` → all `200` |
| **Rule 1/2 in a real browser** | **UNVERIFIED** — pixel rendering and drag/rotate not executed |
| Print-ready PNG export | **UNVERIFIED** — browser-only code, not executed |
| **Rule 5** single+bulk same studio | Proven at the API level (both produce the same order shape); the UI path is **UNVERIFIED** in a browser |
| No secrets reach the browser | `ADMIN_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL` are read only in server routes / Prisma; no `NEXT_PUBLIC_` secret exists |
| npm reported vulnerabilities | `npm.cmd install` -> "12 vulnerabilities (3 moderate, 7 high, 2 critical)" — see caveats |

---

## Rules check

- **Rule 1 (design never lost on colour/size/quantity change):** structurally guaranteed — `colorHex`,
  `singleSize`/`bulkSizes` and `design` are separate React states; colour/size/quantity handlers never
  touch `design`. The clamp function is tested never to alter id/text/rotation. Browser click-through
  UNVERIFIED.
- **Rule 2 (preview matches colour/placement):** shirt `Path` fill is bound to `colorHex`; elements are
  clipped to the print-area group; clamp tested. Pixel look UNVERIFIED.
- **Rule 3 (price from product + qty, bulk tier):** proven by unit tests and by a live 70-piece order.
- **Rule 4 (order always carries design; no artwork = no order):** proven live (400 + not persisted)
  and by unit tests.
- **Rule 5 (single and bulk, one studio):** one page, one canvas; API treats both identically. Browser
  click-through UNVERIFIED.

---

## BLOCKED

```
BLOCKED: Deploying to Supabase/Neon Postgres (the brief's suggested database host) and to Vercel/Netlify.
  Tried:      Checked for Supabase/Neon/Vercel credentials (none provided); did not create accounts.
  Got:        No credentials or login were supplied, and account creation is the owner's decision.
  Wall:       Provisioning a hosted database or a deploy requires Shankar's Supabase/Vercel login and keys.
  To unblock: Shankar (or whoever owns the accounts) creates a Supabase project + a Vercel project and
              provides (a) the Postgres connection string, (b) the two env values ADMIN_PASSWORD and
              SESSION_SECRET. Then: change prisma provider to "postgresql", set DATABASE_URL, run one
              migration, point lib/storage.ts at a bucket, and deploy.
```

Everything that does **not** depend on that is done and verified locally.

---

## Caveats (read before showing the owner)

1. **All prices, bulk break points and print geometry are DUMMY placeholders.** They are labelled as
   such in the UI and in the seed. The one clear question for Shankar is in `PRD.md` §8: *what are the
   real retail and bulk prices and break points for the crew, oversized and polo tees?*
2. **Storage is local disk** (`data/uploads`). On serverless hosts that disk is ephemeral; production
   must point `lib/storage.ts` at Supabase Storage or S3.
3. **Uploaded files and print files are served from a public URL** (`/api/files/...`) in this build, so
   the canvas can load them. Before a public launch, move print files behind admin auth (or use signed
   URLs).
4. **`npm audit` reports 12 vulnerabilities**, largely from the pinned Next.js 14.2.15. This is a
   known trade-off: 14.2.x was chosen for stability with React 18 / react-konva 18. Before shipping,
   plan a Next.js upgrade and re-test.
5. **Inline product geometry** is seeded manually (the T-shirt SVG silhouette is an approximation, not
   the brand's real garment photo). A real mockup image per colour is a drop-in later.

---

## What I would tell the next person

- Start with `README.md`; `npm.cmd run setup` then `npm.cmd run dev`. The app runs with zero keys.
- The five rules are enforced in three places: `lib/pricing.ts` (rule 3), `lib/validation.ts` (rule 4),
  and `lib/geometry.ts` (rules 1/2). Keep those pure and tested; keep UI code thin.
- The most expensive thing to get wrong later is **where designs are stored and how they are exported**.
  They are already structured JSON in `OrderItem.designJson` plus a print PNG per side — do not
  collapse that into a screenshot.
- **Prove the browser bits first.** The one gap in this report is a real-browser pass over drag/rotate,
  the multiply preview, and the print-PNG export. That is the next thing to do, with the
  chrome-devtools MCP turned on for the session.
- **Get the real prices from Shankar** and delete the "placeholder" labels. Everything else is a
  settings edit, not a code change.
