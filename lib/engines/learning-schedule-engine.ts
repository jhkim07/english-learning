import { prisma } from "@/lib/db";

export interface ScheduleResult {
  needsGeneration: boolean;
  studyDay: number | null;         // null if curriculum not set up
  dailyLessonId: string | null;    // null if no lesson exists yet
  reason: string;
}

export class LearningScheduleEngine {
  async getNextStudyDay(userId: string): Promise<ScheduleResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find current curriculum
    const curriculum = await prisma.monthlyCurriculum.findFirst({
      where: {
        userId,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
      },
    });

    if (!curriculum) {
      return { needsGeneration: false, studyDay: null, dailyLessonId: null, reason: "No curriculum found" };
    }

    // Find today's lesson
    const todayLesson = await prisma.dailyLesson.findFirst({
      where: {
        curriculumId: curriculum.id,
        calendarDate: {
          gte: today,
          lt: new Date(today.getTime() + 86400000),
        },
      },
    });

    if (!todayLesson) {
      // No lesson for today — find the next study day
      const lastLesson = await prisma.dailyLesson.findFirst({
        where: { curriculumId: curriculum.id },
        orderBy: { studyDay: "desc" },
      });

      const nextStudyDay = lastLesson ? lastLesson.studyDay + 1 : 1;

      if (nextStudyDay > 20) {
        return { needsGeneration: false, studyDay: null, dailyLessonId: null, reason: "Curriculum complete (20 days done)" };
      }

      return { needsGeneration: true, studyDay: nextStudyDay, dailyLessonId: null, reason: "No lesson generated for today" };
    }

    if (todayLesson.generationStatus === "READY") {
      return { needsGeneration: false, studyDay: todayLesson.studyDay, dailyLessonId: todayLesson.id, reason: "Today's lesson is ready" };
    }

    if (todayLesson.generationStatus === "FAILED") {
      return { needsGeneration: true, studyDay: todayLesson.studyDay, dailyLessonId: todayLesson.id, reason: "Today's lesson generation failed — retry" };
    }

    return { needsGeneration: false, studyDay: todayLesson.studyDay, dailyLessonId: todayLesson.id, reason: `Generation in progress (${todayLesson.generationStatus})` };
  }
}
