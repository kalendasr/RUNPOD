import { describe, expect, it } from "vitest";
import { buildPageMetadata, type SiteIdentity } from "../src/metadata.js";

const site: SiteIdentity = {
  name: "Alpha Red",
  description: "A modern landing page for Alpha Red.",
  baseUrl: "https://alpha-red.example.com",
};

describe("buildPageMetadata", () => {
  it("appends the site name to the page title", () => {
    const meta = buildPageMetadata(site, { title: "Contact", path: "/contact" });
    expect(meta.title).toBe("Contact | Alpha Red");
  });

  it("falls back to the site description when the page has none", () => {
    const meta = buildPageMetadata(site, { title: "Home", path: "/" });
    expect(meta.description).toBe(site.description);
  });

  it("uses the page's own description when given", () => {
    const meta = buildPageMetadata(site, { title: "Pricing", path: "/pricing", description: "See our plans." });
    expect(meta.description).toBe("See our plans.");
  });

  it("builds an absolute canonical URL from the base URL and path", () => {
    const meta = buildPageMetadata(site, { title: "About", path: "/about" });
    expect(meta.alternates.canonical).toBe("https://alpha-red.example.com/about");
  });

  it("mirrors title/description/url into openGraph", () => {
    const meta = buildPageMetadata(site, { title: "Home", path: "/" });
    expect(meta.openGraph).toEqual({
      title: "Home",
      description: site.description,
      url: "https://alpha-red.example.com/",
      siteName: "Alpha Red",
    });
  });
});
