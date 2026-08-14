import { execFileSync } from "node:child_process";
import { projectDir } from "./paths.js";

export interface CommandResult {
  command: string;
  output: string;
}

function run(name: string, args: string[], timeoutMs: number): CommandResult {
  const command = args.join(" ");
  try {
    const output = execFileSync(args[0], args.slice(1), {
      cwd: projectDir(name),
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 50,
      timeout: timeoutMs,
    });
    return { command, output };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    throw new Error(`Command failed: ${command}\n${e.stdout ?? ""}\n${e.stderr ?? e.message}`);
  }
}

/** npm install — resolves the generated site's dependencies. */
export function npmInstall(name: string): CommandResult {
  return run(name, ["npm", "install"], 5 * 60 * 1000);
}

/** npm run build — Phase 3's production build verification step. */
export function npmBuild(name: string): CommandResult {
  return run(name, ["npm", "run", "build"], 5 * 60 * 1000);
}
