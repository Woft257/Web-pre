import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { microToPoints } from "@/lib/domain/constants";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";
import { adminVoidSchema } from "@/lib/validation/schemas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ marketId: string }> },
) {
  try {
    enforceSameOrigin(request);
    const actor = requireAdmin(request);
    await enforceRateLimit(request, "admin-void", { limit: 10, windowSeconds: 60 });
    const { marketId } = await context.params;
    const body = adminVoidSchema.parse(await request.json());
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("void_market", {
      p_market_id: marketId,
      p_result_source: body.resultSource,
      p_result_reference: body.resultReference,
      p_actor: actor,
    });
    if (error) throw error;
    return apiSuccess({
      settlementId: data.id,
      affectedUsers: data.affected_users,
      totalPayout: microToPoints(data.total_payout_micro),
    });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ marketId: string }> },
) {
  try {
    requireAdmin(request);
    await enforceRateLimit(request, "admin-preview", { limit: 60, windowSeconds: 60 });
    const { marketId } = await context.params;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .rpc("preview_settlement", {
        p_market_id: marketId,
        p_kind: "void",
      })
      .single();
    if (error) throw error;
    return apiSuccess({
      affectedUsers: data.affected_users,
      totalPayout: microToPoints(data.total_payout_micro),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
