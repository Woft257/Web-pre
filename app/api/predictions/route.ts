import type { NextRequest } from "next/server";

import { requireSessionUser } from "@/lib/auth/session";
import { serializePrediction } from "@/lib/domain/contest";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { getTimeline, getUserPrediction } from "@/lib/repositories/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { predictionRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const prediction = await getUserPrediction(user.id);
    const requestedPage = Number(request.nextUrl.searchParams.get("page") ?? "1");
    const page = Number.isInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 10_000)
      : 1;
    const timeline = prediction
      ? await getTimeline(page)
      : { entries: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } };
    return apiSuccess({
      prediction,
      timeline: timeline.entries,
      timelinePagination: timeline.pagination,
    });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    const user = await requireSessionUser();
    await enforceRateLimit(request, "submit-prediction", {
      limit: 5,
      windowSeconds: 300,
      identity: user.id,
    });
    const body = predictionRequestSchema.parse(await request.json());
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("submit_contest_prediction", {
      p_user_id: user.id,
      p_winner: body.winner,
      p_argentina_score: body.argentinaScore,
      p_spain_score: body.spainScore,
      p_messi_scores: body.messiScores,
    });
    if (error) throw error;
    return apiSuccess(serializePrediction(data), { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
