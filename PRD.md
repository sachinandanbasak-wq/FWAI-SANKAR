# PRD — Sweet Ginger Design Studio

**Version: DRAFT v1 — 4 Oct 2026**
**Owner of the business: Shankar Hemrajani, Sweet Ginger Fashions (Jaipur).**
**Built by: senior full-stack engineer + PM (Kilo).**

> This document answers one question only: **what are we building, and for whom?**
> It does not name technology. Every number that the business has not confirmed is written
> `[DUMMY]` and lives in an admin-editable settings table, not in code.

---

## 1. The problem, in one paragraph

Custom T-shirt orders at Sweet Ginger Fashions today run through WhatsApp and email: the customer
describes what they want, someone on Shankar's team asks for sizes and artwork, checks the price,
and repeats this by hand for every order. It is slow, it loses artwork, and it does not scale across
three verticals. We are replacing that back-and-forth with a self-serve studio where a retail
customer designs one shirt and a bulk buyer designs one shirt and orders 70 of them — **the same
studio, the same canvas, the same flow.**

The three verticals this serves:

- **Sweet Ginger Basics** — B2B/wholesale blanks (tees, polos, hoodies, sweatshirts) for resellers, corporate gifting, events, printers.
- **The T-Shirt Shop** — retail / D2C, stores plus online store.
- **Ginger Prints** — printing and customisation (DTF, embroidery, vinyl) on tees and caps.

The customisation job belongs to **Ginger Prints**, but the product catalogue and the brand belong to
the two stores. The studio is a **standalone app that can later be linked from The T-Shirt Shop's
"Customize" button** (Open Question 5, default).

---

## 2. Users

