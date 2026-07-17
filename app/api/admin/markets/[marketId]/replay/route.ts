import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { getMarket } from "@/lib/repositories/queries";
import { createAdminClient } from "@/lib/supabase/server";

const replaySchema = z.object({
  homeProbability: z.number().min(0.01).max(0.99),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
  matchMinute: z.number().int().min(0).max(150).nullable(),
  status: z.enum(["pre_match_open", "live_open", "suspended", "ended"]),
  event: z.string().trim().min(2).max(160),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ marketId: string }> },
) {
  try {
    enforceSameOrigin(request);
    requireAdmin(request);
    await enforceRateLimit(request, "admin-replay", { limit: 60, windowSeconds: 60 });
    const { marketId } = await context.params;
    const body = replaySchema.parse(await request.json());
    const market = await getMarket(marketId);
    if (!market) throw new Error("MARKET_NOT_FOUND");

    const homePpm = Math.round(body.homeProbability * 1_000_000);
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("update_market_oracle", {
      p_market_id: marketId,
      p_provider: "replay",
      p_home_probability_ppm: homePpm,
      p_away_probability_ppm: 1_000_000 - homePpm,
      p_source_at: new Date().toISOString(),
      p_status: body.status,
      p_home_score: body.homeScore,
      p_away_score: body.awayScore,
      p_match_minute: body.matchMinute ?? undefined,
      p_match_period: body.status === "pre_match_open" ? "pre_match" : "in_play",
      p_latest_event: body.event,
      p_suspension_reason: body.status === "suspended" ? body.event : undefined,
      p_raw_payload: { replay: true, event: body.event },
    });
    if (error) throw error;
    return apiSuccess({ marketId: data.id, status: data.status, oracleVersion: data.oracle_version });
  } catch (error) {
    return apiFailure(error);
  }
}
