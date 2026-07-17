import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/domain/constants";
import { ApiError } from "@/lib/http/api-response";
import { createAdminClient } from "@/lib/supabase/server";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueSession(
  userId: string,
  request: NextRequest,
  response: NextResponse,
) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const supabase = createAdminClient();
  const { error } = await supabase.from("uid_sessions").insert({
    token_hash: tokenHash,
    user_id: userId,
    user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw error;
  }

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const supabase = createAdminClient();
  const tokenHash = hashToken(token);
  const { data: session, error: sessionError } = await supabase
    .from("uid_sessions")
    .select("user_id, expires_at")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (sessionError) {
    throw sessionError;
  }
  if (!session) {
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from("event_users")
    .select("*")
    .eq("id", session.user_id)
    .maybeSingle();

  if (userError) {
    throw userError;
  }
  return user;
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiError(401, "AUTH_REQUIRED", "Enter your 8-digit UID to continue");
  }
  return user;
}

export async function revokeCurrentSession(response: NextResponse) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const supabase = createAdminClient();
    await supabase.from("uid_sessions").delete().eq("token_hash", hashToken(token));
  }
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
