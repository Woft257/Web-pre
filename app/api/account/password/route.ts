import type { NextRequest } from "next/server";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { issueSession, requireSessionUser } from "@/lib/auth/session";
import { ApiError, apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    const user = await requireSessionUser();
    await enforceRateLimit(request, "account-password", {
      limit: 10,
      windowSeconds: 900,
      identity: user.id,
    });
    const body = changePasswordSchema.parse(await request.json());

    if (!user.password_hash || !await verifyPassword(body.currentPassword, user.password_hash)) {
      throw new ApiError(401, "INVALID_CURRENT_PASSWORD", "Current password is incorrect");
    }

    const supabase = createAdminClient();
    const { data: updatedUser, error } = await supabase.rpc("admin_update_user_password", {
      p_user_id: user.id,
      p_password_hash: await hashPassword(body.newPassword),
    });
    if (error) throw error;

    const response = apiSuccess({ updated: true });
    await issueSession(updatedUser.id, updatedUser.auth_version, response);
    return response;
  } catch (error) {
    return apiFailure(error);
  }
}
