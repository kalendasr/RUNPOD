# Skill: ecommerce

> Products, cart, checkout, orders. Roadmap §11.

## When the Planner selects this

Project type `ecommerce`. Shares the `saas` toolchain end to end — same
Next.js/Prisma/Postgres stack, same build/test pipeline
(`packages/testing/src/realSteps.ts` already treats `website` as one path
and `saas`/`ecommerce`/`ai-saas` as the other). This skill layers cart and
checkout on top of `saas`, it doesn't replace it.

## What it provides

- **`packages/ecommerce`** (`Cart`, `addItem`, `removeItem`,
  `updateQuantity`, `cartSubtotal`, `cartItemCount`) — pure, immutable
  cart math with no database or framework dependency, so it's the same
  logic whether the cart lives in a session, a DB row, or client state.
- **`templates/schema.snippet.prisma`** — `Product`/`Order`/`OrderItem`
  models to add to `templates/saas/prisma/schema.prisma` (see the
  snippet's own comment for the one required change to the base `User`
  model).
- **`templates/saas/lib/billing.ts`**'s `createOneTimeCheckoutSession()` —
  added alongside the existing subscription-mode `createCheckoutSession()`
  specifically for this skill; converts cart line items into a Stripe
  one-time-payment session.

## How they fit together

```ts
import { addItem, cartSubtotal } from "@hermes/ecommerce";
import { createOneTimeCheckoutSession } from "@/lib/billing";

let cart = addItem(EMPTY_CART, { productId: p.id, name: p.name, unitPrice: p.priceCents / 100 }, 2);

const session = await createOneTimeCheckoutSession({
  lineItems: cart.items.map((i) => ({ name: i.name, unitAmountCents: Math.round(i.unitPrice * 100), quantity: i.quantity })),
  successUrl: "...",
  cancelUrl: "...",
});
```

## Key decision: `Product.priceCents`, not a float

The schema snippet and `createOneTimeCheckoutSession` both work in
integer cents. `@hermes/ecommerce`'s `Cart` itself stays float-based
(`unitPrice`) to match how a UI naturally displays prices — the
cents-conversion happens once, at the Stripe boundary. Don't push cents
into `Cart`; don't push floats into Stripe (floating-point cents is a
classic source of off-by-one-cent totals).

## Related skills

- [`../saas/SKILL.md`](../saas/SKILL.md) — the base scaffold this extends
- [`../database/SKILL.md`](../database/SKILL.md) — the schema this adds models to
- [`../stripe/SKILL.md`](../stripe/SKILL.md) — `createOneTimeCheckoutSession` lives in the same file as, and follows the same "never auto-configures `STRIPE_SECRET_KEY`" rule as, `createCheckoutSession`

## Tests

`packages/ecommerce/tests/cart.test.ts` — 13 tests covering quantity
math, immutability, and edge cases (zero/negative quantity, removing a
product not in the cart). `createOneTimeCheckoutSession` has no test yet,
same honest gap as `createCheckoutSession` (see `../stripe/SKILL.md` §
Tests) — it only does something observable against a real Stripe account.
