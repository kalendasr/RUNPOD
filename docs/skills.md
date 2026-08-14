# Skills System

> Phase 10 implementation of the reusable-skills system described in
> ROADMAP.md §10 (Agent architecture) and §Phase 10.

## 1. Purpose

Don't build one giant autonomous prompt (roadmap §10). Each skill is a
self-contained knowledge package the Planner selects from based on a
project's brief, and the Builder pulls implementation details from —
without every agent needing the whole factory's knowledge loaded at once.

## 2. Structure

Every skill under `skills/<name>/` has the same four parts (roadmap
§Phase 10):

```text
skills/<name>/
├── SKILL.md      — when to select it, what it provides, key decisions
├── templates/    — the actual code (or a pointer to where it lives)
├── examples/     — worked usage
└── tests/        — how it's verified (or a pointer to where those live)
```

**Two kinds of skill**, deliberately not treated the same way:

- **Whole-project skills** (`website`, `saas`) — the canonical scaffold
  already exists at the repo-root `templates/`. These skills' `templates/`
  subdirectory is a pointer, not a duplicate — one source of truth, no
  drift risk.
- **Cross-cutting skills** (`authentication`, `database`, `stripe`,
  `email`, `security`, `testing`, `deployment`, `pdf`, `seo`, `ecommerce`)
  — either point at the specific files within `templates/saas/` that
  implement them, or (where nothing existed yet — `security`, `pdf`,
  `seo`, `ecommerce`'s cart logic) are real, tested `packages/*` code
  written as part of this phase.

## 3. The 12 skills

| Skill | Real code, or pointer to existing? |
|---|---|
| `website` | Pointer → `templates/website/` |
| `saas` | Pointer → `templates/saas/` |
| `authentication` | Pointer → `templates/saas/lib/{auth,session,currentUser}.ts` |
| `database` | Pointer → `templates/saas/prisma/`, `lib/db.ts` |
| `stripe` | Pointer → `templates/saas/lib/billing.ts` |
| `email` | Pointer → `templates/saas/lib/email.ts` |
| `security` | **New**: `packages/security` (secret scanner, now enforced in the deploy pipeline) |
| `testing` | Pointer → `packages/testing` |
| `deployment` | Pointer → `packages/deployment` |
| `pdf` | **New**: `packages/pdf` (quotation/invoice generation) |
| `seo` | **New**: `packages/seo` (metadata, sitemap, robots.txt) |
| `ecommerce` | **New**: `packages/ecommerce` (cart math) + a Prisma schema snippet + a Stripe one-time-checkout function |

## 4. What building this surfaced

The `security` skill needed to exist before it could be honest — the
factory's own `docs/security-model.md` claimed secret scanning happened
before every deploy, and nothing did that. `packages/security`'s
`scanForSecrets()` is now genuinely wired into
`packages/deployment/src/pipeline.ts`, tested end to end (a project with
a fake secret in its source fails the deploy before the Docker build ever
runs — see `packages/deployment/tests/pipeline.security.test.ts`). See
`skills/security/SKILL.md` § Enforcement and `skills/deployment/SKILL.md`.

## 5. Honesty about gaps

Two skills document, rather than paper over, a real limitation:

- `skills/stripe/SKILL.md` and `skills/ecommerce/SKILL.md` — no test for
  `createCheckoutSession`/`createOneTimeCheckoutSession`, because they
  only do something observable against a real Stripe account. A future
  test needs a Stripe test-mode key, not a live one.
- `skills/testing/SKILL.md` — the security check runs at deploy time, not
  inside the BUILD→TEST→FIX cycle, so a project can reach `REVIEW` with a
  secret still in its source and only get caught trying to deploy.

Each `SKILL.md` links to the skills it composes with — start at
[`../skills/website/SKILL.md`](../skills/website/SKILL.md) or
[`../skills/saas/SKILL.md`](../skills/saas/SKILL.md) and follow the
"Related skills" sections from there.
