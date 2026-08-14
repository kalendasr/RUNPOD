# Skill: website

> Marketing/business websites — Home, About, Services, Projects, Contact.
> Roadmap §11 (Website factory).

## When the Planner selects this

Project type `website` in the manifest (`packages/projects`), no user
accounts/dashboard/data model required. If the brief mentions accounts,
subscriptions, or CRUD data the user manages, that's `saas` instead — see
[`../saas/SKILL.md`](../saas/SKILL.md).

## What it provides

The canonical scaffold lives at the repo-root **`templates/website/`**
(Next.js 14 + TypeScript + Tailwind, `output: "standalone"` for a small
Docker image) — this skill does not duplicate it, only points to it, so
there is exactly one place to fix a bug or add a page pattern.

- `templates/website/app/` — page routes
- `templates/website/components/` — `Navbar`, `Footer`, shared UI
- `templates/website/lib/site-config.ts` — name/description used for `<title>` templates and metadata
- Building/testing it: `packages/website-factory` (`npmInstall`, `npmBuild`, `runE2ETests`)

## Related skills

Compose with:
- [`../seo/SKILL.md`](../seo/SKILL.md) — metadata, sitemap, robots.txt
- [`../deployment/SKILL.md`](../deployment/SKILL.md) — production build and deploy
- [`../testing/SKILL.md`](../testing/SKILL.md) — the BUILD→TEST→FIX cycle this template runs through

If the brief needs a contact form with server-side handling, a database,
or e-commerce, layer in `saas`/`ecommerce`/`database` — this skill alone
covers static/marketing content only.

## Definition of done (from roadmap §3, "First milestone")

Responsive across desktop/tablet/mobile, production build succeeds,
Playwright tests pass — see `docs/project-lifecycle.md` and
`packages/testing`'s BUILD→TEST→FIX cycle, which this skill's template is
built to pass through unmodified.
