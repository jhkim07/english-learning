import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { WeeklyAssessmentClient } from "@/components/assessment/weekly-assessment-client";

export default async function WeeklyAssessmentPage({
  params,
}: {
  params: { lessonId: string };
}) {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) redirect("/login");

  const lesson = await prisma.dailyLesson.findFirst({
    where: { id: params.lessonId, curriculum: { userId } },
    select: { studyDay: true, curriculumId: true },
  });

  if (!lesson) redirect("/calendar");

  const weekNumber = Math.ceil(lesson.studyDay / 5);

  // Aggregate error records for this week
  const errors = await prisma.errorRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="min-h-screen p-4">
      <WeeklyAssessmentClient
        lessonId={params.lessonId}
        weekNumber={weekNumber}
        studyDay={lesson.studyDay}
        totalErrors={errors.length}
      />
    </div>
  );
}
