import type { NextRequest } from "next/server";

import { microToPoints } from "@/lib/domain/constants";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, "leaderboard-read", { limit: 120, windowSeconds: 60 });
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("leaderboard_entries")
      .select("*")
      .order("equity_micro", { ascending: false })
      .order("pnl_micro", { ascending: false })
      .order("correct_predictions", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(100);
    if (error) throw error;

    return apiSuccess(
      data.map((entry, index) => ({
        rank: index + 1,
        maskedUid: entry.masked_uid,
        balance: microToPoints(entry.balance_micro),
        positionValue: microToPoints(entry.position_value_micro),
        equity: microToPoints(entry.equity_micro),
        pnl: microToPoints(entry.pnl_micro),
        correctPredictions: entry.correct_predictions,
        settledPredictions: entry.settled_predictions,
        updatedAt: entry.updated_at,
      })),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
