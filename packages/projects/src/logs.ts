import fs from "node:fs";
import path from "node:path";
import { logPath } from "./paths.js";
import type { LogEntry } from "./types.js";

export function appendLog(name: string, entry: Omit<LogEntry, "timestamp">): LogEntry {
  const full: LogEntry = { ...entry, timestamp: new Date().toISOString() };
  const filePath = logPath(name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(full) + "\n", "utf8");
  return full;
}

export function readLog(name: string): LogEntry[] {
  const filePath = logPath(name);
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as LogEntry);
}
