# Skill: database

> PostgreSQL + Prisma. Roadmap §6, §12.

## When the Planner selects this

Any project that stores data beyond static content — every `saas` /
`ecommerce` / `ai-saas` project needs this.

## What it provides

- `templates/saas/prisma/schema.prisma` — the data model. `packages/saas-factory`'s
  CRUD generator (`src/crud.ts`) adds entities here per the manifest's `features` list.
- `templates/saas/lib/db.ts` — a singleton `PrismaClient`, reused across
  hot reloads in dev. **Do not** instantiate `new PrismaClient()` anywhere
  else in a generated project — that's the specific mistake this file
  exists to prevent (each instance opens its own connection pool; enough
  of them exhausts Postgres's connection limit under `next dev`'s hot reload).
- Migrations: `packages/saas-factory` exposes `prismaGenerate`/`prismaMigrate`
  (see `packages/testing/src/realSteps.ts`, called before build).

## Key decision: migrations run as part of the build step, not deploy

`realStepsFor()` runs `prismaGenerate` + `prismaMigrate` before
`npmBuild` — schema drift is caught at TEST time, not discovered after a
production deploy. Don't move migrations to the deployment pipeline
(`packages/deployment`) without also moving this check, or a broken
migration would only surface in production.

## Related skills

- [`../saas/SKILL.md`](../saas/SKILL.md), [`../ecommerce/SKILL.md`](../ecommerce/SKILL.md) — consumers of this skill
- [`../security/SKILL.md`](../security/SKILL.md) — `DATABASE_URL` is a production secret, never hard-coded (`docs/security-model.md` § Secrets management)

## Tests

Schema changes are exercised indirectly by every project that builds —
there's no standalone schema test; `packages/saas-factory/tests/` covers
the generator that writes to `schema.prisma`.
