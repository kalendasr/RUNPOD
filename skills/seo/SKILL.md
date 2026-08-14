# Skill: seo

> Page metadata, sitemap.xml, robots.txt. Roadmap §11 (marketing
> websites: "Add SEO").

## When the Planner selects this

Any `website` project (roadmap §11 lists it under marketing websites, but
it applies to any public-facing site). Less relevant for an internal-only
SaaS dashboard behind auth.

## What it provides

`packages/seo` — framework-independent (no `next` dependency, so it's
usable outside a Next.js project too):

- `buildPageMetadata(site, page)` — title/description/canonical/OpenGraph
  for one page. Falls back to the site's own description when a page
  doesn't specify one.
- `generateSitemap(baseUrl, entries)` — `sitemap.xml` per the sitemaps.org protocol.
- `generateRobotsTxt(baseUrl, options)` — `robots.txt`, pointing at the sitemap.

```ts
import { buildPageMetadata, generateSitemap, generateRobotsTxt } from "@hermes/seo";

export const metadata = buildPageMetadata(
  { name: siteConfig.name, description: siteConfig.description, baseUrl: "https://example.com" },
  { title: "Contact", path: "/contact" },
);
```

In a Next.js App Router project, `buildPageMetadata`'s return shape
matches `Metadata` closely enough to export directly as a page's
`metadata`; wire `generateSitemap`/`generateRobotsTxt` into
`app/sitemap.ts`/`app/robots.ts` (Next's file conventions for those).

## Related skills

- [`../website/SKILL.md`](../website/SKILL.md) — `templates/website/lib/site-config.ts` is the `SiteIdentity` source
- [`../saas/SKILL.md`](../saas/SKILL.md) — public-facing pages of an otherwise-authenticated app (pricing, landing) still want this

## Tests

`packages/seo/tests/metadata.test.ts`, `tests/sitemap.test.ts` — pure
function tests, no framework or network involved (deliberately: nothing
in this package should require a running server to verify).
