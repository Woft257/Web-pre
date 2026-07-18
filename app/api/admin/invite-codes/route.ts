import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { generateAccessCode, hashAccessCode } from "@/lib/domain/access-code";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";
import { adminGenerateCodesSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    requireAdmin(request);
    await enforceRateLimit(request, "admin-generate-codes", { limit: 20, windowSeconds: 60 });
    const body = adminGenerateCodesSchema.parse(await request.json());
    const codes = Array.from({ length: body.count }, generateAccessCode);
    const supabase = createAdminClient();
    const { error } = await supabase.from("invite_codes").insert(codes.map((code) => ({
      code_hash: hashAccessCode(code),
      code_hint: code.slice(-4),
    })));
    if (error) throw error;
    return apiSuccess({ codes }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