| User | What they are trying to do | Constraints |
|---|---|---|
| **Retail customer** | Design one shirt, order 1–2 pieces | Mostly on a phone; low patience |
| **Bulk buyer** (event, company, reseller) | Design once, order many across a size breakdown | Needs per-size quantities and a bulk price; often desktop |
| **Admin** (Shankar's team) | See incoming orders, download artwork, update production status | Needs a print-ready file per side, per order; filters by status |

Both customer types use **the same studio**. The only difference is the quantity and size controls
shown at order time.

---

## 3. The studio flow (copied from CustomInk Design Lab)

1. Pick product (T-shirts first: crew, oversized, polo).
2. Pick colour.
3. Design on the canvas: add text and upload artwork.
4. Placement: move, scale, rotate inside a visible print area.
5. Front and back, each with its own design.
6. See the live preview on the real shirt colour.
7. Quantity + size breakdown, price updates live.
8. Cart and checkout.
9. Order saved **with its design**, so it can be reproduced exactly for printing.

---

## 4. Core features

### 4.1 Product picker
- Browse blanks. **Phase 1: T-shirts (crew, oversized, polo).** Hoodies and caps are later if time allows.
- Each product has colours and sizes.
- Each product shows a **retail price** and a **bulk price for a quantity tier**.
- Example copy: *"Crew Neck T-shirt — ₹[DUMMY] each; ₹[DUMMY] each for [DUMMY]+"*.
- All prices, tiers, colours, sizes and print areas come from the database, editable without a code change.

### 4.2 Design canvas
- Choose product and colour, then design on it.
- Add **text** and **upload artwork** (PNG or JPG only).
- Move, scale and rotate any element.
- **Front and back**, each with its own design.
- Visible **print area**; designs cannot leave it (clamped/snapped back on release).
- Text controls: font, colour, size.
- Bad uploads rejected with a plain-English message (wrong type, too small, too large).

### 4.3 Live preview
- The design appears on the **real shirt colour**, not a generic mockup.
- Updates instantly while editing.
- Looks close to printed (multiply blend + fabric shading, not pasted on).
- Switching colour or size **must not lose the design**.

### 4.4 Order
- Quantity, size breakdown and price update live.
- **B2B:** set a quantity per size (e.g. S 10, M 25, L 25, XL 10 = 70 pieces).
- **B2C:** usually quantity 1.
- Cart and simple checkout (name, phone, email, address, notes).
- The design is saved with the order.
- **Print method** (DTF / embroidery / vinyl) is a field on the order; default DTF.

### 4.5 Admin
- Login-protected list of orders, each with its design attached.
- Download the artwork, and a **print-ready file** (transparent PNG at print size) per side.
- Change order status: **New → In production → Printed → Shipped**.
- Filter by status; show customer details.
- Embroidery / vinyl get a clear on-screen note that they need different handling (fewer colours, no fine detail).

### 4.6 Optional (only after 1–5 work)
- Generate a design from a text prompt.
- Remove the background from an uploaded image.
- Save a design for a returning customer (needs customer login).

**These three are explicitly NOT in the first build.** They are listed so the data model does not
block them later (a design is already structured JSON, so attaching an AI-generated image is additive).

---

## 5. The five rules, each written as a test

These hold in every phase. Each is testable.

1. **Design is never lost when colour, size or quantity changes.** — Changing product colour or size,
   or editing quantities, must leave every element exactly where it was.
2. **The preview always matches the chosen shirt colour and placement.** — The shirt fill equals the
   chosen colour hex; the design sits inside the same print area as the editor.
3. **Price is calculated from product and quantity, with a bulk tier for B2B.** — `unitPrice` is picked
   from the matching quantity tier; `lineTotal = unitPrice × qty`; `orderTotal = Σ lineTotals`.
4. **An order always carries its design. An order with no artwork cannot be placed.** — Checkout
   rejects an order whose every side is empty, with a clear message, and saves nothing.
5. **Single and bulk orders both go through the same studio.** — One design flow; only the quantity
   control differs.

---

## 6. Pricing — all settings, never hardcoded

- Price is stored as **integer paise** (never a float) to avoid rounding disputes. Currency: **INR**.
- Bulk tiers are by **total quantity only** (Open Question 2 default), e.g. `1–9`, `10–49`, `50+`.
- The tier set is **admin-editable**; the app reads it. Dummy values are labelled `[DUMMY]` in the seed.
- Colour-based or print-method-based price differences are **not built now**, but the tier table is
  keyed per product so a colour/method dimension can be added later without touching the checkout.

**Assumed example structure (all values DUMMY, to be replaced by Shankar):**
`1–9` at ₹[DUMMY]/pc, `10–49` at ₹[DUMMY]/pc, `50+` at ₹[DUMMY]/pc.

---

## 7. Print-ready file settings (configurable; defaults are placeholders)

- Accepted uploads: **PNG and JPG** only.
- **Minimum resolution**, **maximum file size**, and **maximum print area per product** are settings.
- A low-quality upload shows a clear warning (below recommended DPI).
- Export: **transparent PNG at print size, one per side**, e.g. 12 in × 16 in at 300 DPI `[DUMMY]`.
- The admin screen flags that **embroidery needs fewer colours and no fine detail**, and that **vinyl
  needs vector-like solid shapes** — these methods would need different handling before production.

---

## 8. Open questions and chosen defaults (all buildable to answer later without rework)

| # | Question | Default we build now |
|---|---|---|
| 1 | Which vertical leads? | One studio for both. Ship the **retail single-order flow first**, with the **bulk size breakdown built in from day one**. |
| 2 | Bulk price breaks / per colour / per method? | **Per quantity only**, settings-driven. |
| 3 | Printer artwork rules? | The settings in §7. |
| 4 | Print method chosen at order time? | Yes — a field on the order, stored and shown to admin. Embroidery handled differently is flagged, not silently ignored. |
| 5 | Inside existing store or standalone? | **Standalone app** that sends orders to admin, designed to be linked/embedded from The T-Shirt Shop later. |

**One clear question for the owner (only genuinely missing fact):**
> **What are the real retail and bulk prices, and the bulk quantity break points, for the crew,
> oversized and polo tees?** Until Shankar supplies them, the app runs on clearly-labelled dummy
> values in the admin settings table.

---

## 9. Quality bar

- Works well on **mobile and desktop** (most customers are on phones).
- Simple, clean, fast; **clear error messages in plain English**.
- Indian context: prices in **₹**, **Indian phone and address** format.
- Do not invent facts, prices or client names. Missing information is asked for, not guessed.

---

## 10. Out of scope for v1

- Payment gateway (checkout collects details; payment is arranged offline, as today).
- Order tracking / notifications to the customer.
- Multi-currency, GST invoicing, shipping-rate calculation.
- Hoodies and caps in the product picker (later if time allows).
- AI generation and background removal (§4.6).
- Customer accounts / saved designs.

---

## 11. Success metrics (targets assumed, to be confirmed)

- A retail customer can go from landing page to a placed order **without contacting anyone**.
- A bulk buyer can enter a 70-piece size breakdown and see the bulk price **without a phone call**.
- Every placed order has a **downloadable, print-ready PNG per side**.
- Admin can move an order New → In production → Printed → Shipped and filter by status.
- The five rules in §5 are covered by automated or scripted tests.
