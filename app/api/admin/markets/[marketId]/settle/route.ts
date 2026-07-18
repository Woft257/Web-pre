import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { microToPoints } from "@/lib/domain/constants";
import { ApiError, apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { getMarket } from "@/lib/repositories/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { adminSettlementSchema } from "@/lib/validation/schemas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ marketId: string }> },
) {
  try {
    enforceSameOrigin(request);
    const actor = requireAdmin(request);
    await enforceRateLimit(request, "admin-settle", { limit: 20, windowSeconds: 60 });
    const { marketId } = await context.params;
    const body = adminSettlementSchema.parse(await request.json());
    const market = await getMarket(marketId);
    if (!market) throw new ApiError(404, "MARKET_NOT_FOUND", "Market not found");
    if (market.status !== "ended") {
      throw new ApiError(409, "MARKET_MUST_BE_ENDED", "The market must be ended first");
    }
    if (market.official_winner && market.official_winner !== body.outcome) {
      throw new ApiError(409, "SETTLEMENT_OUTCOME_MISMATCH", "Outcome conflicts with FIFA");
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("settle_market", {
      p_market_id: marketId,
      p_outcome: body.outcome,
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
    const outcome = request.nextUrl.searchParams.get("outcome");
    if (outcome !== "home" && outcome !== "away") {
      throw new ApiError(400, "INVALID_OUTCOME", "Outcome must be home or away");
    }
    const market = await getMarket(marketId);
    if (!market) throw new ApiError(404, "MARKET_NOT_FOUND", "Market not found");
    if (market.status !== "ended") {
      throw new ApiError(409, "MARKET_MUST_BE_ENDED", "The market must be ended first");
    }
    if (market.official_winner && market.official_winner !== outcome) {
      throw new ApiError(409, "SETTLEMENT_OUTCOME_MISMATCH", "Outcome conflicts with FIFA");
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .rpc("preview_settlement", {
        p_market_id: marketId,
        p_kind: "result",
        p_outcome: outcome,
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
