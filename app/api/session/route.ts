import type { NextRequest } from "next/server";

import { issueSession, revokeCurrentSession } from "@/lib/auth/session";
import { maskUid } from "@/lib/domain/contest";
import { hashAccessCode } from "@/lib/domain/access-code";
import { ApiError, apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { getUserPrediction } from "@/lib/repositories/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { accessRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    await enforceRateLimit(request, "contest-access-ip", { limit: 30, windowSeconds: 300 });
    const body = accessRequestSchema.parse(await request.json());
    await enforceRateLimit(request, "contest-access-pair", {
      limit: 10,
      windowSeconds: 300,
      identity: `${body.code}:${body.uid}`,
    });

    const supabase = createAdminClient();
    const { data: user, error } = await supabase.rpc("claim_contest_access", {
      p_uid: body.uid,
      p_code_hash: hashAccessCode(body.code),
    });
    if (error) {
      if (["INVALID_INVITE_CODE", "INVALID_ACCESS_PAIR"].some((code) => error.message.includes(code))) {
        throw new ApiError(401, "INVALID_ACCESS", "Invalid access code or UID");
      }
      throw error;
    }

    const prediction = await getUserPrediction(user.id);
    const response = apiSuccess({
      id: user.id,
      uid: user.uid,
      maskedUid: maskUid(user.uid),
      hasPrediction: Boolean(prediction),
      submittedAt: prediction?.submittedAt ?? null,
    });
    await issueSession(user.id, user.auth_version, response);
    return response;
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    const response = apiSuccess({ signedOut: true });
    await revokeCurrentSession(response);
    return response;
  } catch (error) {
    return apiFailure(error);
  }
}
