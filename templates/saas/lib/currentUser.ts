import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME, type SessionPayload } from "@/lib/session";

/** Server-side helper for Server Components / Route Handlers. */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
