import fs from "node:fs";
import { WEBSITE_TEMPLATE_DIR, projectDir } from "./paths.js";
import { writePages } from "./pages.js";
import { ALL_PAGE_KINDS, type WebsiteSpec } from "./types.js";

export function scaffoldWebsite(spec: WebsiteSpec): void {
  if (!fs.existsSync(WEBSITE_TEMPLATE_DIR)) {
    throw new Error(`Website template not found at ${WEBSITE_TEMPLATE_DIR}`);
  }
  if (spec.pages.length === 0 || !spec.pages.includes("home")) {
    throw new Error("A website must include at least the 'home' page");
  }
  const invalid = spec.pages.filter((kind) => !ALL_PAGE_KINDS.includes(kind));
  if (invalid.length > 0) {
    throw new Error(`Unknown page kind(s): ${invalid.join(", ")}`);
  }

  const target = projectDir(spec.projectName);
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(WEBSITE_TEMPLATE_DIR, target, { recursive: true });

  writePages(spec);
}
