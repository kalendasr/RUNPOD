import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./auth.js";

describe("auth", () => {
  it("hashes a password and verifies the correct password against it", async () => {
    const hash = await hashPassword("correcthorse");
    expect(hash).not.toBe("correcthorse");
    expect(await verifyPassword("correcthorse", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correcthorse");
    expect(await verifyPassword("wrongpassword", hash)).toBe(false);
  });
});
