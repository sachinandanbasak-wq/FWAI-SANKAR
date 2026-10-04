# TECH-STACK — Sweet Ginger Design Studio

This document answers one question: **what do we build it with, and why that?**
Every choice is paired with the constraint that forced it. Where we deviate from the brief, the
reason is stated plainly and the migration path is named.

---

## 1. The one constraint that shapes everything: provability

The harness rules say *"never state an outcome you have not seen in real command output."*
That means the stack must be something I can **install, run and fetch today** on this Windows
machine, not something that depends on an account or a key I was not given.

I was **not given Supabase or Neon credentials**, and creating those accounts is a login wall for
the owner, not a decision I can make. So the brief's suggested database host is treated as the
**production target**, and the local build uses the same relational shape on a store I can run.

This is a **config switch, not a rewrite**, because everything below is standard relational SQL via
Prisma; only the connection string and Prisma's `provider` change.

---

## 2. Language and framework

**Choice: TypeScript + Next.js 14 (App Router).**

- One language for the canvas UI, the pricing logic and the server routes.
- The App Router gives pages, API routes and a deploy story in one project.
- Vercel/Netlify deploy is a config switch later.

The brief suggested exactly this; kept.

---

## 3. Canvas editing

**Choice: Konva, used through `react-konva`.**

- Konva is a real 2D scene graph: drag, scale and rotate are built in, and hit-testing is built in.
- `react-konva` keeps the canvas declarative, so React state *is* the design — which is exactly what
  rules 1 and 2 demand (change colour → only the shirt node changes; the design nodes are untouched).
- **Exports are easy:** a hidden Konva `Stage` at print dimensions can be exported to a transparent
  PNG per side with `toDataURL`, so a print-ready file is generated from the same data that was edited.

**Rejected: Fabric.js.** Capable, but it manages its own imperative object model. Keeping Fabric's
object graph and React's state in sync is the classic source of "the design jumped" bugs. The brief
allowed either; Konva wins because the React binding removes the sync bug class.

---

## 4. Styling

**Choice: Tailwind CSS 3.**

- Fast to build a clean mobile-first layout with no designer.
- No component library: this app has a handful of screens and a canvas; a heavy kit would fight the
  canvas and add weight.

---

## 5. Database — the deliberate deviation

**Choice: PostgreSQL in production; SQLite locally for this build.**

- The schema is **plain relational**: products, colours, price tiers, settings, orders, order items.
  Money is stored as **integer paise** (`Int`), never a float.
- **Now:** Prisma with `provider = "sqlite"` and a local `dev.db`. This runs with zero external
  services, so I can actually prove the five rules.
- **Production:** change `provider` to `"postgresql"`, point `DATABASE_URL` at Supabase/Neon, run one
  migration. The SQL, the tables and the queries do not change.

**Why not Supabase directly now:** no credentials, and an app I cannot run is an app I cannot verify.
**Why not a JSON file store:** the brief explicitly wants database tables and an admin-editable
settings table; a relational schema is the honest version and is what a printer/order system needs.

*Honest note for the report:* if the owner wants this live on Supabase, that is a 15-minute swap, but
**I cannot do it without their Supabase login/keys** (see `REPORT.md`, BLOCKED section).

---

## 6. File storage

**Choice: local disk under `./data/uploads`, served through a server route; swappable to Supabase
Storage / S3.**

- Uploaded artwork and exported print files are written to disk by an API route.
- A storage module wraps reads/writes, so replacing disk with a bucket later touches one file.
- **Why not store in the browser only:** the admin must be able to download the artwork and the
  print-ready file long after the customer's browser is closed.

*On serverless (Vercel) the filesystem is ephemeral; production must point the storage module at a
bucket. This is documented, not hidden.*

---

## 7. Auth

**Choice: a signed session cookie for a single admin account, password from an environment variable
(`ADMIN_PASSWORD`), password hashing via Node's built-in `crypto.scrypt`.**

- The only login in v1 is the admin (customers check out as guests).
- No third-party auth dependency, no native module, nothing I cannot run.
- **Production path:** Supabase Auth is additive when customer accounts arrive (Open Question / §4.6),
  because orders already carry an optional customer identity.

**Rejected:** rolling a full user table with self-managed sessions now — the brief only needs an admin
gate, and the customer-login feature is explicitly optional.

---

## 8. Validation and pricing logic

**Choice: Zod schemas + one pure pricing function, unit-tested with Vitest.**

- The five rules are enforced by testable pure functions, not spread through UI code.
- `computeUnitPrice(tiers, qty)` and `computeTotals(items)` are plain functions I can prove with a test.
- Phone and address validation use Indian formats.

---

## 9. What is NOT added (and why)

| Not added | Because |
|---|---|
| Payment gateway | v1 checkout collects details; payment is offline, as today |
| Real-time / websockets | One admin reads orders on demand; a refetch is enough |
| AI generation, background removal | Explicitly optional, after 1–5; data model already supports adding an image element |
| Component library | Not needed for this UI surface |
| Docker / Kubernetes | Overkill; one process, one file database |

---

## 10. MVP vs production — what changes and how

| Layer | Local build (now) | Production | Change type |
|---|---|---|---|
| Framework | Next.js 14 + TS | Same | None |
| Canvas | Konva + react-konva | Same | None |
| Styling | Tailwind 3 | Same | None |
| Database | SQLite via Prisma | Postgres (Supabase/Neon) | **Config switch** (provider + URL) |
| Money | integer paise | Same | None |
| Storage | local disk | Supabase Storage / S3 | **Small adapter swap** |
| Auth | env admin password | Supabase Auth (additive) | Additive |
| Hosting | `next start` locally | Vercel / Netlify | **Config switch** |
| Background jobs | none | none | — |

**The only real risk to avoid later:** whether the studio needs customer accounts. The schema keeps
`customerEmail` / `customerPhone` on the order from day one, so adding accounts is additive, not a
migration.
