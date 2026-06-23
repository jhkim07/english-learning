import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { LessonDashboard } from "@/components/lesson/lesson-dashboard";

export default async function LessonPage({
  params,
}: {
  params: { lessonId: string };
}) {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) redirect("/login");

  const lesson = await prisma.dailyLesson.findFirst({
    where: { id: params.lessonId, curriculum: { userId } },
    select: {
      id: true,
      studyDay: true,
      generationStatus: true,
      vocabStatus: true,
      sentenceStatus: true,
      readingStatus: true,
      speakingStatus: true,
      writingStatus: true,
    },
  });

  if (!lesson) redirect("/calendar");

  if (lesson.generationStatus !== "READY") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Preparing your lesson…</p>
          <p className="text-sm text-muted-foreground">
            Generation status: {lesson.generationStatus}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <LessonDashboard lesson={lesson} />
    </div>
  );
}
