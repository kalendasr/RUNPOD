# Skill: saas

> Authenticated multi-user applications with a data model — accounts,
> dashboard, CRUD. Roadmap §12 (SaaS factory).

## When the Planner selects this

Project type `saas` (or `ecommerce`/`ai-saas`, which share this
toolchain — see `packages/testing/src/realSteps.ts`). The brief mentions
user accounts, a dashboard, or data the user creates/manages.

Not every SaaS project needs every module below — the Planner decides
which features apply per roadmap §12: "Not every project needs every
feature."

## What it provides

The canonical scaffold lives at the repo-root **`templates/saas/`**
(Next.js + TypeScript + Tailwind + PostgreSQL + Prisma) — not duplicated
here. Each cross-cutting concern inside it is its own skill so it can be
reused outside a full SaaS scaffold too:

| Concern | Skill | Template file |
|---|---|---|
| Login/session | [`../authentication/SKILL.md`](../authentication/SKILL.md) | `templates/saas/lib/auth.ts` |
| Data model | [`../database/SKILL.md`](../database/SKILL.md) | `templates/saas/prisma/` |
| Subscriptions | [`../stripe/SKILL.md`](../stripe/SKILL.md) | `templates/saas/lib/billing.ts` |
| Notifications | [`../email/SKILL.md`](../email/SKILL.md) | `templates/saas/lib/email.ts` |
| File uploads | (no dedicated skill yet) | `templates/saas/lib/storage.ts` |
| Admin panel / CRUD | `packages/saas-factory/src/crud.ts` (generator, not a separate skill) | — |

## Related skills

- [`../security/SKILL.md`](../security/SKILL.md) — human approval gates apply to production secrets (`STRIPE_SECRET_KEY` etc.) used by this template
- [`../deployment/SKILL.md`](../deployment/SKILL.md)
- [`../testing/SKILL.md`](../testing/SKILL.md)
- [`../ecommerce/SKILL.md`](../ecommerce/SKILL.md) — extends this template with product/cart/checkout
