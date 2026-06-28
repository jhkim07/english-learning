process.env.AI_MOCK_MODE = "true";

jest.mock("@/auth", () => ({
  auth: jest.fn(async () => ({
    user: { id: "user-1", email: "user@example.com" },
  })),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    writingSubmission: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock("@/lib/errors/record-error", () => ({
  recordError: jest.fn().mockResolvedValue(undefined),
}));

import { submitWriting } from "@/app/(app)/lesson/[lessonId]/writing/actions";
import { prisma } from "@/lib/db";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const BASE_INPUT = {
  lessonId: "lesson-1",
  submission:
    "Remote work has become increasingly common in modern organizations. " +
    "Companies have adopted flexible work policies to attract talent. " +
    "This trend shows no signs of slowing down in the near future.",
  prompt: "Write about the impact of remote work on organizations.",
  targetGrammar: ["present perfect", "passive voice"],
  minimumWords: 180,
  maximumWords: 220,
};

describe("submitWriting — writingSubmission tracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore mocked return values cleared by clearAllMocks
    (mockPrisma.writingSubmission.create as jest.Mock).mockResolvedValue({});
    const { recordError } = jest.requireMock("@/lib/errors/record-error");
    recordError.mockResolvedValue(undefined);
  });

  it("calls writingSubmission.create with correct userId and lessonId", async () => {
    await submitWriting(BASE_INPUT);

    expect(mockPrisma.writingSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          dailyLessonId: "lesson-1",
        }),
      })
    );
  });

  it("normalizes grammarScore to 0.0–1.0 range (divides by 100)", async () => {
    await submitWriting(BASE_INPUT);

    const calls = (mockPrisma.writingSubmission.create as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const { evaluationScore } = calls[0][0].data;
    expect(typeof evaluationScore).toBe("number");
    expect(evaluationScore).toBeGreaterThanOrEqual(0);
    expect(evaluationScore).toBeLessThanOrEqual(1);
  });

  it("uses the correct lessonId from input", async () => {
    await submitWriting({ ...BASE_INPUT, lessonId: "lesson-XYZ" });

    expect(mockPrisma.writingSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dailyLessonId: "lesson-XYZ",
        }),
      })
    );
  });

  it("session continues if writingSubmission.create rejects (fire-and-forget)", async () => {
    (mockPrisma.writingSubmission.create as jest.Mock).mockRejectedValueOnce(
      new Error("DB write failed")
    );

    // Should not throw — fire-and-forget
    await expect(submitWriting(BASE_INPUT)).resolves.not.toThrow();
  });

  it("returns the full WritingEvaluation result even when DB fails", async () => {
    (mockPrisma.writingSubmission.create as jest.Mock).mockRejectedValueOnce(
      new Error("DB write failed")
    );

    const result = await submitWriting(BASE_INPUT);

    // Result should still be a valid evaluation
    expect(result).toHaveProperty("grammarScore");
    expect(typeof result.grammarScore).toBe("number");
    expect(result).toHaveProperty("overallScore");
  });

  it("grammarScore / 100 matches the evaluationScore stored", async () => {
    // EvaluationAgent in mock mode returns grammarScore: 8
    // So evaluationScore should be 8 / 100 = 0.08
    await submitWriting(BASE_INPUT);

    const calls = (mockPrisma.writingSubmission.create as jest.Mock).mock.calls;
    const { evaluationScore } = calls[0][0].data;
    // grammarScore from EvaluationAgent mock is 8 → normalized = 0.08
    expect(evaluationScore).toBeCloseTo(0.08);
  });
});
