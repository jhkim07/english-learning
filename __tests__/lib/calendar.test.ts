import { buildCalendarSlots } from "@/lib/calendar";

const today = new Date("2026-06-23");

describe("buildCalendarSlots", () => {
  it("returns 20 slots with all 'future' states when curriculum is null", () => {
    const result = buildCalendarSlots(null, today);
    expect(result.days).toHaveLength(20);
    // Day 1 should be "today" when no curriculum (new user)
    expect(result.days[0].state).toBe("today");
    // Rest are future
    expect(result.days.slice(1).every((d) => d.state === "future")).toBe(true);
    expect(result.streak).toBe(0);
  });

  it("counts streak from completed lessons", () => {
    const yesterday = new Date("2026-06-22");
    const mockCurriculum = {
      id: "c1",
      userId: "u1",
      month: 6,
      year: 2026,
      version: 1,
      theme: null,
      vocabDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      dailyLessons: [
        {
          id: "l1",
          studyDay: 1,
          calendarDate: yesterday,
          sessionCompletedAt: yesterday,
          generationStatus: "READY" as const,
          sessionStartedAt: yesterday,
          userId: "u1",
          curriculumId: "c1",
          frozenAt: yesterday,
          isOpen: false,
          vocabStatus: "READY" as const,
          sentenceStatus: "READY" as const,
          readingStatus: "READY" as const,
          speakingStatus: "READY" as const,
          writingStatus: "READY" as const,
          createdAt: yesterday,
          updatedAt: yesterday,
        },
      ],
    };

    const result = buildCalendarSlots(mockCurriculum, today);
    expect(result.streak).toBe(1);
    expect(result.days[0].state).toBe("completed");
  });

  it("marks today's lesson as 'today' when generation is READY", () => {
    const mockCurriculum = {
      id: "c1",
      userId: "u1",
      month: 6,
      year: 2026,
      version: 1,
      theme: null,
      vocabDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      dailyLessons: [
        {
          id: "l2",
          studyDay: 1,
          calendarDate: today,
          sessionCompletedAt: null,
          generationStatus: "READY" as const,
          sessionStartedAt: null,
          userId: "u1",
          curriculumId: "c1",
          frozenAt: null,
          isOpen: false,
          vocabStatus: "READY" as const,
          sentenceStatus: "READY" as const,
          readingStatus: "READY" as const,
          speakingStatus: "READY" as const,
          writingStatus: "READY" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    const result = buildCalendarSlots(mockCurriculum, today);
    expect(result.days[0].state).toBe("today");
    expect(result.todayStudyDay).toBe(1);
  });
});
