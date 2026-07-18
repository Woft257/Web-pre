import "server-only";

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

import { env } from "@/lib/env";
import { ApiError } from "@/lib/http/api-response";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function requireAdmin(request: NextRequest) {
  const secret = request.headers.get("x-admin-secret") ?? "";
  if (!safeEqual(secret, env.ADMIN_SECRET)) {
    throw new ApiError(401, "ADMIN_AUTH_REQUIRED", "Admin authorization is required");
  }
  return "admin";
}
