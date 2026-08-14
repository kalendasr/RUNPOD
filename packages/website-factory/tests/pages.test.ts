import { describe, expect, it } from "vitest";
import { pageFileContent, siteConfigContent } from "../src/pages.js";
import { testFileContent } from "../src/playwrightTests.js";
import type { WebsiteSpec } from "../src/types.js";

const spec: WebsiteSpec = {
  projectName: "test-site",
  siteName: "Acme Construction",
  siteDescription: "We build things.",
  pages: ["home", "about", "contact"],
};

describe("pages", () => {
  it("generates a home page with metadata and a contact CTA when contact exists", () => {
    const content = pageFileContent("home", spec);
    expect(content).toContain("Acme Construction");
    expect(content).toContain("export const metadata");
    expect(content).toContain('href="/contact"');
  });

  it("omits the contact CTA when there is no contact page", () => {
    const noContact: WebsiteSpec = { ...spec, pages: ["home", "about"] };
    const content = pageFileContent("home", noContact);
    expect(content).not.toContain("Get in touch");
  });

  it("generates a contact page with the ContactForm component", () => {
    const content = pageFileContent("contact", spec);
    expect(content).toContain("<ContactForm");
  });

  it("builds nav links for the requested pages only", () => {
    const content = siteConfigContent(spec);
    expect(content).toContain('"href": "/"');
    expect(content).toContain('"href": "/about"');
    expect(content).toContain('"href": "/contact"');
    expect(content).not.toContain('"href": "/services"');
  });
});

describe("playwright tests", () => {
  it("generates a spec covering every requested page", () => {
    const content = testFileContent(spec);
    expect(content).toContain('page.goto("/")');
    expect(content).toContain('page.goto("/about")');
    expect(content).toContain('page.goto("/contact")');
  });

  it("includes a contact form submission test when contact is present", () => {
    const content = testFileContent(spec);
    expect(content).toContain("contact form can be submitted");
  });

  it("omits the contact form test when contact is absent", () => {
    const noContact: WebsiteSpec = { ...spec, pages: ["home", "about"] };
    const content = testFileContent(noContact);
    expect(content).not.toContain("contact form can be submitted");
  });
});
