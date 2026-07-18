import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { ApiError, apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    enforceSameOrigin(request);
    const actor = requireAdmin(request);
    await enforceRateLimit(request, "admin-delete-participant", { limit: 30, windowSeconds: 60 });
    const { userId } = await context.params;
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("delete_contest_participant", {
      p_user_id: userId,
      p_actor: actor,
    });
    if (error?.message.includes("USER_NOT_FOUND")) {
      throw new ApiError(404, "USER_NOT_FOUND", "Participant not found");
    }
    if (error) throw error;
    return apiSuccess(data);
  } catch (error) {
    return apiFailure(error);
  }
}
