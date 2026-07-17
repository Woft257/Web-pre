import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";
import { adminStatusSchema } from "@/lib/validation/schemas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ marketId: string }> },
) {
  try {
    enforceSameOrigin(request);
    const actor = requireAdmin(request);
    await enforceRateLimit(request, "admin-status", { limit: 30, windowSeconds: 60 });
    const { marketId } = await context.params;
    const body = adminStatusSchema.parse(await request.json());
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("set_market_status", {
      p_market_id: marketId,
      p_status: body.status,
      p_reason: body.reason,
      p_actor: actor,
    });
    if (error) throw error;
    return apiSuccess({ marketId: data.id, status: data.status });
  } catch (error) {
    return apiFailure(error);
  }
}
