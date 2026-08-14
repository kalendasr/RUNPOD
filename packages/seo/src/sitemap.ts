export interface SitemapEntry {
  path: string;
  lastModified?: Date;
  /** 0.0-1.0, per the sitemap protocol. */
  priority?: number;
}

/** Generates a sitemap.xml document per the sitemaps.org protocol. */
export function generateSitemap(baseUrl: string, entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const loc = new URL(entry.path, baseUrl).toString();
      const lastmod = entry.lastModified ? `\n    <lastmod>${entry.lastModified.toISOString()}</lastmod>` : "";
      const priority = entry.priority !== undefined ? `\n    <priority>${entry.priority.toFixed(1)}</priority>` : "";
      return `  <url>\n    <loc>${loc}</loc>${lastmod}${priority}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export interface RobotsOptions {
  disallow?: string[];
}

/** Generates a robots.txt that points crawlers at the sitemap. */
export function generateRobotsTxt(baseUrl: string, options: RobotsOptions = {}): string {
  const disallowLines = (options.disallow ?? []).map((path) => `Disallow: ${path}`);
  const lines = ["User-agent: *", "Allow: /", ...disallowLines, "", `Sitemap: ${new URL("/sitemap.xml", baseUrl)}`];
  return lines.join("\n") + "\n";
}
