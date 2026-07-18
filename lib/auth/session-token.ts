import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

import { SESSION_TTL_SECONDS } from "@/lib/auth/session-config";
import { env } from "@/lib/env";

const JWT_ISSUER = "mexc-world-cup-prediction";
const JWT_AUDIENCE = "mexc-event-user";
const jwtKey = createHash("sha256")
  .update(`mexc-user-session-v1:${env.SESSION_SECRET}`)
  .digest();

export async function signSessionToken(userId: string, authVersion: number) {
  return new SignJWT({ authVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(jwtKey);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, jwtKey, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (!payload.sub || !Number.isInteger(payload.authVersion) || Number(payload.authVersion) < 1) {
      return null;
    }
    return { userId: payload.sub, authVersion: Number(payload.authVersion) };
  } catch {
    return null;
  }
}
