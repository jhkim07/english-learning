process.env.AI_MOCK_MODE = "true";

jest.mock("@/auth", () => ({
  auth: jest.fn(async () => ({
    user: { id: "user-1", email: "user@example.com" },
  })),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    speakingEvaluation: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock("@/lib/errors/record-error", () => ({
  recordError: jest.fn().mockResolvedValue(undefined),
}));

// Mock EvaluationAgent so we can control overallScore and bypass mock-mode early return
jest.mock("@/lib/ai/evaluation", () => ({
  EvaluationAgent: jest.fn().mockImplementation(() => ({
    evaluateConversationTurn: jest.fn().mockResolvedValue({
      domain: "conversation",
      overallScore: 80,
      grammarErrors: [],
      vocabularyErrors: [],
      fluencyScore: 8,
      naturalness: 7,
      feedback: "Good response!",
    }),
    evaluateWriting: jest.fn(),
  })),
}));

// Mock Anthropic SDK to avoid real API calls in non-mock-mode tests
const mockAnthropicCreate = jest.fn().mockResolvedValue({
  content: [{ type: "text", text: "That's a great point! Tell me more." }],
});
jest.mock("@anthropic-ai/sdk", () => {
  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  }));
  return { __esModule: true, default: MockAnthropic };
});

import {
  evaluateRoleplayLine,
  sendConversationTurn,
} from "@/app/(app)/lesson/[lessonId]/conversation/actions";
import { prisma } from "@/lib/db";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const BASE_TURN_INPUT = {
  lessonId: "lesson-1",
  userMessage: "I am very excited about this opportunity.",
  scenarioContext: "a hiring manager at a tech company",
  turnHistory: [{ role: "assistant" as const, content: "Tell me about yourself." }],
  turnNumber: 1,
};

describe("sendConversationTurn — speakingEvaluation tracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.speakingEvaluation.upsert as jest.Mock).mockResolvedValue({});
    const { recordError } = jest.requireMock("@/lib/errors/record-error");
    recordError.mockResolvedValue(undefined);
    // Restore EvaluationAgent mock after clearAllMocks
    const { EvaluationAgent } = jest.requireMock("@/lib/ai/evaluation");
    EvaluationAgent.mockImplementation(() => ({
      evaluateConversationTurn: jest.fn().mockResolvedValue({
        domain: "conversation",
        overallScore: 80,
        grammarErrors: [],
        vocabularyErrors: [],
        fluencyScore: 8,
        naturalness: 7,
        feedback: "Good response!",
      }),
    }));
    // Disable mock mode so the full code path runs (including upsert)
    process.env.AI_MOCK_MODE = "false";
  });

  afterAll(() => {
    process.env.AI_MOCK_MODE = "true";
  });

  it("calls speakingEvaluation.upsert with score normalized to 0–1", async () => {
    await sendConversationTurn({ ...BASE_TURN_INPUT, lessonId: "lesson-42" });

    expect(mockPrisma.speakingEvaluation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_dailyLessonId: {
            userId: "user-1",
            dailyLessonId: "lesson-42",
          },
        },
        create: expect.objectContaining({
          userId: "user-1",
          dailyLessonId: "lesson-42",
          score: expect.any(Number),
        }),
        update: expect.objectContaining({
          score: expect.any(Number),
        }),
      })
    );

    const callArgs = (mockPrisma.speakingEvaluation.upsert as jest.Mock).mock.calls[0][0];
    expect(callArgs.create.score).toBeGreaterThanOrEqual(0);
    expect(callArgs.create.score).toBeLessThanOrEqual(1);
  });

  it("upserts (not creates) when called twice for the same session", async () => {
    const input = { ...BASE_TURN_INPUT, lessonId: "lesson-99" };
    await sendConversationTurn(input);
    await sendConversationTurn(input);

    // Both calls should use upsert (not separate creates)
    expect(mockPrisma.speakingEvaluation.upsert).toHaveBeenCalledTimes(2);
    const calls = (mockPrisma.speakingEvaluation.upsert as jest.Mock).mock.calls;
    expect(calls[0][0].where.userId_dailyLessonId.dailyLessonId).toBe("lesson-99");
    expect(calls[1][0].where.userId_dailyLessonId.dailyLessonId).toBe("lesson-99");
  });

  it("session continues if speakingEvaluation.upsert rejects (fire-and-forget)", async () => {
    (mockPrisma.speakingEvaluation.upsert as jest.Mock).mockRejectedValueOnce(
      new Error("DB error")
    );

    // Should not throw — fire-and-forget
    await expect(
      sendConversationTurn({ ...BASE_TURN_INPUT, lessonId: "lesson-fail" })
    ).resolves.not.toThrow();
  });

  it("normalizes overallScore to 0–1 range (divides by 100)", async () => {
    // EvaluationAgent returns overallScore: 80, so expected score = 0.8
    await sendConversationTurn(BASE_TURN_INPUT);

    const callArgs = (mockPrisma.speakingEvaluation.upsert as jest.Mock).mock.calls[0][0];
    expect(callArgs.create.score).toBeCloseTo(0.8);
    expect(callArgs.update.score).toBeCloseTo(0.8);
  });
});

describe("sendConversationTurn (mock mode)", () => {
  beforeEach(() => {
    process.env.AI_MOCK_MODE = "true";
  });

  it("returns ai reply and evaluation score in mock mode", async () => {
    const result = await sendConversationTurn(BASE_TURN_INPUT);

    expect(result.aiReply).toBeTruthy();
    expect(typeof result.evaluationScore).toBe("number");
    expect(result.evaluationScore).toBeGreaterThanOrEqual(0);
    expect(result.evaluationScore).toBeLessThanOrEqual(10);
  });
});

describe("evaluateRoleplayLine (mock mode)", () => {
  beforeEach(() => {
    process.env.AI_MOCK_MODE = "true";
  });

  it("scores by intended meaning and returns review guidance", async () => {
    const result = await evaluateRoleplayLine({
      koreanPrompt: "네, 주요 리스크를 포함한 업데이트된 일정을 준비했습니다.",
      learnerAnswer: "Yes, I prepared the updated timeline with risks.",
      suggestedExpression: "Yes, I prepared an updated timeline with the main risks.",
      scenarioTitle: "Deadline Review",
    });

    expect(result.meaningScore).toBeGreaterThanOrEqual(0);
    expect(result.meaningScore).toBeLessThanOrEqual(100);
    expect(result.feedback).toBeTruthy();
    expect(Array.isArray(result.mustFix)).toBe(true);
  });
});
