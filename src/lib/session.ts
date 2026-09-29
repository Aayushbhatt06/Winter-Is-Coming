import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const cookieName = "winter_arc_session";
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return new TextEncoder().encode(value);
}
export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
  (await cookies()).set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function getSessionUserId() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, secret())).payload.sub ?? null; } catch { return null; }
}
export async function clearSession() {
  (await cookies()).delete(cookieName);
}
