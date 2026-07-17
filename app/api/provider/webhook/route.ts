import type { NextRequest } from "next/server";

import { requireWorker } from "@/lib/auth/admin";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/server";
import { oracleUpdateSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    requireWorker(request);
    await enforceRateLimit(request, "provider-webhook", { limit: 60, windowSeconds: 60 });
    const body = oracleUpdateSchema.parse(await request.json());
    const supabase = createAdminClient();
    const homePpm = Math.round(body.homeProbability * 1_000_000);
    const { data, error } = await supabase.rpc("update_market_oracle", {
      p_market_id: body.marketId,
      p_provider: body.provider,
      p_home_probability_ppm: homePpm,
      p_away_probability_ppm: 1_000_000 - homePpm,
      p_source_at: body.sourceAt,
      p_status: body.status,
      p_home_score: body.homeScore,
      p_away_score: body.awayScore,
      p_match_minute: body.matchMinute ?? undefined,
      p_match_period: body.matchPeriod ?? undefined,
      p_latest_event: body.latestEvent ?? undefined,
      p_suspension_reason: body.suspensionReason ?? undefined,
      p_home_decimal_odds: body.homeDecimalOdds ?? undefined,
      p_away_decimal_odds: body.awayDecimalOdds ?? undefined,
      p_raw_payload: (body.rawPayload ?? null) as Json,
    });
    if (error) throw error;
    return apiSuccess({ marketId: data.id, oracleVersion: data.oracle_version, status: data.status });
  } catch (error) {
    return apiFailure(error);
  }
}
