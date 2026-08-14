# Skill: stripe

> Subscription billing via Stripe Checkout. Roadmap §12.

## When the Planner selects this

The brief mentions subscriptions, paid plans, or billing.

## What it provides

`templates/saas/lib/billing.ts` — `createCheckoutSession()`, a thin
wrapper around `stripe.checkout.sessions.create` in subscription mode.

## Key decision: never generates or sets STRIPE_SECRET_KEY automatically

`getClient()` throws immediately if `STRIPE_SECRET_KEY` is unset, with a
message pointing at the human-approval requirement — payment
configuration is explicitly on the list in `docs/security-model.md` §
Human approval gates. A generated project's billing routes exist and
compile, but are inert until a human supplies the real key. Don't work
around this by inventing a test/dummy key default; that defeats the
approval gate.

## Related skills

- [`../saas/SKILL.md`](../saas/SKILL.md) — the calling project
- [`../security/SKILL.md`](../security/SKILL.md) — approval-gate rule this follows

## Tests

None yet — `createCheckoutSession` only does something observable against
a real Stripe account/API key, which isn't available in CI/sandbox
environments. If this skill grows further, add a test against Stripe's
test-mode API using a `STRIPE_SECRET_KEY` scoped to test mode only (never
a live key in a test run).
