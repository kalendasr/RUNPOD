import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { projectDir } from "./paths.js";

export function writeEnvFile(
  name: string,
  input: { databaseUrl: string; sessionSecret?: string; stripeSecretKey?: string },
): void {
  const sessionSecret = input.sessionSecret ?? crypto.randomBytes(32).toString("hex");
  const lines = [
    `DATABASE_URL="${input.databaseUrl}"`,
    `SESSION_SECRET="${sessionSecret}"`,
    `STRIPE_SECRET_KEY="${input.stripeSecretKey ?? ""}"`,
    "",
  ];
  fs.writeFileSync(path.join(projectDir(name), ".env"), lines.join("\n"), "utf8");
}
