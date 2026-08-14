import fs from "node:fs";
import path from "node:path";

export interface SecretFinding {
  file: string;
  line: number;
  rule: string;
  /** The matched text, redacted — never the full secret. */
  preview: string;
}

interface Rule {
  name: string;
  pattern: RegExp;
}

// Deliberately pattern-based, not an exhaustive provider list — new
// providers get added here as they come up, not by trying to keep an
// allowlist of every possible key format in sync.
const RULES: Rule[] = [
  { name: "aws-access-key-id", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "generic-api-key-assignment", pattern: /\b(api[_-]?key|apikey)\s*[:=]\s*["'][a-zA-Z0-9_\-]{16,}["']/gi },
  { name: "generic-secret-assignment", pattern: /\b(secret|token|password)\s*[:=]\s*["'][a-zA-Z0-9_\-]{12,}["']/gi },
  { name: "private-key-header", pattern: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/g },
  { name: "stripe-live-key", pattern: /\bsk_live_[0-9a-zA-Z]{16,}\b/g },
  { name: "slack-token", pattern: /\bxox[baprs]-[0-9a-zA-Z-]{10,}\b/g },
];

const DEFAULT_IGNORE_DIRS = new Set(["node_modules", ".git", "dist", ".next", ".hermes"]);

// .env.example intentionally documents variable *names* with placeholder
// values ("") — that's the opposite of a leaked secret, and flagging it
// would train people to ignore this scanner's output.
const IGNORE_FILES = new Set([".env.example"]);

function redact(match: string): string {
  if (match.length <= 8) return "*".repeat(match.length);
  return `${match.slice(0, 4)}...${match.slice(-4)}`;
}

function scanFileContents(filePath: string, contents: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const lines = contents.split("\n");

  lines.forEach((line, index) => {
    for (const rule of RULES) {
      for (const match of line.matchAll(rule.pattern)) {
        findings.push({ file: filePath, line: index + 1, rule: rule.name, preview: redact(match[0]) });
      }
    }
  });

  return findings;
}

function walk(dir: string, ignoreDirs: Set<string>): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) continue;
      files.push(...walk(path.join(dir, entry.name), ignoreDirs));
    } else if (!IGNORE_FILES.has(entry.name)) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

export interface ScanOptions {
  ignoreDirs?: Set<string>;
}

/**
 * Scans a directory tree for accidentally committed secrets
 * (docs/security-model.md § Secrets management). Returns every finding —
 * callers decide what to do with them (block a deploy, log a warning,
 * etc.); this function has no side effects of its own.
 */
export function scanForSecrets(rootDir: string, options: ScanOptions = {}): SecretFinding[] {
  const ignoreDirs = options.ignoreDirs ?? DEFAULT_IGNORE_DIRS;
  const findings: SecretFinding[] = [];

  for (const filePath of walk(rootDir, ignoreDirs)) {
    let contents: string;
    try {
      contents = fs.readFileSync(filePath, "utf8");
    } catch {
      continue; // binary file or unreadable — not a text-based secret leak
    }
    findings.push(...scanFileContents(path.relative(rootDir, filePath), contents));
  }

  return findings;
}
