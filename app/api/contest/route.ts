import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { getContestData } from "@/lib/repositories/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return apiSuccess(await getContestData());
  } catch (error) {
    return apiFailure(error);
  }
}
