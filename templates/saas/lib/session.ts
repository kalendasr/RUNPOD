import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "hermes_session";

export type SessionRole = "USER" | "ADMIN";

export interface SessionPayload {
  sub: string;
  email: string;
  role: SessionRole;
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Fails loudly rather than silently signing with a guessable default —
    // see docs/security-model.md § Secrets management.
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    const role = payload.role === "ADMIN" ? "ADMIN" : "USER";
    return { sub: payload.sub, email: payload.email, role };
  } catch {
    return null;
  }
}
