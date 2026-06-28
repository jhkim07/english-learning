import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { buildCalendarSlots } from "@/lib/calendar";
import { LevelBadge } from "@/components/level-badge";
import { format } from "date-fns";

export default async function CalendarPage() {
  const session = await requireAuth();

  // Redirect to diagnosis if no profile
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    redirect("/diagnosis");
  }

  // Find or create the current month's curriculum
  const now = new Date();
  const curriculum = await prisma.monthlyCurriculum.findFirst({
    where: {
      userId: session.user.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
    include: {
      dailyLessons: {
        orderBy: { studyDay: "asc" },
      },
    },
  });

  // Build the 20-day slot data (works even if curriculum is null)
  const slots = buildCalendarSlots(curriculum, now);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pb-10 md:p-8 md:pb-12 max-w-2xl mx-auto">
      <div className="mb-4">
        <Suspense fallback={null}>
          <LevelBadge />
        </Suspense>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">학습 캘린더</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(now, "yyyy년 M월")}
          </p>
        </div>
        {/* Streak indicator */}
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{slots.streak}일</div>
          <div className="text-xs text-muted-foreground">연속 학습</div>
        </div>
      </div>

      <CalendarGrid slots={slots.days} todayStudyDay={slots.todayStudyDay} />
      </div>
    </div>
  );
}
