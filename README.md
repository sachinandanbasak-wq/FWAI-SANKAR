# Sweet Ginger Design Studio

A self-serve T-shirt design studio for Sweet Ginger Fashions, Jaipur. A customer picks a blank,
adds text or artwork, sees it on the real shirt colour, and orders **one piece or a bulk batch
across sizes** — in the same studio. The admin side lists orders, downloads the artwork and a
print-ready PNG per side, and moves each order through production.

**Live:** https://sweet-ginger-studio-pied.vercel.app — shop at `/`, admin at `/admin`.
Database: Supabase Postgres. Files are stored in the `StoredFile` table.

Read the plan first: `PRD.md`, `TECH-STACK.md`, `IMPLEMENTATION-PLAN.md`.

---

## 1. What you need

- **Node.js 18 or newer** (built and tested on Node 24).
- Windows, macOS or Linux.
- No database server, no cloud account, no keys. It runs entirely on your machine.

> On Windows PowerShell, if `npm` is blocked by an execution-policy error, use `npm.cmd` instead
> of `npm` (this project was built and tested that way).

---

## 2. First-time setup (copy one block at a time)

```powershell
# 1. Go to the project folder
cd "C:\Users\Sachinandan Basak\OneDrive\Documents\FWAI-CRM\sweet-ginger-studio"

# 2. Install packages (takes a couple of minutes)
npm.cmd install

# 3. Create your local environment file
Copy-Item .env.example .env

# 4. Create the database and load the dummy products/prices
npm.cmd run setup
```

`npm.cmd run setup` does three things: generates the database client, creates the SQLite database
(`prisma/dev.db`), and seeds three T-shirts with dummy prices and settings.

**Then open `.env` and change two values before showing this to anyone:**

```
ADMIN_PASSWORD="pick-a-real-password"
SESSION_SECRET="a-long-random-string"
```

> **All prices seeded are DUMMY placeholders.** They are safe to run, but they are not real prices.

---

## 3. Run it

```powershell
npm.cmd run dev
```

Open **http://localhost:3000**.

- **Shop / studio:** click *Customize* on a T-shirt.
- **Cart / checkout:** add a design to the cart, then check out.
- **Admin:** http://localhost:3000/admin — sign in with `ADMIN_PASSWORD` from `.env`.
  The default in `.env.example` is `change-me-admin`.

To run the tests:

```powershell
npm.cmd run test
```

To build for production:

```powershell
npm.cmd run build
npm.cmd run start
```

---

## 4. How to use the studio

1. Pick a blank on the home page.
2. Choose **front** or **back** (each side has its own design).
3. Add **text** (font, colour, size) and/or **upload artwork** (PNG or JPG).
4. Drag to move, drag the corners to resize, use the top handle to rotate. Elements snap back
   inside the dashed **print area**.
5. Choose the **shirt colour** — the preview updates and the design stays.
6. Choose **Single** (one size, one quantity) or **Bulk** (a quantity per size, e.g. S 10 M 25 L 25
   XL 10). The price updates live and uses the bulk tier.
7. Pick a **print method**, then **Add to cart** and check out.

### Customer accounts (profile and order tracking)

- **Create an account** at `/account/register`, or sign in at `/account/login`.
- `/account` shows the customer's **profile** (name, phone, email, address — all editable) and their
  **orders with the current status**: New, In production, Printed, Shipped.
- When a signed-in customer checks out, the order is linked to their account automatically.
- If someone orders as a guest and later registers/logs in **with the same email**, those past orders
  are linked to the account, so they appear straight away.
- Guest checkout still works without an account.

---

## 5. Database tables (what each one is for)

| Table | Holds |
|---|---|
| `Product` | Blanks: name, category, retail price, shirt geometry, print areas |
| `Color` | The colours available per product (name + hex) |
| `Size` | The sizes available per product |
| `PriceTier` | Bulk price bands per product (`minQty`, `maxQty`, `unitPricePaise`) |
| `Setting` | All app settings (upload rules, DPI, statuses, print methods…) |
| `Customer` | Customer accounts: name, email, phone, address, hashed password |
| `Order` | Customer details, total, status, print method, optional link to `Customer` |
| `OrderItem` | One designed product line: colour, size breakdown, design JSON, print file URLs |

**Money is stored as integer paise, never a float.** Design geometry is stored in *print units*
where 1 inch = 100 units.

### Changing prices without touching code

- Prices and bulk bands live in `PriceTier` (per product). Edit them in the database, or edit the
  `PRODUCTS` list at the top of `prisma/seed.mjs` and re-run `node prisma/seed.mjs`.
- Everything else (max upload size, minimum image size, print DPI, status names, print methods) lives
  in `Setting` and is seeded from the `SETTINGS` object in `prisma/seed.mjs`.

> The UI labels placeholder prices as "Placeholder pricing — to be confirmed". Replace the seed
> values with Shankar's real numbers, then remove that note.

---

## 6. Test checklist (the five rules)

Run `npm.cmd run test` first — 29 automated tests cover pricing, validation and the print-area clamp.

Then check these by hand in the browser:

| # | Rule | How to check | Expected |
|---|---|---|---|
| 1 | Design is never lost when colour/size/quantity changes | Add text, switch shirt colour, switch size, change quantity | The text stays exactly where it was |
| 2 | Preview matches the chosen colour and placement | Switch colours; drag an element outside the dashed box | Shirt fill changes; element snaps back inside |
| 3 | Price from product + quantity, with a bulk tier | Set bulk S 10 M 25 L 25 XL 10 (=70) | Price per piece drops to the 50+ tier; total = 70 × bulk price |
| 4 | No design ⇒ no order | Try to check out with an empty canvas | Clear message; nothing is saved |
| 5 | Single and bulk use one studio | Place a 1-piece order and a 70-piece order from the same page | Both work; the order type is recorded as single/bulk |

Extra check — **customer account:**

| Area | How to check | Expected |
|---|---|---|
| Register / sign in | Go to `/account/register`, create an account, then sign out and back in | You land on `/account` |
| Profile edit | Change name/phone/address and save | "Your details are saved."; value persists after refresh |
| Current order status | Place an order while signed in, open `/account` | The order appears with its status badge (New → … → Shipped) |
| Past guest orders | Order as guest with an email, then register with that email | The earlier order appears in the account |

Automated checks for rules 3 and 4 (run against the running server) are in `scripts/` notes in
`REPORT.md`.

---

## 7. Deployment (Vercel + Supabase Postgres)

The app now runs on **Postgres** (`prisma/schema.prisma` → `provider = "postgresql"`) and stores
uploaded artwork and print files **in the database** (`StoredFile` table), so it works on a
serverless host with an ephemeral filesystem.

Environment variables the app reads (set these in Vercel → Settings → Environment Variables):

| Name | Value |
|---|---|
| `DATABASE_URL` | Supabase Postgres URI (session pooler, port 5432 — IPv4) |
| `ADMIN_PASSWORD` | a real admin password |
| `SESSION_SECRET` | a long random string |

`.env` is **not** uploaded. Full procedure and the exact unblock steps are in `DEPLOY.md`.

Before a public launch: add **email verification** (so "claim past orders by email" cannot be
abused), and consider moving files from the database to object storage if volume grows.
