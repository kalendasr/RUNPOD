import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanForSecrets } from "../src/scanSecrets.js";

let tmpDir: string;

function write(relPath: string, contents: string): void {
  const full = path.join(tmpDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents, "utf8");
}

afterEach(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("scanForSecrets", () => {
  it("finds an AWS access key ID", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-security-"));
    write("config.ts", `const key = "AKIAIOSFODNN7EXAMPLE";`);

    const findings = scanForSecrets(tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: "config.ts", rule: "aws-access-key-id" });
  });

  it("finds a generic api key assignment", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-security-"));
    write("client.ts", `const apiKey = "sk-abcdefghijklmnopqrstuvwx";`);

    const findings = scanForSecrets(tmpDir);
    expect(findings.some((f) => f.rule === "generic-api-key-assignment")).toBe(true);
  });

  it("finds a private key header", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-security-"));
    write("id_rsa", "-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----");

    const findings = scanForSecrets(tmpDir);
    expect(findings.some((f) => f.rule === "private-key-header")).toBe(true);
  });

  it("redacts the finding — never returns the full secret", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-security-"));
    write("config.ts", `const key = "AKIAIOSFODNN7EXAMPLE";`);

    const [finding] = scanForSecrets(tmpDir);
    expect(finding.preview).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(finding.preview).toMatch(/^AKIA\.\.\./);
  });

  it("ignores .env.example — placeholder variable names, not leaked secrets", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-security-"));
    write(".env.example", `STRIPE_SECRET_KEY=""\nAWS_KEY="AKIAIOSFODNN7EXAMPLE"`);

    expect(scanForSecrets(tmpDir)).toHaveLength(0);
  });

  it("ignores node_modules and other default-ignored directories", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-security-"));
    write("node_modules/some-pkg/index.js", `const key = "AKIAIOSFODNN7EXAMPLE";`);

    expect(scanForSecrets(tmpDir)).toHaveLength(0);
  });

  it("returns no findings for clean source", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-security-"));
    write("index.ts", `export function add(a: number, b: number) { return a + b; }`);

    expect(scanForSecrets(tmpDir)).toHaveLength(0);
  });
});
