import type { NextRequest } from "next/server";

import { verifyPassword } from "@/lib/auth/password";
import { issueSession, revokeCurrentSession } from "@/lib/auth/session";
import { microToPoints } from "@/lib/domain/constants";
import { ApiError, apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";
import { sessionRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    await enforceRateLimit(request, "session-ip", { limit: 60, windowSeconds: 300 });
    const body = sessionRequestSchema.parse(await request.json());
    await enforceRateLimit(request, "session-uid", {
      limit: 10,
      windowSeconds: 300,
      identity: body.uid,
    });
    const supabase = createAdminClient();
    const { data: user, error } = await supabase
      .from("event_users")
      .select("*")
      .eq("uid", body.uid)
      .maybeSingle();
    if (error) throw error;
    if (
      !user
      || user.status !== "active"
      || !user.password_hash
      || !await verifyPassword(body.password, user.password_hash)
    ) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid UID or password");
    }

    const response = apiSuccess({
      uid: user.uid,
      maskedUid: `${user.uid.slice(0, 2)}****${user.uid.slice(-2)}`,
      balance: microToPoints(user.balance_micro),
    });
    await issueSession(user.id, request, response);
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
