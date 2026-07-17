import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";

const matchStateSchema = z.object({
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
  matchMinute: z.number().int().min(0).max(150).nullable(),
  event: z.string().trim().min(2).max(160),
}).strict();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ marketId: string }> },
) {
  try {
    enforceSameOrigin(request);
    const actor = requireAdmin(request);
    await enforceRateLimit(request, "admin-match-state", { limit: 60, windowSeconds: 60 });
    const { marketId } = await context.params;
    const body = matchStateSchema.parse(await request.json());
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("admin_update_match_state", {
      p_market_id: marketId,
      p_home_score: body.homeScore,
      p_away_score: body.awayScore,
      p_match_minute: body.matchMinute ?? undefined,
      p_latest_event: body.event,
      p_actor: actor,
    });
    if (error) throw error;
    return apiSuccess({
      marketId: data.id,
      homeScore: data.home_score,
      awayScore: data.away_score,
      matchMinute: data.match_minute,
      oracleVersion: data.oracle_version,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
