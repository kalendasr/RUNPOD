export interface SiteIdentity {
  name: string;
  description: string;
  baseUrl: string;
}

export interface PageMetadataInput {
  title: string;
  description?: string;
  path: string;
}

/**
 * A Next.js `Metadata`-shaped object (App Router). Not imported from
 * `next` here — this package has no framework dependency, so it stays
 * usable outside a Next.js project (a sitemap/robots generator has no
 * reason to require the whole framework).
 */
export interface PageMetadata {
  title: string;
  description: string;
  alternates: { canonical: string };
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
  };
}

function joinUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).toString();
}

/**
 * Builds page-level SEO metadata for one page. Falls back to the site's
 * own description when a page doesn't have its own (a thin page — e.g.
 * a simple Contact page — shouldn't need to restate the site's tagline).
 */
export function buildPageMetadata(site: SiteIdentity, page: PageMetadataInput): PageMetadata {
  const description = page.description ?? site.description;
  const canonical = joinUrl(site.baseUrl, page.path);

  return {
    title: `${page.title} | ${site.name}`,
    description,
    alternates: { canonical },
    openGraph: {
      title: page.title,
      description,
      url: canonical,
      siteName: site.name,
    },
  };
}
