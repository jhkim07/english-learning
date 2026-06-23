process.env.AI_MOCK_MODE = "true";

// Mock prisma to avoid real DB
jest.mock("@/lib/db", () => ({
  prisma: {
    aIArtifact: {
      create: jest.fn().mockResolvedValue({ artifactId: "mock-artifact-id" }),
    },
    dailyLesson: {
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

// Register all mocks before importing planner
import { registerVocabularyMocks } from "@/lib/ai/generators/vocabulary/mocks";
import { registerSentenceMocks } from "@/lib/ai/generators/sentence/mocks";
import { registerReadingMocks } from "@/lib/ai/generators/reading/mocks";
import { registerSpeakingMocks } from "@/lib/ai/generators/speaking/mocks";
import { registerWritingMocks } from "@/lib/ai/generators/writing/mocks";

registerVocabularyMocks();
registerSentenceMocks();
registerReadingMocks();
registerSpeakingMocks();
registerWritingMocks();

import { DailyPlanner } from "@/lib/planning";
import type { PlanningContext } from "@/lib/planning/types";

const MOCK_CONTEXT: PlanningContext = {
  userId: "test-user",
  studyDay: 1,
  curriculumVersion: 1,
  userLevel: 3,
  studyGoal: "비즈니스 영어",
  previousWords: [],
  previousCategories: [],
  yesterdayErrors: [],
};

describe("DailyPlanner (mock mode)", () => {
  it("runs all generators and returns PlannerResult", async () => {
    const planner = new DailyPlanner();
    const result = await planner.plan(MOCK_CONTEXT, "lesson-123");

    expect(result.dailyLessonId).toBe("lesson-123");
    expect(result.vocabArtifactIds).toHaveLength(12);
    expect(result.sentenceArtifactIds).toHaveLength(4);
    expect(result.readingArtifactId).toBeTruthy();
    expect(result.speakingArtifactId).toBeTruthy();
    expect(result.writingArtifactId).toBeTruthy();
    expect(result.imageArtifactIds).toHaveLength(12);
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it("calls prisma.dailyLesson.update to mark status READY", async () => {
    const { prisma } = await import("@/lib/db");
    const planner = new DailyPlanner();
    await planner.plan(MOCK_CONTEXT, "lesson-456");

    expect(prisma.dailyLesson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lesson-456" },
        data: expect.objectContaining({ generationStatus: "READY" }),
      })
    );
  });
});
