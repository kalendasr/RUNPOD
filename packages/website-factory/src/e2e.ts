import { spawn, execFileSync } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { projectDir } from "./paths.js";

/**
 * Finds a currently-free TCP port by asking the OS to bind an ephemeral one.
 * A fixed default port is not safe on this host: other long-running services
 * (PM2 apps, etc.) may already be bound to common dev ports like 3000-3100 —
 * see docs/environment-strategy.md. Binding to port 0 and reading back the
 * assigned port avoids colliding with them.
 */
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("Could not determine a free port")));
      }
    });
  });
}

function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 500);
        }
      });
    };
    attempt();
  });
}

export interface E2EResult {
  passed: boolean;
  output: string;
}

/**
 * Starts the built site with `next start`, waits for it to respond, runs the
 * generated Playwright suite against it (Firefox — see docs/environment-strategy.md
 * for why Chromium isn't used here), then always tears the server down.
 *
 * Spawns the `next` binary directly (not via `npm run start`) so the process
 * we get back is the actual server, not an npm wrapper — killing an npm
 * wrapper does not reliably kill the `next start` process it spawns, which
 * previously left orphaned servers running on the requested port.
 */
export async function runE2ETests(name: string, port?: number): Promise<E2EResult> {
  const cwd = projectDir(name);
  const resolvedPort = port ?? (await findFreePort());
  const nextBin = path.join(cwd, "node_modules", ".bin", "next");
  const server = spawn(nextBin, ["start", "-p", String(resolvedPort)], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });

  // A spawn failure (e.g. `next` not installed yet) emits an 'error' event
  // asynchronously. With no listener, Node treats that as an uncaught
  // exception and crashes the whole host process — not just this call.
  // Race it against waitForServer so it becomes a normal StepResult
  // failure instead, matching the TestSteps contract (never throws).
  const spawnFailure = new Promise<never>((_, reject) => {
    server.on("error", reject);
  });

  let passed: boolean;
  let output: string;
  try {
    await Promise.race([waitForServer(`http://localhost:${resolvedPort}`, 30_000), spawnFailure]);
    try {
      output = execFileSync("npx", ["playwright", "test"], {
        cwd,
        encoding: "utf8",
        env: { ...process.env, HERMES_BASE_URL: `http://localhost:${resolvedPort}` },
        timeout: 3 * 60 * 1000,
      });
      passed = true;
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string };
      output = `${e.stdout ?? ""}\n${e.stderr ?? ""}`;
      passed = false;
    }
  } catch (err) {
    passed = false;
    output = `Server failed to start: ${(err as Error).message}`;
  } finally {
    server.kill("SIGTERM");
  }
  return { passed, output };
}
