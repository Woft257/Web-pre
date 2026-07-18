import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";
import { adminResetContestSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    const actor = requireAdmin(request);
    await enforceRateLimit(request, "admin-reset-contest", { limit: 3, windowSeconds: 300 });
    adminResetContestSchema.parse(await request.json());
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("reset_contest_event", { p_actor: actor });
    if (error) throw error;
    return apiSuccess(data);
  } catch (error) {
    return apiFailure(error);
  }
}
