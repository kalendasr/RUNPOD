import http from "node:http";

/** Polls a URL until it responds with a non-error status, or the timeout elapses. */
export function checkHealth(url: string, timeoutMs = 30_000): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve((res.statusCode ?? 500) < 400);
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          resolve(false);
        } else {
          setTimeout(attempt, 500);
        }
      });
    };
    attempt();
  });
}
