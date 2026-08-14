import net from "node:net";

/**
 * Finds a currently-free TCP port by asking the OS to bind an ephemeral one.
 * A fixed default is not safe on this host — other long-running services
 * may already be bound to common ports (see docs/environment-strategy.md and
 * the Phase 3 port-collision incident in project history).
 */
export function findFreePort(): Promise<number> {
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
