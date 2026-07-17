import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { hashPassword } from "@/lib/auth/password";
import { microToPoints } from "@/lib/domain/constants";
import { ApiError, apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";
import { adminCreateUserSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

function serializeUser(user: {
  id: string;
  uid: string;
  balance_micro: number;
  status: string;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: user.id,
    uid: user.uid,
    balance: microToPoints(user.balance_micro),
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    await enforceRateLimit(request, "admin-users-read", { limit: 60, windowSeconds: 60 });
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("event_users")
      .select("id, uid, balance_micro, status, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return apiSuccess(data.map(serializeUser));
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    requireAdmin(request);
    await enforceRateLimit(request, "admin-users-write", { limit: 30, windowSeconds: 60 });
    const body = adminCreateUserSchema.parse(await request.json());
    const supabase = createAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("event_users")
      .select("id")
      .eq("uid", body.uid)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) throw new ApiError(409, "USER_ALREADY_EXISTS", "This UID already exists");

    const { data, error } = await supabase.rpc("admin_create_event_user", {
      p_uid: body.uid,
      p_password_hash: await hashPassword(body.password),
    });
    if (error) throw error;
    return apiSuccess(serializeUser(data), { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
