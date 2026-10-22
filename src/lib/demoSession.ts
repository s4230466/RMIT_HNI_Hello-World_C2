import { createHmac, timingSafeEqual } from "crypto";
import type { JWTPayload } from "jose";
import type { NextRequest } from "next/server";

export const DEMO_COOKIE = "care-passport-demo";
const roles = ["patient", "clinician", "platform-admin"] as const;
type DemoRole = (typeof roles)[number];

function getSecret(): string {
  const secret = process.env.DEMO_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("DEMO_SESSION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

export function isDemoMode(): boolean {
  return process.env.CARE_PASSPORT_DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
}

export function createDemoSession(role: unknown, email: unknown): string {
  if (!isDemoMode()) throw new Error("Local demo mode is disabled.");
  if (typeof role !== "string" || !roles.includes(role as DemoRole)) {
    throw new Error("Choose a valid Care Passport demo role.");
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Enter a valid demo email address.");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const payload = Buffer.from(JSON.stringify({
    sub: `demo:${normalizedEmail}`,
    email: normalizedEmail,
    email_verified: true,
    role,
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
  })).toString("base64url");
  const signature = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyDemoSession(request: NextRequest): JWTPayload | null {
  if (!isDemoMode()) return null;
  const value = request.cookies.get(DEMO_COOKIE)?.value;
  if (!value) return null;
  const [payload, signature, ...extra] = value.split(".");
  if (!payload || !signature || extra.length > 0) return null;
  const expected = createHmac("sha256", getSecret()).update(payload).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const claims: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!claims || typeof claims !== "object") return null;
    const session = claims as Record<string, unknown>;
    if (
      typeof session.sub !== "string" ||
      typeof session.email !== "string" ||
      typeof session.exp !== "number" ||
      session.exp <= Math.floor(Date.now() / 1000) ||
      typeof session.role !== "string" ||
      !roles.includes(session.role as DemoRole)
    ) return null;
    return {
      sub: session.sub,
      email: session.email,
      email_verified: true,
      exp: session.exp,
      realm_access: { roles: [session.role] },
    };
  } catch {
    return null;
  }
}

export function demoRoleFromSession(jwt: JWTPayload): string | null {
  const rolesInToken = (jwt.realm_access as { roles?: unknown } | undefined)?.roles;
  if (!Array.isArray(rolesInToken)) return null;
  return roles.find((role) => rolesInToken.includes(role)) ?? null;
}
