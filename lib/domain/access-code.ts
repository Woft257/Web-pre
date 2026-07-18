import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function normalizeAccessCode(code: string) {
  return code.trim().toUpperCase();
}

export function hashAccessCode(code: string) {
  return createHash("sha256").update(normalizeAccessCode(code)).digest("hex");
}

export function generateAccessCode() {
  return `MEXC26-${randomBytes(6).toString("hex").toUpperCase()}`;
}
