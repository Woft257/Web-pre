import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { maskUid, serializePrediction, serializeResult } from "@/lib/domain/contest";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { getContestData } from "@/lib/repositories/queries";
import { createAdminClient } from "@/lib/supabase/server";
import {
  adminParticipantQuerySchema,
  adminPredictionStatusSchema,
  adminResultSchema,
} from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";
const PARTICIPANTS_PER_PAGE = 20;

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    await enforceRateLimit(request, "admin-contest-read", { limit: 60, windowSeconds: 60 });
    const query = adminParticipantQuerySchema.parse({
      page: request.nextUrl.searchParams.get("participantPage") ?? undefined,
      search: request.nextUrl.searchParams.get("participantSearch") ?? undefined,
    });
    const supabase = createAdminClient();
    const participantCountQuery = query.search
      ? supabase.from("event_users").select("id", { count: "exact", head: true }).ilike("uid", `%${query.search}%`)
      : supabase.from("event_users").select("id", { count: "exact", head: true });
    const [contest, codesResult, participantsCountResult, draftResult] = await Promise.all([
      getContestData(),
      supabase.from("invite_codes").select("*").order("created_at", { ascending: true }),
      participantCountQuery,
      supabase.from("contest_results").select("*").eq("id", true).maybeSingle(),
    ]);
    if (codesResult.error) throw codesResult.error;
    if (participantsCountResult.error) throw participantsCountResult.error;
    if (draftResult.error) throw draftResult.error;

    const participantTotal = participantsCountResult.count ?? 0;
    const participantTotalPages = Math.max(1, Math.ceil(participantTotal / PARTICIPANTS_PER_PAGE));
    const participantPage = Math.min(query.page, participantTotalPages);
    const participantFrom = (participantPage - 1) * PARTICIPANTS_PER_PAGE;
    const participantQuery = query.search
      ? supabase.from("event_users").select("*").ilike("uid", `%${query.search}%`)
      : supabase.from("event_users").select("*");
    const usersResult = await participantQuery
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(participantFrom, participantFrom + PARTICIPANTS_PER_PAGE - 1);
    if (usersResult.error) throw usersResult.error;

    const userIds = usersResult.data.map((user) => user.id);
    const predictionsResult = userIds.length > 0
      ? await supabase.from("predictions").select("*").in("user_id", userIds)
      : null;
    if (predictionsResult?.error) throw predictionsResult.error;

    const predictionByUser = new Map((predictionsResult?.data ?? []).map((prediction) => [prediction.user_id, prediction]));
    const codeById = new Map(codesResult.data.map((code) => [code.id, code]));
    return apiSuccess({
      ...contest,
      draftResult: draftResult.data ? {
        winner: draftResult.data.winner,
        argentinaScore: draftResult.data.argentina_score,
        spainScore: draftResult.data.spain_score,
        messiScores: draftResult.data.messi_scores,
        isPublished: draftResult.data.is_published,
      } : null,
      inviteCodes: codesResult.data.map((code) => ({
        id: code.id,
        codeHint: code.code_hint,
        status: code.status,
        claimCount: code.claim_count,
        lastClaimedAt: code.last_claimed_at,
        createdAt: code.created_at,
      })),
      participants: usersResult.data.map((user) => {
        const prediction = predictionByUser.get(user.id);
        return {
          id: user.id,
          uid: user.uid,
          maskedUid: maskUid(user.uid),
          codeHint: codeById.get(user.invite_code_id)?.code_hint ?? "????",
          status: user.status,
          createdAt: user.created_at,
          prediction: prediction ? serializePrediction(prediction) : null,
        };
      }),
      participantPagination: {
        page: participantPage,
        pageSize: PARTICIPANTS_PER_PAGE,
        total: participantTotal,
        totalPages: participantTotalPages,
        search: query.search,
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    const actor = requireAdmin(request);
    await enforceRateLimit(request, "admin-publish-result", { limit: 10, windowSeconds: 60 });
    const body = adminResultSchema.parse(await request.json());
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("publish_contest_result", {
      p_winner: body.winner,
      p_argentina_score: body.argentinaScore,
      p_spain_score: body.spainScore,
      p_messi_scores: body.messiScores,
      p_actor: actor,
    });
    if (error) throw error;
    return apiSuccess(serializeResult(data));
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    const actor = requireAdmin(request);
    await enforceRateLimit(request, "admin-prediction-status", { limit: 20, windowSeconds: 60 });
    const body = adminPredictionStatusSchema.parse(await request.json());
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("set_predictions_open", {
      p_open: body.open,
      p_actor: actor,
    });
    if (error) throw error;
    return apiSuccess({ predictionsOpen: data.predictions_open });
  } catch (error) {
    return apiFailure(error);
  }
}
