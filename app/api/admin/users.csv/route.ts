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

interface ExportUser {
  id: string;
  uid: string;
  initial_points_micro: number;
  balance_micro: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    await enforceRateLimit(request, "admin-users-export", { limit: 10, windowSeconds: 60 });

    const supabase = createAdminClient();
    const users: ExportUser[] = [];
    const pageSize = 1_000;

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("event_users")
        .select("id, uid, initial_points_micro, balance_micro, status, created_at, updated_at")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      users.push(...data);
      if (data.length < pageSize) break;
    }

    const rows = [
      ["id", "uid", "initial_points", "balance", "status", "created_at", "updated_at"],
      ...users.map((user) => [
        user.id,
        user.uid,
        microToPoints(user.initial_points_micro),
        microToPoints(user.balance_micro),
        user.status,
        user.created_at,
        user.updated_at,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="mexc-users-${date}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
