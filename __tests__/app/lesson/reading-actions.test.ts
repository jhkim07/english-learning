process.env.AI_MOCK_MODE = "true";

jest.mock("@/auth", () => ({
  auth: jest.fn(async () => ({
    user: { id: "user-1", email: "user@example.com" },
  })),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn().mockResolvedValue({ currentLevel: 3, studyGoal: "general" }),
    },
    readingAttempt: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock("@/lib/errors/record-error", () => ({
  recordError: jest.fn().mockResolvedValue(undefined),
}));

// Mock the AdaptiveQuestionGenerator so we control answerOutcome
jest.mock("@/lib/ai/generators/adaptive", () => ({
  AdaptiveQuestionGenerator: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockResolvedValue({
      data: {
        id: "q1_adaptive",
        question: "Follow-up question?",
        options: ["A", "B", "C", "D"],
        correctIndex: 1,
        explanation: "Because of X.",
        answerOutcome: "correct",
        errorType: "none",
        difficulty: 4,
      },
      modelVersion: "mock-v1",
      promptVersion: "1",
      generationSeed: "test-seed",
      generatedAt: new Date(),
      isMock: true,
    }),
  })),
}));

jest.mock("@/lib/ai/validation-agent", () => ({
  ValidationAgent: jest.fn().mockImplementation(() => ({
    validate: jest.fn().mockResolvedValue({ approved: true }),
  })),
}));

import { generateAdaptiveQuestion } from "@/app/(app)/lesson/[lessonId]/reading/actions";
import { prisma } from "@/lib/db";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const BASE_INPUT = {
  lessonId: "lesson-1",
  coreQuestionId: "q-core-1",
  coreQuestion: "What is the main topic?",
  coreCorrectIndex: 1,
  learnerAnswerIndex: 1 as const,
  passage: "Remote work has become common in modern organizations.",
};

describe("generateAdaptiveQuestion — readingAttempt tracking", () => {
  const { recordError } = jest.requireMock("@/lib/errors/record-error");

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore promise return value after clearAllMocks clears it
    recordError.mockResolvedValue(undefined);
    (mockPrisma.readingAttempt.create as jest.Mock).mockResolvedValue({});
  });

  it("calls readingAttempt.create with correct userId and lessonId", async () => {
    await generateAdaptiveQuestion(BASE_INPUT);

    expect(mockPrisma.readingAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          dailyLessonId: "lesson-1",
          questionId: "q-core-1",
        }),
      })
    );
  });

  it("records isCorrect:true when answerOutcome is 'correct'", async () => {
    // Generator mock returns answerOutcome: "correct"
    await generateAdaptiveQuestion(BASE_INPUT);

    expect(mockPrisma.readingAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isCorrect: true,
        }),
      })
    );
  });

  it("records isCorrect:false when answerOutcome is 'incorrect'", async () => {
    const { AdaptiveQuestionGenerator } = jest.requireMock("@/lib/ai/generators/adaptive");
    AdaptiveQuestionGenerator.mockImplementationOnce(() => ({
      generate: jest.fn().mockResolvedValue({
        data: {
          id: "q1_adaptive",
          question: "Remedial question?",
          options: ["A", "B", "C", "D"],
          correctIndex: 0,
          explanation: "The learner answered incorrectly.",
          answerOutcome: "incorrect",
          errorType: "vocabulary_gap",
          difficulty: 2,
        },
        modelVersion: "mock-v1",
        promptVersion: "1",
        generationSeed: "test-seed",
        generatedAt: new Date(),
        isMock: true,
      }),
    }));

    await generateAdaptiveQuestion({ ...BASE_INPUT, learnerAnswerIndex: 2 });

    expect(mockPrisma.readingAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isCorrect: false,
        }),
      })
    );
  });

  it("session continues if readingAttempt.create rejects (fire-and-forget)", async () => {
    (mockPrisma.readingAttempt.create as jest.Mock).mockRejectedValueOnce(
      new Error("DB write failed")
    );

    // Should not throw — fire-and-forget
    await expect(
      generateAdaptiveQuestion(BASE_INPUT)
    ).resolves.not.toThrow();
  });

  it("uses lessonId and coreQuestionId from input in the create call", async () => {
    await generateAdaptiveQuestion({
      ...BASE_INPUT,
      lessonId: "lesson-XYZ",
      coreQuestionId: "q-abc-999",
    });

    expect(mockPrisma.readingAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dailyLessonId: "lesson-XYZ",
          questionId: "q-abc-999",
        }),
      })
    );
  });

  it("returns the adaptive question result regardless of DB tracking outcome", async () => {
    (mockPrisma.readingAttempt.create as jest.Mock).mockRejectedValueOnce(
      new Error("DB write failed")
    );

    const result = await generateAdaptiveQuestion(BASE_INPUT);
    expect(result).toHaveProperty("question");
    expect(result).toHaveProperty("answerOutcome");
  });
});
