import { spawn, execFileSync } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { projectDir } from "./paths.js";

/**
 * Finds a currently-free TCP port. A fixed default is not safe on this host
 * — other long-running services may already be bound to common dev ports
 * (see docs/environment-strategy.md and the Phase 3 port-collision incident
 * in project history). Binding to port 0 and reading back the OS-assigned
 * port avoids that entirely.
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
 * Starts the built app with `next start`, waits for it to respond, runs the
 * generated Playwright suite against it (Firefox — see
 * docs/environment-strategy.md for why Chromium isn't used here), then
 * always tears the server down. Spawns the `next` binary directly (not via
 * `npm run start`) so the process handle is the real server, not an npm
 * wrapper that doesn't reliably propagate SIGTERM to its child.
 */
export async function runE2ETests(name: string, port?: number): Promise<E2EResult> {
  const cwd = projectDir(name);
  const resolvedPort = port ?? (await findFreePort());
  const nextBin = path.join(cwd, "node_modules", ".bin", "next");
  const server = spawn(nextBin, ["start", "-p", String(resolvedPort)], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let passed: boolean;
  let output: string;
  try {
    await waitForServer(`http://localhost:${resolvedPort}`, 30_000);
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
  } finally {
    server.kill("SIGTERM");
  }
  return { passed, output };
}
