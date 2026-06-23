import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { ReviewQueueEngine } from "@/lib/engines";
import { ErrorReviewClient } from "@/components/error-review/error-review-client";

export default async function ErrorReviewPage({
  params,
}: {
  params: { lessonId: string };
}) {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) redirect("/login");

  // Get today's study day from lesson — include ownership check to prevent IDOR
  const lesson = await prisma.dailyLesson.findFirst({
    where: { id: params.lessonId, userId },
    select: { studyDay: true },
  });

  const studyDay = lesson?.studyDay ?? 1;

  const engine = new ReviewQueueEngine();
  const queue = await engine.getReviewQueue(userId, studyDay);

  return (
    <div className="min-h-screen p-4">
      <ErrorReviewClient
        lessonId={params.lessonId}
        reviewItems={queue.items}
      />
    </div>
  );
}
