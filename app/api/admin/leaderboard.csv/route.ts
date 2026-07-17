import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { microToPoints } from "@/lib/domain/constants";
import { apiFailure } from "@/lib/http/api-response";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    await enforceRateLimit(request, "admin-leaderboard-export", { limit: 10, windowSeconds: 60 });
    const supabase = createAdminClient();
    const [{ data: entries, error: entriesError }, { data: users, error: usersError }] = await Promise.all([
      supabase
        .from("leaderboard_entries")
        .select("*")
        .order("equity_micro", { ascending: false })
        .order("pnl_micro", { ascending: false })
        .order("correct_predictions", { ascending: false })
        .order("updated_at", { ascending: true }),
      supabase.from("event_users").select("id, uid"),
    ]);
    if (entriesError) throw entriesError;
    if (usersError) throw usersError;

    const uidById = new Map(users.map((user) => [user.id, user.uid]));
    const rows = [
      [
        "rank",
        "uid",
        "balance",
        "position_value",
        "equity",
        "pnl",
        "correct_predictions",
        "settled_predictions",
        "updated_at",
      ],
      ...entries.map((entry, index) => [
        index + 1,
        uidById.get(entry.user_id) ?? entry.masked_uid,
        microToPoints(entry.balance_micro),
        microToPoints(entry.position_value_micro),
        microToPoints(entry.equity_micro),
        microToPoints(entry.pnl_micro),
        entry.correct_predictions,
        entry.settled_predictions,
        entry.updated_at,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="mexc-leaderboard-${date}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
