import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    await enforceRateLimit(request, "admin-auth", { limit: 10, windowSeconds: 60 });
    requireAdmin(request);
    return apiSuccess({ authorized: true });
  } catch (error) {
    return apiFailure(error);
  }
}
