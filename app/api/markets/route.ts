import type { NextRequest } from "next/server";

import { serializeMarket } from "@/lib/domain/serializers";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { listMarkets } from "@/lib/repositories/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, "markets-read", { limit: 120, windowSeconds: 60 });
    const markets = await listMarkets();
    return apiSuccess(markets.map(serializeMarket));
  } catch (error) {
    return apiFailure(error);
  }
}
