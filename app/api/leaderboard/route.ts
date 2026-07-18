import { requireSessionUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { getContestData, getLeaderboard } from "@/lib/repositories/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSessionUser();
    const contest = await getContestData();
    return apiSuccess({
      published: Boolean(contest.result),
      result: contest.result,
      entries: contest.result ? await getLeaderboard() : [],
    });
  } catch (error) {
    return apiFailure(error);
  }
}
