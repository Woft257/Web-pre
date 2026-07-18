import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ marketId: string }> },
) {
  try {
    enforceSameOrigin(request);
    const actor = requireAdmin(request);
    await enforceRateLimit(request, "admin-release-hold", { limit: 20, windowSeconds: 60 });
    const { marketId } = await context.params;
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("release_market_hold", {
      p_market_id: marketId,
      p_actor: actor,
    });
    if (error) throw error;
    return apiSuccess({ marketId: data.id, status: data.status, manualHold: data.manual_hold });
  } catch (error) {
    return apiFailure(error);
  }
}
