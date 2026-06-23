import { DailyLesson, GenerationStatus, MonthlyCurriculum } from "@prisma/client";

export type DayState = "completed" | "in_progress" | "today" | "locked" | "future";

export interface CalendarSlot {
  studyDay: number;       // 1–20
  state: DayState;
  lessonId: string | null;
  generationStatus: GenerationStatus | null;
  calendarDate: Date | null;
}

export interface CalendarData {
  days: CalendarSlot[];
  streak: number;
  todayStudyDay: number | null;
}

type CurriculumWithLessons = MonthlyCurriculum & {
  dailyLessons: DailyLesson[];
};

export function buildCalendarSlots(
  curriculum: CurriculumWithLessons | null,
  today: Date
): CalendarData {
  const days: CalendarSlot[] = [];

  // Find today's study day (1-indexed within the curriculum's 20 days)
  let todayStudyDay: number | null = null;
  let streak = 0;

  for (let i = 1; i <= 20; i++) {
    const lesson = curriculum?.dailyLessons.find((l) => l.studyDay === i);

    let state: DayState;

    if (!lesson) {
      // No lesson yet — future
      state = i === 1 && !curriculum ? "today" : "future";
    } else {
      const lessonDate = lesson.calendarDate
        ? new Date(lesson.calendarDate)
        : null;
      const isToday =
        lessonDate &&
        lessonDate.toDateString() === today.toDateString();

      if (lesson.sessionCompletedAt) {
        state = "completed";
        streak++;
      } else if (isToday) {
        state = lesson.generationStatus === "READY" ? "today" : "in_progress";
        todayStudyDay = i;
      } else if (lessonDate && lessonDate < today) {
        state = "locked";
      } else {
        state = "future";
      }
    }

    days.push({
      studyDay: i,
      state,
      lessonId: lesson?.id ?? null,
      generationStatus: lesson?.generationStatus ?? null,
      calendarDate: lesson?.calendarDate ? new Date(lesson.calendarDate) : null,
    });
  }

  return { days, streak, todayStudyDay };
}
