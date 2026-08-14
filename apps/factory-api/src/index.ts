import express from "express";
import { createRouter } from "./routes.js";

const app = express();
app.use(express.json());

// Permissive CORS for local development only — the control panel and API
// run on different ports. Lock this down before any non-localhost deploy.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(createRouter());

// Safety net: never leak a stack trace to the client — always JSON.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
});

const port = Number(process.env.HERMES_FACTORY_API_PORT ?? 4100);
app.listen(port, () => {
  console.log(`Hermes factory-api listening on http://localhost:${port}`);
});
