import { setTimeout as delay } from "node:timers/promises";

import type { NextRequest } from "next/server";

import { requireSessionUser } from "@/lib/auth/session";
import { IN_PLAY_ACCEPTANCE_DELAY_MS, microToPoints } from "@/lib/domain/constants";
import { verifyQuoteToken } from "@/lib/domain/quote-token";
import { ApiError, apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";
import { tradeRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ marketId: string }> },
) {
  try {
    enforceSameOrigin(request);
    const user = await requireSessionUser();
    await enforceRateLimit(request, "trade", { limit: 30, windowSeconds: 60, identity: user.id });
    const { marketId } = await context.params;
    const body = tradeRequestSchema.parse(await request.json());

    let quote;
    try {
      quote = await verifyQuoteToken(body.quoteToken);
    } catch {
      throw new ApiError(409, "QUOTE_EXPIRED", "The quote expired; request a new one");
    }

    if (quote.userId !== user.id || quote.marketId !== marketId) {
      throw new ApiError(403, "QUOTE_OWNER_MISMATCH", "This quote belongs to another session");
    }

    if (quote.marketStatus === "live_open") {
      const acceptAt = (quote.iat ?? 0) * 1000 + IN_PLAY_ACCEPTANCE_DELAY_MS;
      const waitMs = Math.max(0, acceptAt - Date.now());
      if (waitMs > 0) {
        await delay(waitMs);
      }
      try {
        quote = await verifyQuoteToken(body.quoteToken);
      } catch {
        throw new ApiError(409, "QUOTE_EXPIRED", "The quote expired during the in-play delay");
      }
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .rpc("place_trade", {
        p_user_id: user.id,
        p_market_id: marketId,
        p_side: quote.side,
        p_action: quote.action,
        p_amount_micro: quote.amountMicro,
        p_quote_id: quote.quoteId,
        p_idempotency_key: body.idempotencyKey,
        p_expected_oracle_version: quote.oracleVersion,
        p_expected_vmm_version: quote.vmmVersion,
      })
      .single();
    if (error) throw error;

    return apiSuccess({
      tradeId: data.trade_id,
      balance: microToPoints(data.user_balance_micro),
      shares: microToPoints(data.executed_shares_micro),
      cashDelta: microToPoints(data.executed_cash_delta_micro),
      averagePrice: data.executed_average_price_ppm / 1_000_000,
      oracleVersion: data.current_oracle_version,
      vmmVersion: data.current_vmm_version,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
