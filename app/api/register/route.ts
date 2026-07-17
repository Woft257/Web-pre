import type { NextRequest } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import { issueSession } from "@/lib/auth/session";
import { microToPoints } from "@/lib/domain/constants";
import { ApiError, apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";
import { registrationRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    await enforceRateLimit(request, "registration-ip", { limit: 10, windowSeconds: 900 });
    const body = registrationRequestSchema.parse(await request.json());
    await enforceRateLimit(request, "registration-uid", {
      limit: 5,
      windowSeconds: 900,
      identity: body.uid,
    });

    const supabase = createAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("event_users")
      .select("id")
      .eq("uid", body.uid)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      throw new ApiError(409, "USER_ALREADY_EXISTS", "This UID already has an account");
    }

    const { data: user, error } = await supabase.rpc("register_event_user", {
      p_uid: body.uid,
      p_password_hash: await hashPassword(body.password),
    });
    if (error) {
      if (error.message.includes("USER_ALREADY_EXISTS") || error.code === "23505") {
        throw new ApiError(409, "USER_ALREADY_EXISTS", "This UID already has an account");
      }
      throw error;
    }

    const response = apiSuccess({
      uid: user.uid,
      maskedUid: `${user.uid.slice(0, 2)}****${user.uid.slice(-2)}`,
      balance: microToPoints(user.balance_micro),
    }, { status: 201 });
    await issueSession(user.id, user.auth_version, response);
    return response;
  } catch (error) {
    return apiFailure(error);
  }
}
