export type PageKind = "home" | "about" | "services" | "projects" | "contact";

export const ALL_PAGE_KINDS: PageKind[] = ["home", "about", "services", "projects", "contact"];

export interface PageDef {
  kind: PageKind;
  slug: string; // "" for home (root route)
  navLabel: string;
  title: string;
  description: string;
}

export interface WebsiteSpec {
  projectName: string;
  siteName: string;
  siteDescription: string;
  pages: PageKind[];
}

export function pageDef(kind: PageKind, siteName: string): PageDef {
  switch (kind) {
    case "home":
      return {
        kind,
        slug: "",
        navLabel: "Home",
        title: siteName,
        description: `Welcome to ${siteName}.`,
      };
    case "about":
      return {
        kind,
        slug: "about",
        navLabel: "About",
        title: "About",
        description: `Learn more about ${siteName}.`,
      };
    case "services":
      return {
        kind,
        slug: "services",
        navLabel: "Services",
        title: "Services",
        description: `Services offered by ${siteName}.`,
      };
    case "projects":
      return {
        kind,
        slug: "projects",
        navLabel: "Projects",
        title: "Projects",
        description: `Work delivered by ${siteName}.`,
      };
    case "contact":
      return {
        kind,
        slug: "contact",
        navLabel: "Contact",
        title: "Contact",
        description: `Get in touch with ${siteName}.`,
      };
  }
}
