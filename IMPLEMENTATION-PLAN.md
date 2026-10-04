# IMPLEMENTATION-PLAN — Sweet Ginger Design Studio

Build the smallest provable slice, prove it, then take the next. Each phase ends with a **command
you can run** and **what you should see**. Phases are ordered so each one rests on a proven
foundation.

Rule for every phase: if a change would break one of the five rules in `PRD.md` §5, it is a bug even
if the feature "works".

---

## Phase 0 — Foundation (prerequisite)

**Build:** project scaffold, Prisma schema, settings/products seed, pricing module, base layout.

- Next.js 14 App Router + TypeScript + Tailwind.
- Prisma schema: `Product`, `Color`, `Size`, `PriceTier`, `Setting`, `Order`, `OrderItem`, `AdminUser`.
- Seed: 3 T-shirt products (crew, oversized, polo) with colours, sizes, DUMMY prices and DUMMY tiers.
- `lib/pricing.ts` — pure functions `computeUnitPrice`, `computeTotals`.
- Vitest test for pricing.

**Prove it:**
```
npm run test        -> pricing tests pass
npm run build       -> compiles
```

**Done when:** the pricing tier logic is proven by a test, and the app builds.

---

## Phase 1 — Product picker + pricing (retail and bulk price shown)

**Build:** landing page listing products from the DB; product card shows retail price and the bulk
price for the first big tier; select a product → studio route with product + colour chosen.

- `GET /api/products` reads from the DB.
- Product card copy: *"₹[DUMMY] each; ₹[DUMMY] each for [DUMMY]+"*.
- Colour and size come from DB rows, not hardcoded.

**Prove it:**
```
npm run dev
# open http://localhost:3000  -> products render with two prices each
```

**Done when:** prices shown come from the database (edit the seed, the page changes on restart).

---

## Phase 2 — Canvas + live preview

**Build:** the studio canvas.

- Konva stage sized to the product print area; shirt rendered as a recolourable shape with shading.
- Add text (font, colour, size controls) and upload artwork (PNG/JPG).
- Move, scale, rotate; clamp every element inside the visible print area on release.
- Front / back tabs, each with its own element list.
- Live preview uses a **multiply** blend so the design reads as printed on fabric.
- Changing colour or size does not touch the element array (rule 1).

**Prove it (manual checklist):**
```
- add text, move it, switch colour  -> text stays put (rule 1)
- drag outside the print area       -> snaps back inside (rule 2)
- upload a .gif                     -> rejected, clear message
- upload a tiny 20x20 png           -> rejected, clear message
- switch front/back                 -> designs are independent
```

**Done when:** the five manual checks above behave exactly as stated.

---

## Phase 3 — Order, cart, checkout (single and bulk through one studio)

**Build:** quantity and size breakdown on the same studio page.

- Size breakdown grid: one quantity per size; retail defaults to 1 piece; bulk buyer enters 70.
- Price recalculates live from the same pricing module (rule 3).
- Add to cart → cart page → checkout form (name, phone, email, address, notes, print method).
- Checkout **validates at the edge**: reject missing required fields or an empty design with a clear
  message and save nothing (rule 4).
- On success, export front/back print-ready PNGs, upload them, and save the order with its design JSON.

**Prove it:**
```
- place a 1-piece order          -> appears in DB with design JSON + print file
- place a 70-piece bulk order    -> price uses the bulk tier
- submit with an empty design    -> rejected, nothing saved
- submit with a bad phone        -> rejected, clear message
```

**Done when:** all four above behave as stated and an order cannot exist without a design.

---

## Phase 4 — Admin + print files

**Build:** admin login and order management.

- `/admin/login` — password from `ADMIN_PASSWORD`; signed session cookie.
- `/admin` — order list with customer details, status filter, design thumbnail.
- Download artwork (uploaded file) and print-ready PNG per side.
- Status buttons: New → In production → Printed → Shipped.
- Print-method note: embroidery (fewer colours, no fine detail) and vinyl (solid shapes) flagged.

**Prove it:**
```
- open /admin without login     -> redirected to login
- log in with the wrong password-> rejected
- log in                        -> orders listed
- change a status               -> persists after refresh
- download print-ready PNG      -> a valid PNG downloads
```

**Done when:** all five above behave as stated.

---

## Phase 5 — Optional extras (only after 1–4 pass)

Not built unless requested: AI design generation, background removal, customer accounts with saved
designs. The data model already stores a design as structured JSON and an order holds customer
identity, so each is additive.

---

## Test checklist mapping (the five rules)

| Rule | Where it is enforced | How it is proven |
|---|---|---|
| 1. Design never lost on colour/size/qty change | element state is separate from product state | manual check in Phase 2 + unit test that design JSON is untouched by product change |
| 2. Preview matches colour and placement | shirt node reads colour hex; design clipped to print area | manual check + screenshot |
| 3. Price from product + qty with bulk tier | `lib/pricing.ts` | Vitest unit tests |
| 4. Order always carries design; no artwork = no order | Zod validation in the order route | test that empty design is rejected and not saved |
| 5. Single and bulk use one studio | one page, one canvas; only quantity control differs | manual: place both order types from the same page |

---

## Order of work I will follow

1. Write this plan set (done).
2. Phase 0 + Phase 1, prove, report.
3. Phase 2, prove, report.
4. Phase 3, prove, report.
5. Phase 4, prove, report.
6. Write `REPORT.md` and the beginner setup guide.

If anything in `PRD.md` or this plan turns out to be wrong while building, I edit the document in the
same change and say which one and why.
