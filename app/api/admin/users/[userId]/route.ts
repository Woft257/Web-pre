import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { hashPassword } from "@/lib/auth/password";
import { ApiError, apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";
import { adminUpdatePasswordSchema } from "@/lib/validation/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    enforceSameOrigin(request);
    requireAdmin(request);
    await enforceRateLimit(request, "admin-users-write", { limit: 30, windowSeconds: 60 });
    const userId = z.uuid().parse((await context.params).userId);
    const body = adminUpdatePasswordSchema.parse(await request.json());
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("admin_update_user_password", {
      p_user_id: userId,
      p_password_hash: await hashPassword(body.password),
    });
    if (error) throw error;
    return apiSuccess({ updated: true });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    enforceSameOrigin(request);
    requireAdmin(request);
    await enforceRateLimit(request, "admin-users-write", { limit: 30, windowSeconds: 60 });
    const userId = z.uuid().parse((await context.params).userId);
    const supabase = createAdminClient();
    const { count, error: countError } = await supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new ApiError(
        409,
        "USER_HAS_TRADE_HISTORY",
        "Users with trade history cannot be deleted",
      );
    }

    const { error } = await supabase.rpc("admin_delete_event_user", { p_user_id: userId });
    if (error) throw error;
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiFailure(error);
  }
}
