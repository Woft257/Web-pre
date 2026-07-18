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
    await enforceRateLimit(request, "admin-leaderboard-export", { limit: 10, windowSeconds: 60 });
    const supabase = createAdminClient();
    const [{ data: entries, error: entriesError }, { data: users, error: usersError }] = await Promise.all([
      supabase.from("contest_leaderboard").select("*").order("rank", { ascending: true }),
      supabase.from("event_users").select("id, uid"),
    ]);
    if (entriesError) throw entriesError;
    if (usersError) throw usersError;
    const uidById = new Map(users.map((user) => [user.id, user.uid]));
    const rows = [
      ["rank", "uid", "points", "correct_answers", "submitted_at"],
      ...entries.map((entry) => [
        entry.rank ?? "",
        uidById.get(entry.user_id ?? "") ?? entry.masked_uid ?? "",
        entry.points ?? 0,
        entry.correct_answers ?? 0,
        entry.submitted_at ?? "",
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, { headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="mexc-contest-leaderboard-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    } });
  } catch (error) {
    return apiFailure(error);
  }
}
