import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/auth/session-config";
import { signSessionToken, verifySessionToken } from "@/lib/auth/session-token";
import { ApiError } from "@/lib/http/api-response";
import { createAdminClient } from "@/lib/supabase/server";

export async function issueSession(
  userId: string,
  authVersion: number,
  response: NextResponse,
) {
  const token = await signSessionToken(userId, authVersion);

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

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const supabase = createAdminClient();
  const { data: user, error: userError } = await supabase
    .from("event_users")
    .select("*")
    .eq("id", claims.userId)
    .maybeSingle();

  if (userError) {
    throw userError;
  }
  if (!user || user.status !== "active" || user.auth_version !== claims.authVersion) return null;
  return user;
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiError(401, "AUTH_REQUIRED", "Enter your access code and 8-digit UID to continue");
  }
  return user;
}

export async function revokeCurrentSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
