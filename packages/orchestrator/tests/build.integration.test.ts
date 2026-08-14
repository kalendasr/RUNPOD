import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { projectDir, readTasks } from "@hermes/projects";
import { stopSandbox } from "@hermes/projects";
import { buildProject } from "../src/build.js";
import type { PlanResult } from "../src/plan.js";

const WEBSITE_NAME = "test-orchestrator-website";
const SAAS_NAME = "test-orchestrator-saas";

function dockerAvailable(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function cleanup(name: string): void {
  try {
    stopSandbox(name);
  } catch {
    // sandbox may not have started
  }
  fs.rmSync(projectDir(name), { recursive: true, force: true });
}

afterEach(() => {
  cleanup(WEBSITE_NAME);
  cleanup(SAAS_NAME);
});

describe.skipIf(!dockerAvailable())("buildProject (integration, requires Docker)", () => {
  it("scaffolds a real website project from a plan", async () => {
    const plan: PlanResult = {
      plan: {
        type: "website",
        projectName: WEBSITE_NAME,
        siteName: "Alpha Red",
        siteDescription: "A modern landing page.",
        pages: ["home", "contact"],
      },
      requirements: "- Responsive landing page\n- Contact form",
      architecture: "- Next.js + Tailwind",
    };

    const result = await buildProject(plan);

    expect(result.manifest.status).toBe("DRAFT");
    const dir = projectDir(WEBSITE_NAME);
    expect(fs.existsSync(`${dir}/hermes.yaml`)).toBe(true);
    expect(fs.existsSync(`${dir}/requirements.md`)).toBe(true);
    expect(fs.readFileSync(`${dir}/requirements.md`, "utf8")).toContain("Contact form");
    expect(fs.existsSync(`${dir}/architecture.md`)).toBe(true);
    expect(fs.existsSync(`${dir}/app/contact/page.tsx`)).toBe(true);

    const tasks = readTasks(WEBSITE_NAME);
    expect(tasks.map((t) => t.text)).toEqual(["home", "contact"]);
  }, 30_000);

  it("scaffolds a real saas project with entities from a plan", async () => {
    const plan: PlanResult = {
      plan: {
        type: "saas",
        projectName: SAAS_NAME,
        siteName: "Construction Quotes",
        siteDescription: "Manage customers and quotations.",
        entities: [
          { name: "Customer", fields: ["name", "email"] },
          { name: "Quotation", fields: ["title", "amount"] },
        ],
      },
      requirements: "- Manage customers\n- Manage quotations",
      architecture: "- Next.js + Prisma + PostgreSQL",
    };

    const result = await buildProject(plan);

    expect(result.manifest.status).toBe("DRAFT");
    const dir = projectDir(SAAS_NAME);
    expect(fs.existsSync(`${dir}/prisma/schema.prisma`)).toBe(true);
    expect(fs.readFileSync(`${dir}/prisma/schema.prisma`, "utf8")).toContain("model Customer");
    expect(fs.existsSync(`${dir}/app/api/customers/route.ts`)).toBe(true);
    expect(fs.existsSync(`${dir}/app/api/quotations/route.ts`)).toBe(true);
  }, 30_000);
});
