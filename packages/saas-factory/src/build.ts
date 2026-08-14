import { execFileSync } from "node:child_process";
import { projectDir } from "./paths.js";

export interface CommandResult {
  command: string;
  output: string;
}

function run(name: string, args: string[], timeoutMs: number, extraEnv: Record<string, string> = {}): CommandResult {
  const command = args.join(" ");
  try {
    const output = execFileSync(args[0], args.slice(1), {
      cwd: projectDir(name),
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 50,
      timeout: timeoutMs,
      env: { ...process.env, ...extraEnv },
    });
    return { command, output };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    throw new Error(`Command failed: ${command}\n${e.stdout ?? ""}\n${e.stderr ?? e.message}`);
  }
}

export function npmInstall(name: string): CommandResult {
  return run(name, ["npm", "install"], 5 * 60 * 1000);
}

/**
 * Syncs the current schema.prisma to the database with `prisma db push`.
 * `prisma migrate dev` needs a shadow database, which requires CREATEDB —
 * a privilege the generated project's database role intentionally lacks
 * (see docs/security-model.md § least privilege). `db push` needs no such
 * privilege, at the cost of not keeping a migration history; the factory
 * owns schema.prisma authoritatively, so that's an acceptable trade-off
 * for now.
 */
export function prismaMigrate(name: string): CommandResult {
  return run(name, ["npx", "prisma", "db", "push", "--accept-data-loss"], 2 * 60 * 1000, { CI: "true" });
}

export function prismaGenerate(name: string): CommandResult {
  return run(name, ["npx", "prisma", "generate"], 2 * 60 * 1000);
}

/** npm run build — Phase 4's production build verification step. */
export function npmBuild(name: string): CommandResult {
  return run(name, ["npm", "run", "build"], 5 * 60 * 1000);
}
