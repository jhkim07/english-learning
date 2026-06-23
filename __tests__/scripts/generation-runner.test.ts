import { runDailyGeneration } from "@/scripts/cron/generation-runner";

// Mock all dependencies
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
    },
    dailyLesson: {
      create: jest.fn(),
    },
    aIArtifact: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/engines", () => ({
  LearningScheduleEngine: jest.fn().mockImplementation(() => ({
    getNextStudyDay: jest.fn(),
  })),
}));

jest.mock("@/lib/queues", () => ({
  enqueueGenerationJob: jest.fn().mockResolvedValue("job-123"),
}));

import { prisma } from "@/lib/db";
import { LearningScheduleEngine } from "@/lib/engines";
import { enqueueGenerationJob } from "@/lib/queues";

describe("runDailyGeneration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("skips users with no curriculum", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: "user-1",
        profile: { currentLevel: 3, studyGoal: "비즈니스 영어" },
        curricula: [], // no curriculum
      },
    ]);

    const mockGetNextStudyDay = jest.fn().mockResolvedValue({
      needsGeneration: true,
      studyDay: 1,
      dailyLessonId: null,
      reason: "No lesson generated for today",
    });

    (LearningScheduleEngine as jest.Mock).mockImplementation(() => ({
      getNextStudyDay: mockGetNextStudyDay,
    }));

    (prisma.aIArtifact.findMany as jest.Mock).mockResolvedValue([]);

    await runDailyGeneration();

    // Should not enqueue job for user with no curriculum
    expect(enqueueGenerationJob).not.toHaveBeenCalled();
  });

  it("enqueues job when generation is needed and curriculum exists", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: "user-2",
        profile: { currentLevel: 3, studyGoal: "비즈니스 영어" },
        curricula: [{ id: "curriculum-1", version: 1 }],
      },
    ]);

    const mockGetNextStudyDay = jest.fn().mockResolvedValue({
      needsGeneration: true,
      studyDay: 1,
      dailyLessonId: null,
      reason: "No lesson generated for today",
    });

    (LearningScheduleEngine as jest.Mock).mockImplementation(() => ({
      getNextStudyDay: mockGetNextStudyDay,
    }));

    (prisma.dailyLesson.create as jest.Mock).mockResolvedValue({ id: "lesson-new-1" });
    (prisma.aIArtifact.findMany as jest.Mock).mockResolvedValue([]);

    await runDailyGeneration();

    expect(prisma.dailyLesson.create).toHaveBeenCalledTimes(1);
    expect(enqueueGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        studyDay: 1,
        dailyLessonId: "lesson-new-1",
      })
    );
  });

  it("skips users where schedule says no generation needed", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: "user-3",
        profile: { currentLevel: 3, studyGoal: "비즈니스 영어" },
        curricula: [{ id: "curriculum-2", version: 1 }],
      },
    ]);

    const mockGetNextStudyDay = jest.fn().mockResolvedValue({
      needsGeneration: false,
      studyDay: 2,
      dailyLessonId: "lesson-exists",
      reason: "Today's lesson is ready",
    });

    (LearningScheduleEngine as jest.Mock).mockImplementation(() => ({
      getNextStudyDay: mockGetNextStudyDay,
    }));

    await runDailyGeneration();

    expect(enqueueGenerationJob).not.toHaveBeenCalled();
  });
});
