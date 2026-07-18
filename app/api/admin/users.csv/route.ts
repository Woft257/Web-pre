import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { apiFailure } from "@/lib/http/api-response";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | boolean | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    await enforceRateLimit(request, "admin-participants-export", { limit: 10, windowSeconds: 60 });
    const supabase = createAdminClient();
    const [{ data: users, error: usersError }, { data: codes, error: codesError }, { data: predictions, error: predictionsError }] = await Promise.all([
      supabase.from("event_users").select("*").order("created_at", { ascending: true }),
      supabase.from("invite_codes").select("id, code_hint"),
      supabase.from("predictions").select("*"),
    ]);
    if (usersError) throw usersError;
    if (codesError) throw codesError;
    if (predictionsError) throw predictionsError;
    const codeById = new Map(codes.map((code) => [code.id, code.code_hint]));
    const predictionByUser = new Map(predictions.map((prediction) => [prediction.user_id, prediction]));
    const rows = [
      ["uid", "code_hint", "status", "winner", "argentina_score", "spain_score", "messi_scores", "submitted_at", "joined_at"],
      ...users.map((user) => {
        const prediction = predictionByUser.get(user.id);
        return [
          user.uid,
          codeById.get(user.invite_code_id) ?? "",
          user.status,
          prediction?.winner ?? "",
          prediction?.argentina_score ?? "",
          prediction?.spain_score ?? "",
          prediction?.messi_scores ?? "",
          prediction?.submitted_at ?? "",
          user.created_at,
        ];
      }),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, { headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="mexc-contest-participants-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    } });
  } catch (error) {
    return apiFailure(error);
  }
}
