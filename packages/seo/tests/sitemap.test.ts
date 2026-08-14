import { describe, expect, it } from "vitest";
import { generateSitemap, generateRobotsTxt } from "../src/sitemap.js";

const baseUrl = "https://alpha-red.example.com";

describe("generateSitemap", () => {
  it("produces valid-looking XML with one <url> per entry", () => {
    const xml = generateSitemap(baseUrl, [{ path: "/" }, { path: "/contact" }]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<loc>https://alpha-red.example.com/</loc>");
    expect(xml).toContain("<loc>https://alpha-red.example.com/contact</loc>");
    expect((xml.match(/<url>/g) ?? []).length).toBe(2);
  });

  it("includes lastmod and priority when given", () => {
    const xml = generateSitemap(baseUrl, [
      { path: "/", lastModified: new Date("2026-01-01T00:00:00.000Z"), priority: 1.0 },
    ]);
    expect(xml).toContain("<lastmod>2026-01-01T00:00:00.000Z</lastmod>");
    expect(xml).toContain("<priority>1.0</priority>");
  });

  it("omits lastmod/priority when not given", () => {
    const xml = generateSitemap(baseUrl, [{ path: "/" }]);
    expect(xml).not.toContain("<lastmod>");
    expect(xml).not.toContain("<priority>");
  });

  it("produces an empty urlset for no entries", () => {
    const xml = generateSitemap(baseUrl, []);
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
  });
});

describe("generateRobotsTxt", () => {
  it("allows everything and points at the sitemap by default", () => {
    const txt = generateRobotsTxt(baseUrl);
    expect(txt).toContain("User-agent: *");
    expect(txt).toContain("Allow: /");
    expect(txt).toContain("Sitemap: https://alpha-red.example.com/sitemap.xml");
    expect(txt).not.toContain("Disallow:");
  });

  it("includes Disallow lines when given", () => {
    const txt = generateRobotsTxt(baseUrl, { disallow: ["/admin", "/api"] });
    expect(txt).toContain("Disallow: /admin");
    expect(txt).toContain("Disallow: /api");
  });
});
