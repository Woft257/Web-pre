import { ContestDashboard } from "@/components/contest-dashboard";
import { getSessionUser } from "@/lib/auth/session";
import { maskUid } from "@/lib/domain/contest";
import type { CurrentUser, TimelineEntry } from "@/lib/client/types";
import { getContestData, getTimeline, getUserPrediction } from "@/lib/repositories/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [contest, sessionUser] = await Promise.all([getContestData(), getSessionUser()]);
  let user: CurrentUser | null = null;
  let prediction = null;
  let timeline: TimelineEntry[] = [];

  if (sessionUser) {
    prediction = await getUserPrediction(sessionUser.id);
    if (prediction) timeline = await getTimeline();
    user = {
      id: sessionUser.id,
      uid: sessionUser.uid,
      maskedUid: maskUid(sessionUser.uid),
      hasPrediction: Boolean(prediction),
      submittedAt: prediction?.submittedAt ?? null,
    };
  }

  return (
    <ContestDashboard
      initialContest={contest}
      initialUser={user}
      initialPrediction={{ prediction, timeline }}
    />
  );
}
