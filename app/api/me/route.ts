import { requireSessionUser } from "@/lib/auth/session";
import { maskUid } from "@/lib/domain/contest";
import { apiFailure, apiSuccess } from "@/lib/http/api-response";
import { getUserPrediction } from "@/lib/repositories/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const prediction = await getUserPrediction(user.id);
    return apiSuccess({
      id: user.id,
      uid: user.uid,
      maskedUid: maskUid(user.uid),
      hasPrediction: Boolean(prediction),
      submittedAt: prediction?.submittedAt ?? null,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
