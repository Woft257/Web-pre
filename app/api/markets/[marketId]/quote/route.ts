import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { requireSessionUser } from "@/lib/auth/session";
import {
  MICRO_UNITS,
  pointsToMicro,
  QUOTE_TTL_MS,
} from "@/lib/domain/constants";
import { marketStateFromRow, quoteBuy, quoteSell } from "@/lib/domain/pricing";
import { signQuoteToken } from "@/lib/domain/quote-token";
import { ApiError, apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { getMarket, getPosition } from "@/lib/repositories/queries";
import { quoteRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ marketId: string }> },
) {
  try {
    enforceSameOrigin(request);
    const user = await requireSessionUser();
    await enforceRateLimit(request, "quote", { limit: 60, windowSeconds: 60, identity: user.id });
    const { marketId } = await context.params;
    const body = quoteRequestSchema.parse(await request.json());
    const [market, position] = await Promise.all([
      getMarket(marketId),
      getPosition(user.id, marketId),
    ]);

    if (!market) {
      throw new ApiError(404, "MARKET_NOT_FOUND", "Market not found");
    }
    if (!["pre_match_open", "live_open"].includes(market.status) || market.feed_status !== "healthy") {
      throw new ApiError(409, "MARKET_NOT_OPEN", "Trading is currently suspended or closed");
    }

    const state = marketStateFromRow(market);
    const quoteId = randomUUID();
    let amountMicro: number;
    let quote;

    if (body.action === "buy") {
      amountMicro = pointsToMicro(body.amount);
      if (user.balance_micro < amountMicro) {
        throw new ApiError(409, "INSUFFICIENT_BALANCE", "Not enough available points");
      }
      if ((position?.gross_bought_micro ?? 0) + amountMicro > market.max_user_exposure_micro) {
        throw new ApiError(409, "MARKET_EXPOSURE_LIMIT", "This order exceeds the market exposure limit");
      }
      quote = quoteBuy(state, body.side, body.amount);
    } else {
      amountMicro = Math.round(body.shares * MICRO_UNITS);
      const availableShares =
        body.side === "home"
          ? (position?.home_shares_micro ?? 0) / MICRO_UNITS
          : (position?.away_shares_micro ?? 0) / MICRO_UNITS;
      if (body.shares > availableShares) {
        throw new ApiError(409, "INSUFFICIENT_SHARES", "Not enough shares to sell");
      }
      quote = quoteSell(state, body.side, body.shares);
      if (pointsToMicro(quote.cashPoints) < market.min_order_micro) {
        throw new ApiError(400, "ORDER_TOO_SMALL", "Sell value is below the minimum order");
      }
    }

    const quoteToken = await signQuoteToken({
      userId: user.id,
      marketId,
      side: body.side,
      action: body.action,
      amountMicro,
      oracleVersion: market.oracle_version,
      vmmVersion: market.vmm_version,
      quoteId,
      marketStatus: market.status,
      feedTimestamp: market.oracle_source_at,
      maxSlippageBps: 0,
    });

    return apiSuccess({
      quoteId,
      quoteToken,
      action: body.action,
      side: body.side,
      shares: quote.shares,
      cashPoints: quote.cashPoints,
      averagePrice: quote.averagePrice,
      priceImpact: quote.priceImpact,
      probabilityBefore: quote.probabilityBefore,
      probabilityAfter: quote.probabilityAfter,
      maxPayout: quote.maxPayout,
      expectedProfit: body.action === "buy" ? quote.maxPayout - quote.cashPoints : null,
      oracleVersion: market.oracle_version,
      vmmVersion: market.vmm_version,
      feedTimestamp: market.oracle_source_at,
      maxSlippageBps: 0,
      quotedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
