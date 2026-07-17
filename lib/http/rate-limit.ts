import "server-only";

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

import { env } from "@/lib/env";
import { ApiError } from "@/lib/http/api-response";
import { createAdminClient } from "@/lib/supabase/server";

function requestIdentity(request: NextRequest) {
  return (
    request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "local"
  );
}

export async function enforceRateLimit(
  request: NextRequest,
  scope: string,
  options: { limit: number; windowSeconds: number; identity?: string },
) {
  const identity = options.identity ?? requestIdentity(request);
  const keyHash = createHash("sha256")
    .update(`${scope}:${identity}:${env.SESSION_SECRET}`)
    .digest("hex");
  const supabase = createAdminClient();
  const { data: allowed, error } = await supabase.rpc("consume_rate_limit", {
    p_scope: scope,
    p_key_hash: keyHash,
    p_limit: options.limit,
    p_window_seconds: options.windowSeconds,
  });

  if (error) throw error;
  if (!allowed) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests; try again shortly");
  }
}

export function enforceSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new ApiError(403, "INVALID_ORIGIN", "Cross-origin request rejected");
  }

  const requestHost = (
    request.headers.get("x-forwarded-host")
    ?? request.headers.get("host")
    ?? request.nextUrl.host
  ).split(",")[0].trim();

  if (originUrl.host === requestHost) return;

  const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const requestUrl = new URL(`${originUrl.protocol}//${requestHost}`);
  const isLocalAlias = process.env.NODE_ENV !== "production"
    && loopbackHosts.has(originUrl.hostname)
    && loopbackHosts.has(requestUrl.hostname)
    && originUrl.port === requestUrl.port;

  if (!isLocalAlias) {
    throw new ApiError(403, "INVALID_ORIGIN", "Cross-origin request rejected");
  }
}
